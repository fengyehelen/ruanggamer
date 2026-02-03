"""
配置和活动路由
处理系统配置和活动列表
"""

from fastapi import APIRouter, Depends
from supabase import Client

from database import get_db
from schemas import SystemConfig, Activity, InitialDataResponse
from .activities import convert_db_activity

router = APIRouter(tags=["配置"])




@router.get("/config", response_model=SystemConfig, response_model_by_alias=True)
async def get_config(db: Client = Depends(get_db)):
    """
    获取系统配置 (精简版，不含大数据块)
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
        "misiExampleImage": {},
        "welcomeMessage": "",
        "promoVideoUrl": ""
    }
    
    for item in (result.data or []):
        key = item["key"]
        value = item["value"]
        
        if key == "initial_balance":
            config["initialBalance"] = value
        elif key in ["min_withdraw_amount", "min_withdrawal"]:
            if key == "min_withdrawal" or "minWithdrawAmount" not in config or not config["minWithdrawAmount"]:
                config["minWithdrawAmount"] = value
        elif key == "telegram_links":
            config["telegramLinks"] = value
        elif key == "customer_service_links":
            config["customerServiceLinks"] = value
        elif key == "hype_level":
            config["hypeLevel"] = int(value) if isinstance(value, (int, str)) else 5
        elif key == "vip_config":
            config["vipConfig"] = value
        elif key == "misi_example_image":
            config["misiExampleImage"] = value
        elif key == "welcome_message":
            config["welcomeMessage"] = value if isinstance(value, str) else str(value).strip('"')
        elif key in ["promo_video_url", "promoVideoUrl"]:
            # Robust extraction: ensure it's a string and not JSON-encoded string
            raw_val = value if isinstance(value, str) else str(value)
            config["promoVideoUrl"] = raw_val.strip('"').strip()
        elif key == "help_content":
            config["helpContent"] = value
        elif key == "about_content":
            config["aboutContent"] = value
    
    return config


@router.get("/config/{key}", response_model=dict)
async def get_config_item(key: str, db: Client = Depends(get_db)):
    """获取单个配置项 (用于拉取大数据块如 help_content)"""
    # 映射前端 key 为数据库 key
    key_map = {
        "helpContent": "help_content",
        "aboutContent": "about_content",
        "misiExampleImage": "misi_example_image"
    }
    db_key = key_map.get(key, key)
    result = db.table("system_config").select("value").eq("key", db_key).execute()
    if not result.data:
        return {"key": key, "value": ""}
    return {"key": key, "value": result.data[0]["value"]}


@router.get("/activities", response_model=list[Activity], response_model_by_alias=True)
async def get_activities(db: Client = Depends(get_db)):
    """获取所有活动列表 (完整版)"""
    result = db.table("activities").select("*").eq("active", True).execute()
    return [convert_db_activity(a) for a in (result.data or [])]


@router.get("/activities/{activity_id}", response_model=Activity, response_model_by_alias=True)
async def get_activity_detail(activity_id: str, db: Client = Depends(get_db)):
    """获取活动详情"""
    result = db.table("activities").select("*").eq("id", activity_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    return convert_db_activity(result.data[0])


@router.get("/initial-data", response_model=InitialDataResponse, response_model_by_alias=True)
async def get_initial_data(db: Client = Depends(get_db)):
    """
    获取初始数据 (精简版)
    """
    from .tasks import convert_db_platform
    
    # 获取平台 (精简版)
    platforms_result = db.table("platforms").select("id, name, name_color, logo_url, description, desc_color, download_link, first_deposit_amount, reward_amount, is_hot, is_pinned, remaining_qty, total_qty, likes, status, type").eq("status", "online").order("is_pinned", desc=True).order("created_at", desc=True).execute()
    
    # 模拟 convert_db_platform 但不包含 steps 和 rules
    platforms = []
    for p in (platforms_result.data or []):
        platforms.append({
            "id": p["id"],
            "name": p["name"],
            "nameColor": p.get("name_color"),
            "logoUrl": p["logo_url"],
            "description": p["description"],
            "descColor": p.get("desc_color"),
            "downloadLink": p["download_link"],
            "firstDepositAmount": float(p["first_deposit_amount"]),
            "rewardAmount": float(p["reward_amount"]),
            "isHot": p.get("is_hot", False),
            "isPinned": p.get("is_pinned", False),
            "remainingQty": p.get("remaining_qty", 0),
            "totalQty": p.get("total_qty", 0),
            "likes": p.get("likes", 0),
            "status": p.get("status", "online"),
            "type": p.get("type", "deposit")
        })
    
    # 获取活动 (包含 content 字段以便前端展示详情)
    activities_result = db.table("activities").select("*").eq("active", True).execute()
    activities = [convert_db_activity(a, slim=False) for a in (activities_result.data or [])]
    
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
        {"key": "misi_example_image", "value": config_dict.get("misiExampleImage") or {}},
        {"key": "welcome_message", "value": config_dict.get("welcomeMessage") or ""},
        {"key": "promo_video_url", "value": config_dict.get("promoVideoUrl") or ""}
    ]

    for item in updates:
        # 使用 upsert 更新或插入配置项
        db.table("system_config").upsert(item, on_conflict="key").execute()
        
    return config

