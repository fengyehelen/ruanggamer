"""
管理员认证和管理路由
处理后台管理员登录、列表等操作
"""

from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from typing import Optional

from database import get_db
from utils import verify_password, get_password_hash # Integrated security utils
from schemas import UserResponse


router = APIRouter(prefix="/admin", tags=["管理员"])


class AdminLoginRequest(BaseModel):
    """管理员登录请求"""
    username: str
    password: str


class AdminChangePasswordRequest(BaseModel):
    """管理员修改密码请求"""
    adminId: str
    oldPassword: str
    newPassword: str


class AdminResponse(BaseModel):
    """管理员响应模型"""
    id: str
    username: str
    role: str
    # NOTE: 不返回密码给前端


class AdminLoginResponse(BaseModel):
    """管理员登录响应"""
    admin: AdminResponse


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(credentials: AdminLoginRequest, db: Client = Depends(get_db)):
    """
    管理员登录
    验证用户名和密码
    """
    # 查找管理员
    result = db.table("admins").select("*").eq("username", credentials.username).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    admin = result.data[0]
    
    # 验证密码（支持哈希与明文回退）
    if not verify_password(credentials.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return AdminLoginResponse(
        admin=AdminResponse(
            id=admin["id"],
            username=admin["username"],
            role=admin["role"]
        )
    )


@router.get("/list")
async def get_admins(db: Client = Depends(get_db)):
    """
    获取所有管理员列表
    NOTE: 仅返回必要信息，不返回密码
    """
    result = db.table("admins").select("id, username, role").execute()
    
    admins = [
        {
            "id": admin["id"],
            "username": admin["username"],
            "role": admin["role"]
        }
        for admin in (result.data or [])
    ]
    
    return {"admins": admins}


class AdminCreateRequest(BaseModel):
    """创建管理员请求"""
    username: str
    password: str
    role: str = "editor"


@router.post("/create", response_model=AdminResponse)
async def create_admin(admin_data: AdminCreateRequest, db: Client = Depends(get_db)):
    """
    创建新管理员
    只有 super_admin 可以调用此接口（前端控制）
    """
    # 检查用户名是否已存在
    existing = db.table("admins").select("id").eq("username", admin_data.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # 验证角色
    if admin_data.role not in ["super_admin", "editor"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # 哈希密码
    hashed_password = get_password_hash(admin_data.password)

    # 创建管理员
    result = db.table("admins").insert({
        "username": admin_data.username,
        "password": hashed_password, # 存储哈希密码
        "role": admin_data.role
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create admin")
    
    new_admin = result.data[0]
    
    return AdminResponse(
        id=new_admin["id"],
        username=new_admin["username"],
        role=new_admin["role"]
    )

class DashboardStats(BaseModel):
    """仪表盘统计数据"""
    totalUsers: int
    totalBalance: float
    pendingWithdrawals: int
    pendingTasks: int
    todayRegistrations: int


@router.get("/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Client = Depends(get_db)):
    """
    获取仪表盘统计数据 (服务端聚合)
    使用 SQL COUNT/SUM 直接计算，返回 < 1KB
    """
    from datetime import date, timedelta
    today = date.today().isoformat()
    
    # Total users count
    users_res = db.table("users").select("id", count="exact").execute()
    total_users = users_res.count if hasattr(users_res, 'count') and users_res.count else 0
    
    # Sum of all user balances
    balance_res = db.table("users").select("balance").execute()
    total_balance = sum(u.get("balance", 0) for u in (balance_res.data or []))
    
    # Pending withdrawals count
    pending_wd_res = db.table("transactions").select("id", count="exact").eq("type", "withdraw").eq("status", "pending").execute()
    pending_withdrawals = pending_wd_res.count if hasattr(pending_wd_res, 'count') and pending_wd_res.count else 0
    
    # Pending tasks count
    pending_tasks_res = db.table("user_tasks").select("id", count="exact").eq("status", "reviewing").execute()
    pending_tasks = pending_tasks_res.count if hasattr(pending_tasks_res, 'count') and pending_tasks_res.count else 0
    
    # Today registrations
    today_reg_res = db.table("users").select("id", count="exact").gte("created_at", today).execute()
    today_registrations = today_reg_res.count if hasattr(today_reg_res, 'count') and today_reg_res.count else 0
    
    return DashboardStats(
        totalUsers=total_users,
        totalBalance=total_balance,
        pendingWithdrawals=pending_withdrawals,
        pendingTasks=pending_tasks,
        todayRegistrations=today_registrations
    )


class PaginatedUsersResponse(BaseModel):
    """分页用户列表响应"""
    users: list
    total: int
    page: int
    perPage: int


@router.get("/users", response_model=PaginatedUsersResponse)
async def get_all_users(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    db: Client = Depends(get_db)
):
    """
    获取用户列表（分页，精简数据）
    不返回嵌套的 transactions/tasks/messages
    """
    start = (page - 1) * per_page
    end = start + per_page - 1
    
    # Select essential user fields + bank accounts + total_earnings
    query = db.table("users").select(
        "id, email, phone, balance, referral_code, is_banned, vip_level, total_earnings, created_at, bank_accounts(*)",
        count="exact"
    )
    
    if search:
        # Search by email, phone, or referral code
        query = query.or_(f"email.ilike.%{search}%,phone.ilike.%{search}%,referral_code.ilike.%{search}%")
    
    res = query.order("created_at", desc=True).range(start, end).execute()
    total = res.count if hasattr(res, 'count') and res.count else 0
    
    # Transform to frontend field names (camelCase)
    transformed_users = []
    for u in (res.data or []):
        transformed_users.append({
            "id": u.get("id"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "balance": u.get("balance", 0),
            "referralCode": u.get("referral_code"),
            "isBanned": u.get("is_banned", False),
            "vipLevel": u.get("vip_level", 0),
            "totalEarnings": u.get("total_earnings", 0),
            "registrationDate": u.get("created_at"),
            "currency": "IDR",  # Default currency for Indonesia
            "bankAccounts": [
                {
                    "bankName": ba.get("bank_name"),
                    "accountNumber": ba.get("account_number"),
                    "accountName": ba.get("account_name")
                } for ba in (u.get("bank_accounts") or [])
            ]
        })
    
    return PaginatedUsersResponse(
        users=transformed_users,
        total=total,
        page=page,
        perPage=per_page
    )


@router.get("/pending-tasks")
async def get_pending_tasks(db: Client = Depends(get_db)):
    """
    获取待审核任务列表 (status='reviewing')
    返回包含用户信息的任务列表
    """
    # Get all reviewing tasks with user info
    tasks_res = db.table("user_tasks").select(
        "*, users(id, email, phone, referral_code)"
    ).eq("status", "reviewing").order("submission_time", desc=True).execute()
    
    # Transform to include user info directly
    tasks = []
    for t in (tasks_res.data or []):
        user = t.pop("users", {}) or {}
        tasks.append({
            **t,
            "userId": user.get("id"),
            "userEmail": user.get("email"),
            "userPhone": user.get("phone"),
            "userReferralCode": user.get("referral_code")
        })
    
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/audit-history")
async def get_audit_history(
    page: int = 1, 
    per_page: int = 20,
    db: Client = Depends(get_db)
):
    """
    获取已审核任务列表 (status='completed' or 'rejected')
    支持翻页
    """
    # Calculate offset
    start = (page - 1) * per_page
    end = start + per_page - 1

    # Get total count
    count_res = db.table("user_tasks").select("id", count="exact").in_("status", ["completed", "rejected"]).execute()
    total = count_res.count or 0

    # Get tasks with user info
    tasks_res = db.table("user_tasks").select(
        "*, users(id, email, phone, referral_code)"
    ).in_("status", ["completed", "rejected"]).order("updated_at", desc=True).range(start, end).execute()
    
    # Transform to include user info directly
    tasks = []
    for t in (tasks_res.data or []):
        user = t.pop("users", {}) or {}
        tasks.append({
            **t,
            "userId": user.get("id"),
            "userEmail": user.get("email"),
            "userPhone": user.get("phone"),
            "userReferralCode": user.get("referral_code")
        })
    
    return {"tasks": tasks, "total": total}

@router.get("/pending-withdrawals")
async def get_pending_withdrawals(
    page: int = 1,
    per_page: int = 20,
    db: Client = Depends(get_db)
):
    """
    获取所有提现记录 (按时间倒序)
    支持分页
    """
    start = (page - 1) * per_page
    end = start + per_page - 1

    # Get total count
    count_res = db.table("transactions").select("id", count="exact").eq("type", "withdraw").execute()
    total = count_res.count or 0

    # Get withdrawal transactions with user and bank info
    tx_res = db.table("transactions").select(
        "*, users(id, email, phone, referral_code, bank_accounts(*))"
    ).eq("type", "withdraw").order("created_at", desc=True).range(start, end).execute()
    
    # Transform to include user info directly
    withdrawals = []
    for tx in (tx_res.data or []):
        user = tx.pop("users", {}) or {}
        bank_accounts = user.pop("bank_accounts", []) or []
        withdrawals.append({
            **tx,
            "userId": user.get("id"),
            "userEmail": user.get("email"),
            "userPhone": user.get("phone"),
            "userReferralCode": user.get("referral_code"),
            "bankAccounts": bank_accounts
        })
    
    return {"withdrawals": withdrawals, "total": total}

class AuditTaskRequest(BaseModel):
    userId: str
    taskId: str
    status: str # completed, rejected

@router.post("/audit-task")
async def audit_task(req: AuditTaskRequest, db: Client = Depends(get_db)):
    """审核任务 (批准/拒绝)"""
    # 更新 user_tasks 表
    # 注意：我们保留现有的 submission_time，它是用户提交凭证的时间
    result = db.table("user_tasks").update({
        "status": req.status,
    }).eq("id", req.taskId).eq("user_id", req.userId).execute()
    
    if req.status == 'completed':
        # 如果批准，发放奖励
        # 1. 获取任务信息
        task_res = db.table("user_tasks").select("reward_amount").eq("id", req.taskId).execute()
        if task_res.data:
            amount = task_res.data[0]["reward_amount"]
            
            # 2. 更新用户余额
            # 获取当前余额
            user_res = db.table("users").select("id, email, balance, total_earnings, referrer_id").eq("id", req.userId).execute()
            if user_res.data:
                user = user_res.data[0]
                new_balance = float(user["balance"]) + float(amount)
                new_earnings = float(user["total_earnings"]) + float(amount)
                
                db.table("users").update({
                    "balance": new_balance, 
                    "total_earnings": new_earnings
                }).eq("id", req.userId).execute()
                
                # 3. 创建交易记录
                db.table("transactions").insert({
                    "user_id": req.userId,
                    "type": "task_reward",
                    "amount": amount,
                    "description": "Task Reward",
                    "status": "success"
                }).execute()

                # --- NEW: 3-Level Referral Commission ---
                referrer_id = user.get("referrer_id")
                # Level ratios: 1 (20%), 2 (10%), 3 (5%)
                commission_rates = [0.20, 0.10, 0.05]
                current_downline_email = user.get("email") or req.userId

                for i, rate in enumerate(commission_rates):
                    if not referrer_id:
                        break
                    
                    # Fetch current referrer
                    ref_res = db.table("users").select("id, balance, total_earnings, referrer_id").eq("id", referrer_id).execute()
                    if not ref_res.data:
                        break
                    
                    referrer = ref_res.data[0]
                    commission = float(amount) * rate
                    
                    if commission > 0:
                        # Update balance
                        new_ref_balance = float(referrer["balance"]) + commission
                        new_ref_earnings = float(referrer["total_earnings"]) + commission
                        db.table("users").update({
                            "balance": new_ref_balance,
                            "total_earnings": new_ref_earnings
                        }).eq("id", referrer["id"]).execute()
                        
                        # Log transaction
                        level = i + 1
                        db.table("transactions").insert({
                            "user_id": referrer["id"],
                            "type": "referral_bonus",
                            "amount": commission,
                            "description": f"Komisi Level {level} dari {current_downline_email}",
                            "status": "success"
                        }).execute()
                    
                    # Move to next parent
                    referrer_id = referrer.get("referrer_id")
    
    return {"message": "Audit processed"}


class SendMessageRequest(BaseModel):
    userId: str # 'all' or specific UUID
    title: str
    content: str
    amount: float = 0

@router.post("/send-message")
async def send_message(req: SendMessageRequest, db: Client = Depends(get_db)):
    """发送系统消息"""
    recipient_ids = []
    
    if req.userId == 'all':
        users = db.table("users").select("id").execute()
        recipient_ids = [u['id'] for u in users.data or []]
    else:
        recipient_ids = [req.userId]
        
    for uid in recipient_ids:
        # 发送消息
        db.table("messages").insert({
            "user_id": uid,
            "title": req.title,
            "content": req.content,
            "reward_amount": req.amount
        }).execute()
        
        # 如果有金额，增加余额
        if req.amount > 0:
             user_res = db.table("users").select("balance").eq("id", uid).execute()
             if user_res.data:
                 new_balance = float(user_res.data[0]["balance"]) + req.amount
                 db.table("users").update({"balance": new_balance}).eq("id", uid).execute()
                 
                 db.table("transactions").insert({
                    "user_id": uid,
                    "type": "admin_gift",
                    "amount": req.amount,
                    "description": req.title,
                    "status": "success"
                }).execute()
                 
    return {"message": f"Message sent to {len(recipient_ids)} users"}


@router.patch("/users/{user_id}/ban")
async def ban_user(user_id: str, is_banned: bool = True, db: Client = Depends(get_db)):
    """封禁/解封用户"""
    db.table("users").update({"is_banned": is_banned}).eq("id", user_id).execute()
    return {"message": "User status updated"}


class ResetPasswordRequest(BaseModel):
    newPassword: str

@router.patch("/users/{user_id}/password")
async def reset_user_password(user_id: str, req: ResetPasswordRequest, db: Client = Depends(get_db)):
    """重置用户密码"""
    hashed = get_password_hash(req.newPassword)
    db.table("users").update({"password": hashed}).eq("id", user_id).execute()
    return {"message": "Password updated"}


@router.patch("/password")
async def change_admin_password(req: AdminChangePasswordRequest, db: Client = Depends(get_db)):
    """管理员修改自己的密码"""
    # 查找管理员
    result = db.table("admins").select("*").eq("id", req.adminId).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    admin = result.data[0]
    
    # 验证旧密码
    if not verify_password(req.oldPassword, admin["password"]):
        raise HTTPException(status_code=400, detail="Invalid old password")
    
    # 哈希新密码
    hashed_password = get_password_hash(req.newPassword)
    
    # 执行更新
    db.table("admins").update({"password": hashed_password}).eq("id", req.adminId).execute()
    
    return {"message": "Password updated successfully"}


@router.get("/users/{user_id}/transactions")
async def get_user_transactions(
    user_id: str, 
    page: int = 1, 
    per_page: int = 20, 
    db: Client = Depends(get_db)
):
    """获取指定用户的交易流水"""
    start = (page - 1) * per_page
    end = start + per_page - 1
    
    # 查询交易记录，按 created_at 倒序
    result = db.table("transactions") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .range(start, end) \
        .execute()
        
    # 获取总数以支持分页
    count_res = db.table("transactions") \
        .select("id", count="exact") \
        .eq("user_id", user_id) \
        .execute()
    
    total = count_res.count if hasattr(count_res, 'count') else len(result.data)
    if total is None: # Fallback
        total = len(result.data)

    return {
        "transactions": result.data,
        "total": total,
        "page": page,
        "per_page": per_page
    }


class AuditWithdrawalRequest(BaseModel):
    transactionId: str
    status: str # success, failed (rejected)

from schemas import UserResponse, PaginatedMessagesResponse


@router.get("/messages", response_model=PaginatedMessagesResponse)
async def get_paginated_messages(
    page: int = 1, 
    pageSize: int = 20, 
    search: Optional[str] = None, 
    db: Client = Depends(get_db)
):
    """分页获取所有用户的系统消息动态"""
    # 1. 计算范围
    start = (page - 1) * pageSize
    end = start + pageSize - 1

    # 2. 构建查询
    query = db.table("messages").select("*, users!inner(phone)", count="exact").order("date", desc=True)

    # 3. 搜索逻辑 (如果存在 search 参数)
    if search:
        # 搜索标题、内容、或者关联用户的手机号、ID
        # 注意：Supabase 的 or 语法较为特殊，特别是跨表查询
        # 这里先实现基础的标题和内容搜索，以及用户 ID 搜索
        search_filter = f"title.ilike.%{search}%,content.ilike.%{search}%,user_id.eq.{search}"
        
        # 如果搜索内容看起来像手机号，也尝试搜索手机号
        # 由于 messages 表和 users 表有外键关联，我们可以使用 users!inner(phone) 后的过滤
        query = query.or_(search_filter)

    # 4. 执行分页查询
    result = query.range(start, end).execute()
    
    # 5. 格式化数据
    messages = []
    for m in (result.data or []):
        messages.append({
            "id": m["id"],
            "title": m["title"],
            "content": m["content"],
            "rewardAmount": m.get("reward_amount"),
            "date": m["date"],
            "read": m.get("read", False),
            "userId": m["user_id"],
            "userPhone": m.get("users", {}).get("phone") # 从 inner join 中提取 phone
        })

    return {
        "messages": messages,
        "total": result.count or 0
    }


@router.post("/audit-withdrawal")
async def audit_withdrawal(req: AuditWithdrawalRequest, db: Client = Depends(get_db)):
    """审核提现 (批准/拒绝)"""
    # 1. 获取交易
    tx_res = db.table("transactions").select("*").eq("id", req.transactionId).execute()
    if not tx_res.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    tx = tx_res.data[0]
    
    # 2. 更新交易状态
    db.table("transactions").update({
        "status": req.status
    }).eq("id", req.transactionId).execute()
    
    # 3. 如果拒绝 (failed)，需要退还余额
    if req.status == 'failed':
        user_res = db.table("users").select("balance").eq("id", tx["user_id"]).execute()
        if user_res.data:
            current_balance = float(user_res.data[0]["balance"])
            refund_amount = abs(float(tx["amount"])) # 提现amount通常是负数或正数，取决于存储方式。假设存储为负数或逻辑处理。
            
            # Check logic: usually withdraw reduces balance immediately. 
            # If rejected, add it back.
            # In schemas.py or logic, withdraw deduces balance? 
            # Let's assume positive refund.
            
            new_balance = current_balance + refund_amount
            db.table("users").update({"balance": new_balance}).eq("id", tx["user_id"]).execute()
            
    return {"message": "Withdrawal audited"}



