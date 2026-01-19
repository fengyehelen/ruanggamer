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

@router.get("/users", response_model=dict[str, list[UserResponse]], response_model_by_alias=True)
async def get_all_users(db: Client = Depends(get_db)):

    """获取所有用户列表（Admin Only）"""
    # 获取用户及其关联数据, 包括银行账户
    res = db.table("users").select("*, transactions(*), user_tasks(*), bank_accounts(*)").execute()

    
    if not res.data:
        return {"users": []}
        
    if not res.data:
        return {"users": []}
        
    return {"users": res.data}


class AuditTaskRequest(BaseModel):
    userId: str
    taskId: str
    status: str # completed, rejected

@router.post("/audit-task")
async def audit_task(req: AuditTaskRequest, db: Client = Depends(get_db)):
    """审核任务 (批准/拒绝)"""
    # 更新 user_tasks 表
    result = db.table("user_tasks").update({
        "status": req.status,
        "submission_time": datetime.now().isoformat() if req.status == 'completed' else None
    }).eq("id", req.taskId).eq("user_id", req.userId).execute()
    
    if req.status == 'completed':
        # 如果批准，发放奖励
        # 1. 获取任务信息
        task_res = db.table("user_tasks").select("reward_amount").eq("id", req.taskId).execute()
        if task_res.data:
            amount = task_res.data[0]["reward_amount"]
            
            # 2. 更新用户余额
            # 获取当前余额
            user_res = db.table("users").select("balance, total_earnings").eq("id", req.userId).execute()
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


class AuditWithdrawalRequest(BaseModel):
    transactionId: str
    status: str # success, failed (rejected)

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



