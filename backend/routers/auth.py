"""
用户认证路由
处理登录和注册
"""

from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from datetime import datetime
import random
import string

from database import get_db
from schemas import (
    UserCreate, UserLogin, UserResponse, AuthResponse, 
    Transaction, TransactionType, TransactionStatus,
    Message
)
from utils import verify_password, get_password_hash  # Integrated security utils

router = APIRouter(prefix="/auth", tags=["认证"])


def generate_referral_code(length: int = 6) -> str:
    """生成随机推荐码"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def convert_db_user_to_response(user_data: dict, db: Client) -> UserResponse:
    """
    将数据库用户数据转换为 API 响应格式
    需要额外查询关联表数据
    """
    user_id = user_data["id"]
    
    # 获取用户的银行账户
    bank_accounts_result = db.table("bank_accounts").select("*").eq("user_id", user_id).execute()
    bank_accounts = [
        {
            "id": ba["id"],
            "bankName": ba["bank_name"],
            "accountName": ba["account_name"],
            "accountNumber": ba["account_number"],
            "type": ba["type"]
        }
        for ba in (bank_accounts_result.data or [])
    ]
    
    # 获取用户的任务
    tasks_result = db.table("user_tasks").select("*").eq("user_id", user_id).execute()
    my_tasks = [
        {
            "id": t["id"],
            "platformId": t["platform_id"],
            "platformName": t["platform_name"],
            "logoUrl": t["logo_url"],
            "rewardAmount": float(t["reward_amount"]),
            "status": t["status"],
            "startTime": t["start_time"],
            "submissionTime": t.get("submission_time"),
            "proofImageUrl": t.get("proof_image_url"),
            "rejectReason": t.get("reject_reason")
        }
        for t in (tasks_result.data or [])
    ]
    
    # 获取用户的交易记录
    transactions_result = db.table("transactions").select("*").eq("user_id", user_id).order("date", desc=True).execute()
    transactions = [
        {
            "id": tx["id"],
            "type": tx["type"],
            "amount": float(tx["amount"]),
            "date": tx["date"],
            "description": tx["description"],
            "status": tx["status"]
        }
        for tx in (transactions_result.data or [])
    ]
    
    # 获取用户的消息
    messages_result = db.table("messages").select("*").eq("user_id", user_id).order("date", desc=True).execute()
    messages = [
        {
            "id": m["id"],
            "title": m["title"],
            "content": m["content"],
            "date": m["date"],
            "read": m["read"],
            "rewardAmount": m.get("reward_amount")
        }
        for m in (messages_result.data or [])
    ]
    
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        phone=user_data.get("phone"),
        balance=float(user_data["balance"]),
        currency=user_data["currency"],
        totalEarnings=float(user_data["total_earnings"]),
        vipLevel=user_data["vip_level"],
        referralCode=user_data["referral_code"],
        referrerId=user_data.get("referrer_id"),
        invitedCount=user_data["invited_count"],
        myTasks=my_tasks,
        likedTaskIds=user_data.get("liked_task_ids") or [],
        registrationDate=user_data["registration_date"],
        bankAccounts=bank_accounts,
        role=user_data["role"],
        messages=messages,
        transactions=transactions,
        theme=user_data.get("theme", "gold"),
        isBanned=user_data.get("is_banned", False)
    )


@router.post("/login", response_model=AuthResponse, response_model_by_alias=True)
async def login(credentials: UserLogin, db: Client = Depends(get_db)):
    """
    用户登录
    验证邮箱和密码
    """
    # 查找用户
    result = db.table("users").select("*").eq("email", credentials.email).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = result.data[0]
    
    # 验证密码（支持哈希与明文回退）
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # 检查是否被封禁
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Account is banned")
    
    user_response = convert_db_user_to_response(user, db)
    
    return AuthResponse(user=user_response)


@router.post("/register", response_model=AuthResponse, response_model_by_alias=True)
async def register(user_data: UserCreate, db: Client = Depends(get_db)):
    """
    用户注册
    创建新用户并处理邀请码
    """
    # 检查邮箱是否已存在
    existing = db.table("users").select("id").eq("email", user_data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 获取系统配置（初始余额）
    config_result = db.table("system_config").select("value").eq("key", "initial_balance").execute()
    initial_balance = 0
    if config_result.data:
        balance_config = config_result.data[0]["value"]
        initial_balance = balance_config.get("id", 0)
    
    # 生成唯一推荐码
    referral_code = generate_referral_code()
    while True:
        check = db.table("users").select("id").eq("referral_code", referral_code).execute()
        if not check.data:
            break
        referral_code = generate_referral_code()
    
    # 处理邀请码
    referrer_id = None
    if user_data.invite_code:
        referrer_result = db.table("users").select("id").eq("referral_code", user_data.invite_code).execute()
        if referrer_result.data:
            referrer_id = referrer_result.data[0]["id"]
            # 更新推荐人的邀请计数
            db.table("users").update({"invited_count": db.table("users").select("invited_count").eq("id", referrer_id).execute().data[0]["invited_count"] + 1}).eq("id", referrer_id).execute()
    
    # 哈希密码
    hashed_password = get_password_hash(user_data.password)

    # 创建用户
    new_user_data = {
        "email": user_data.email,
        "password": hashed_password, # 存储哈希密码
        "balance": initial_balance,
        "currency": "Rp",
        "total_earnings": 0,
        "vip_level": 1,
        "referral_code": referral_code,
        "referrer_id": referrer_id,
        "invited_count": 0,
        "liked_task_ids": [],
        "role": "user",
        "theme": "gold",
        "is_banned": False,
        "registration_date": datetime.now().isoformat()
    }
    
    result = db.table("users").insert(new_user_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    new_user = result.data[0]
    user_id = new_user["id"]
    
    # 获取欢迎消息配置
    welcome_msg = "Welcome to RuangGamer. Bind your phone number in profile to secure your account."
    welcome_config = db.table("system_config").select("value").eq("key", "welcome_message").execute()
    if welcome_config.data and welcome_config.data[0]["value"]:
        welcome_msg = welcome_config.data[0]["value"]

    # 创建欢迎消息
    db.table("messages").insert({
        "user_id": user_id,
        "title": "Welcome!",
        "content": welcome_msg,
        "read": False,
        "date": datetime.now().isoformat()
    }).execute()
    
    # 如果有初始余额，创建交易记录
    if initial_balance > 0:
        db.table("transactions").insert({
            "user_id": user_id,
            "type": "system_bonus",
            "amount": initial_balance,
            "description": "Welcome Bonus",
            "status": "success",
            "date": datetime.now().isoformat()
        }).execute()
    
    user_response = convert_db_user_to_response(new_user, db)
    
    return AuthResponse(user=user_response)
