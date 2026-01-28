"""
用户管理路由
处理用户信息、绑定手机/银行、提现等
"""

from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from datetime import datetime

from database import get_db
from schemas import (
    UserResponse, BankAccountCreate, BindPhoneRequest, WithdrawRequest
)
from routers.auth import convert_db_user_to_response

router = APIRouter(prefix="/users", tags=["用户"])


@router.get("/{user_id}", response_model=UserResponse, response_model_by_alias=True)
async def get_user(user_id: str, db: Client = Depends(get_db)):
    """
    获取用户信息
    """
    result = db.table("users").select("*").eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return convert_db_user_to_response(result.data[0], db)


@router.post("/{user_id}/bind-phone", response_model=UserResponse, response_model_by_alias=True)
async def bind_phone(user_id: str, request: BindPhoneRequest, db: Client = Depends(get_db)):
    """
    绑定手机号码
    """
    # 检查用户是否存在
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 检查手机号是否已被使用
    phone_check = db.table("users").select("id").eq("phone", request.phone).neq("id", user_id).execute()
    if phone_check.data:
        raise HTTPException(status_code=400, detail="Phone number already used by another account")
    
    # 更新手机号
    db.table("users").update({"phone": request.phone}).eq("id", user_id).execute()
    
    # 重新获取用户数据
    updated_user = db.table("users").select("*").eq("id", user_id).execute().data[0]
    
    return convert_db_user_to_response(updated_user, db)


@router.post("/{user_id}/bind-bank", response_model=UserResponse, response_model_by_alias=True)
async def bind_bank(user_id: str, account: BankAccountCreate, db: Client = Depends(get_db)):
    """
    绑定银行/电子钱包账户
    """
    # 检查用户是否存在
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 创建银行账户
    new_account = {
        "user_id": user_id,
        "bank_name": account.bank_name,
        "account_name": account.account_name,
        "account_number": account.account_number,
        "type": account.type.value
    }
    
    db.table("bank_accounts").insert(new_account).execute()
    
    # 返回更新后的用户数据
    user = db.table("users").select("*").eq("id", user_id).execute().data[0]
    
    return convert_db_user_to_response(user, db)


@router.patch("/{user_id}/messages/read")
async def mark_messages_as_read(user_id: str, db: Client = Depends(get_db)):
    """将用户的所有未读消息标记为已读"""
    db.table("messages").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
    return {"message": "All messages marked as read"}


@router.post("/{user_id}/withdraw", response_model=UserResponse, response_model_by_alias=True)
async def withdraw(user_id: str, request: WithdrawRequest, db: Client = Depends(get_db)):
    """
    提现申请
    """
    # 获取用户
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_result.data[0]
    
    # 获取最低提现金额配置
    # 优先检查用户提到的 min_withdrawal，兼容旧的 min_withdraw_amount
    config_result = db.table("system_config").select("key, value").in_("key", ["min_withdrawal", "min_withdraw_amount"]).execute()
    
    min_withdraw = 50000  # 默认值
    if config_result.data:
        # 按照优先级查找
        configs = {item["key"]: item["value"] for item in config_result.data}
        val_obj = configs.get("min_withdrawal") or configs.get("min_withdraw_amount")
        if val_obj:
            # 兼容 {"id": 100000} 这种奇怪的格式，或者直接是数字
            if isinstance(val_obj, dict):
                min_withdraw = val_obj.get("id") or val_obj.get("value") or 50000
            else:
                try:
                    min_withdraw = float(val_obj)
                except:
                    min_withdraw = 50000
    
    # 验证最低提现金额
    if request.amount < min_withdraw:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is {min_withdraw}")
    
    if float(user["balance"]) < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if not user.get("phone"):
        raise HTTPException(status_code=400, detail="Please bind phone number first")
    
    # 验证银行账户
    account_result = db.table("bank_accounts").select("*").eq("id", request.account_id).eq("user_id", user_id).execute()
    if not account_result.data:
        raise HTTPException(status_code=400, detail="Invalid bank account selected")
    
    bank_account = account_result.data[0]
    
    # 扣除余额
    new_balance = float(user["balance"]) - request.amount
    db.table("users").update({"balance": new_balance}).eq("id", user_id).execute()
    
    # 创建提现交易记录
    db.table("transactions").insert({
        "user_id": user_id,
        "type": "withdraw",
        "amount": -request.amount,
        "description": f"Withdraw to {bank_account['bank_name']} ({bank_account['account_number']})",
        "status": "pending",
        "date": datetime.now().isoformat()
    }).execute()
    
    # 返回更新后的用户数据
    updated_user = db.table("users").select("*").eq("id", user_id).execute().data[0]
    
    return convert_db_user_to_response(updated_user, db)
