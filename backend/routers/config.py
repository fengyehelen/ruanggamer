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
        "vipConfig": {},
        "misiExampleImage": {}
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
        elif key == "misi_example_image":
            config["misiExampleImage"] = value
    
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
    # 将模型转换为字典以确保所有字段（包括嵌套的 Pydantic 模型）都是可序列化的
    # 使用 by_alias=True 保持与前端期望的字段名（驼峰式）一致
    config_dict = config.model_dump(by_alias=True)
    
    # 获取各个配置项的值
    updates = [
        {"key": "initial_balance", "value": config_dict.get("initialBalance") or {}},
        {"key": "min_withdraw_amount", "value": config_dict.get("minWithdrawAmount") or {}},
        {"key": "telegram_links", "value": config_dict.get("telegramLinks") or {}},
        {"key": "customer_service_links", "value": config_dict.get("customerServiceLinks") or {}},
        {"key": "hype_level", "value": config_dict.get("hypeLevel") or 5},
        {"key": "help_content", "value": config_dict.get("helpContent") or ""},
        {"key": "about_content", "value": config_dict.get("aboutContent") or ""},
        {"key": "vip_config", "value": config_dict.get("vipConfig") or {}},
        {"key": "misi_example_image", "value": config_dict.get("misiExampleImage") or {}}
    ]

    for item in updates:
        # 使用 upsert 更新或插入配置项
        db.table("system_config").upsert(item, on_conflict="key").execute()
        
    return config

