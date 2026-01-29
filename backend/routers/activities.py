"""
活动路由
处理活动的增删改查
"""

from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from schemas import Activity

router = APIRouter(prefix="/activities", tags=["活动"])

class ActivityCreate(BaseModel):
    title: str
    titleColor: Optional[str] = None
    imageUrl: Optional[str] = None
    content: Optional[str] = None
    link: Optional[str] = None
    active: bool = True
    showPopup: bool = False
    targetCountries: list[str] = ["id"]

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    titleColor: Optional[str] = None
    imageUrl: Optional[str] = None
    content: Optional[str] = None
    link: Optional[str] = None
    active: Optional[bool] = None
    showPopup: Optional[bool] = None
    targetCountries: Optional[list[str]] = None

def convert_db_activity(a: dict) -> dict:
    """将数据库活动数据转换为 API 响应格式"""
    return {
        "id": a["id"],
        "title": a["title"],
        "titleColor": a.get("title_color"),
        "imageUrl": a.get("image_url"),
        "content": a.get("content"),
        "link": a.get("link"),
        "active": a.get("active", True),
        "isPinned": a.get("is_pinned", False),
        "showPopup": a.get("show_popup", False),
        "targetCountries": a.get("target_countries") or ["id"]
    }

@router.get("", response_model=List[Activity], response_model_by_alias=True)
async def get_activities(db: Client = Depends(get_db)):
    """获取所有活动列表"""
    # Admin 需要看到所有活动，不仅仅是 active 的
    result = db.table("activities").select("*").order("created_at", desc=True).execute()
    return [convert_db_activity(a) for a in (result.data or [])]

@router.post("", response_model=Activity, response_model_by_alias=True)
async def create_activity(activity: ActivityCreate, db: Client = Depends(get_db)):
    """创建新活动"""
    new_activity = {
        "title": activity.title,
        "title_color": activity.titleColor,
        "image_url": activity.imageUrl,
        "content": activity.content,
        "link": activity.link,
        "active": activity.active,
        "show_popup": activity.showPopup,
        "target_countries": activity.targetCountries
    }
    
    result = db.table("activities").insert(new_activity).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create activity")
    
    return convert_db_activity(result.data[0])

@router.patch("/{activity_id}", response_model=Activity, response_model_by_alias=True)
async def update_activity(activity_id: str, activity: ActivityUpdate, db: Client = Depends(get_db)):
    """更新活动"""
    updates = {}
    if activity.title is not None: updates["title"] = activity.title
    if activity.titleColor is not None: updates["title_color"] = activity.titleColor
    if activity.imageUrl is not None: updates["image_url"] = activity.imageUrl
    if activity.content is not None: updates["content"] = activity.content
    if activity.link is not None: updates["link"] = activity.link
    if activity.active is not None: updates["active"] = activity.active
    if activity.showPopup is not None: updates["show_popup"] = activity.showPopup
    if activity.targetCountries is not None: updates["target_countries"] = activity.targetCountries
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = db.table("activities").update(updates).eq("id", activity_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Activity not found")
        
    return convert_db_activity(result.data[0])

@router.delete("/{activity_id}")
async def delete_activity(activity_id: str, db: Client = Depends(get_db)):
    """删除活动"""
    result = db.table("activities").delete().eq("id", activity_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Activity not found or already deleted")
        
    return {"message": "Activity deleted successfully"}
