"""
配置和活动路由
处理系统配置和活动列表
"""

from fastapi import APIRouter, Depends
from supabase import Client

from database import get_db
from schemas import SystemConfig, Activity, InitialDataResponse

router = APIRouter(tags=["配置"])


def convert_db_activity(a: dict) -> dict:
    """将数据库活动数据转换为 API 响应格式"""
    return {
        "id": a["id"],
        "title": a["title"],
        "titleColor": a.get("title_color"),
        "imageUrl": a["image_url"],
        "content": a["content"],
        "link": a["link"],
        "active": a.get("active", True),
        "showPopup": a.get("show_popup", False),
        "targetCountries": a.get("target_countries") or ["id"]
    }


@router.get("/config", response_model=SystemConfig, response_model_by_alias=True)
async def get_config(db: Client = Depends(get_db)):
    """
    获取系统配置
    """
    result = db.table("system_config").select("*").execute()
    
    config = {
        "initialBalance": {},
        "minWithdrawAmount": {},
        "telegramLinks": {},
        "customerServiceLinks": {},
        "hypeLevel": 5,
        "helpContent": "",
        "aboutContent": "",
        "vipConfig": {}
    }
    
    for item in (result.data or []):
        key = item["key"]
        value = item["value"]
        
        if key == "initial_balance":
            config["initialBalance"] = value
        elif key == "min_withdraw_amount":
            config["minWithdrawAmount"] = value
        elif key == "telegram_links":
            config["telegramLinks"] = value
        elif key == "customer_service_links":
            config["customerServiceLinks"] = value
        elif key == "hype_level":
            config["hypeLevel"] = int(value) if isinstance(value, (int, str)) else 5
        elif key == "help_content":
            config["helpContent"] = value if isinstance(value, str) else str(value).strip('"')
        elif key == "about_content":
            config["aboutContent"] = value if isinstance(value, str) else str(value).strip('"')
        elif key == "vip_config":
            config["vipConfig"] = value
    
    return config


@router.get("/activities", response_model=list[Activity], response_model_by_alias=True)
async def get_activities(db: Client = Depends(get_db)):
    """
    获取所有活动列表
    """
    result = db.table("activities").select("*").eq("active", True).execute()
    
    return [convert_db_activity(a) for a in (result.data or [])]


@router.get("/initial-data", response_model=InitialDataResponse, response_model_by_alias=True)
async def get_initial_data(db: Client = Depends(get_db)):
    """
    获取初始数据（平台和活动）
    用于前端首次加载
    """
    # 导入任务路由的转换函数
    from .tasks import convert_db_platform
    
    # 获取平台
    platforms_result = db.table("platforms").select("*").eq("status", "online").execute()
    platforms = [convert_db_platform(p) for p in (platforms_result.data or [])]
    
    # 获取活动
    activities_result = db.table("activities").select("*").eq("active", True).execute()
    activities = [convert_db_activity(a) for a in (activities_result.data or [])]
    
    return {
        "platforms": platforms,
        "activities": activities
    }


@router.post("/config", response_model=SystemConfig, response_model_by_alias=True)
async def update_config(config: SystemConfig, db: Client = Depends(get_db)):
    """
    更新系统配置
    接收完整配置对象，更新对应的 key-value
    """
    # 准备要更新的数据
    updates = [
        {"key": "initial_balance", "value": config.initial_balance},
        {"key": "min_withdraw_amount", "value": config.min_withdraw_amount},
        {"key": "telegram_links", "value": config.telegram_links},
        {"key": "hype_level", "value": config.hype_level},
        {"key": "help_content", "value": config.help_content},
        {"key": "about_content", "value": config.about_content},
        {"key": "vip_config", "value": list(config.vip_config.values())[0] if config.vip_config else []} # FIXME: 简单处理，假设 vip_config 结构
    ]
    
    # Check vip_config structure again. 
    # Frontend sends: vipConfig: { "id": [ {level, threshold, reward} ] }
    # DB expects JSON.
    # Allow raw dict update for vip_config
    
    updates = [
        {"key": "initial_balance", "value": config.initial_balance},
        {"key": "min_withdraw_amount", "value": config.min_withdraw_amount},
        {"key": "telegram_links", "value": config.telegram_links},
        {"key": "customer_service_links", "value": config.customer_service_links},
        {"key": "hype_level", "value": config.hype_level},
        {"key": "help_content", "value": config.help_content},
        {"key": "about_content", "value": config.about_content},
        {"key": "vip_config", "value": config.vip_config}
    ]

    for item in updates:
        # Upsert
        db.table("system_config").upsert(item, on_conflict="key").execute()
        
    return config
