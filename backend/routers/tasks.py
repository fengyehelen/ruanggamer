"""
任务路由
处理平台任务的获取、开始、点赞等
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from supabase import Client
from datetime import datetime
import uuid
import json

from database import get_db
from schemas import Platform, UserResponse, UserTask, TaskStep
from routers.auth import convert_db_user_to_response

router = APIRouter(prefix="/tasks", tags=["任务"])


class TaskCreate(BaseModel):
    name: str
    nameColor: Optional[str] = None
    logoUrl: str
    description: str
    descColor: Optional[str] = None
    downloadLink: str
    firstDepositAmount: float = 0
    rewardAmount: float
    totalQty: int = 0
    steps: list[TaskStep] = []
    rules: str = ""
    status: str = "online"
    type: str = "deposit"
    targetCountries: list[str] = ["id"]

class SubmitProofRequest(BaseModel):
    user_id: str = Field(..., alias="userId")
    task_id: str = Field(..., alias="taskId")
    proof_image_url: str = Field(..., alias="proofImageUrl")

    model_config = ConfigDict(populate_by_name=True)

class TaskUpdate(BaseModel):

    name: Optional[str] = None
    nameColor: Optional[str] = None
    logoUrl: Optional[str] = None
    description: Optional[str] = None
    descColor: Optional[str] = None
    downloadLink: Optional[str] = None
    firstDepositAmount: Optional[float] = None
    rewardAmount: Optional[float] = None
    totalQty: Optional[int] = None
    remainingQty: Optional[int] = None
    isPinned: Optional[bool] = None
    isHot: Optional[bool] = None
    steps: Optional[list[TaskStep]] = None
    rules: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    targetCountries: Optional[list[str]] = None



def convert_db_platform(p: dict) -> dict:
    """将数据库平台数据转换为 API 响应格式"""
    # 解析 steps，支持新旧两种格式
    db_steps = p.get("steps") or []
    parsed_steps = []
    for step in db_steps:
        if isinstance(step, dict):
            # 已经是字典格式（新格式）
            parsed_steps.append(step)
        elif isinstance(step, str):
            # 可能是 JSON 字符串，尝试解析
            try:
                parsed = json.loads(step)
                if isinstance(parsed, dict):
                    parsed_steps.append(parsed)
                else:
                    parsed_steps.append({"text": step})
            except (json.JSONDecodeError, TypeError):
                # 解析失败，作为纯文本处理
                parsed_steps.append({"text": step})
        else:
            parsed_steps.append({"text": str(step)})
    
    return {
        "id": p["id"],
        "name": p["name"],
        "nameColor": p.get("name_color"),
        "logoUrl": p["logo_url"],
        "description": p["description"],
        "descColor": p.get("desc_color"),
        "downloadLink": p["download_link"],
        "firstDepositAmount": float(p["first_deposit_amount"]),
        "rewardAmount": float(p["reward_amount"]),
        "launchDate": str(p["launch_date"]) if p.get("launch_date") else "",
        "isHot": p.get("is_hot", False),
        "isPinned": p.get("is_pinned", False),
        "remainingQty": p.get("remaining_qty", 0),
        "totalQty": p.get("total_qty", 0),
        "likes": p.get("likes", 0),
        "steps": parsed_steps,
        "rules": p.get("rules", ""),
        "status": p.get("status", "online"),
        "type": p.get("type", "deposit"),
        "targetCountries": p.get("target_countries") or ["id"]
    }


@router.get("", response_model=list[Platform], response_model_by_alias=True)
async def get_tasks(db: Client = Depends(get_db)):
    """
    获取所有平台/任务列表
    """
    result = db.table("platforms").select("*").eq("status", "online").execute()
    
    return [convert_db_platform(p) for p in (result.data or [])]


@router.post("/{platform_id}/start", response_model=UserTask, response_model_by_alias=True)
async def start_task(platform_id: str, user_id: str, db: Client = Depends(get_db)):
    """
    开始任务
    用户领取指定平台的任务
    """
    # 获取用户
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 获取平台
    platform_result = db.table("platforms").select("*").eq("id", platform_id).execute()
    if not platform_result.data:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    platform = platform_result.data[0]
    
    # 检查剩余数量
    if platform.get("remaining_qty", 0) <= 0:
        raise HTTPException(status_code=400, detail="Task sold out")
    
    # 检查是否已领取
    existing_task = db.table("user_tasks").select("id").eq("user_id", user_id).eq("platform_id", platform_id).execute()
    if existing_task.data:
        raise HTTPException(status_code=400, detail="Task already taken")
    
    # 创建用户任务
    new_task = {
        "user_id": user_id,
        "platform_id": platform_id,
        "platform_name": platform["name"],
        "logo_url": platform["logo_url"],
        "reward_amount": platform["reward_amount"],
        "status": "ongoing",
        "start_time": datetime.now().isoformat()
    }
    
    task_result = db.table("user_tasks").insert(new_task).execute()
    
    # 减少剩余数量
    new_qty = platform.get("remaining_qty", 0) - 1
    db.table("platforms").update({"remaining_qty": new_qty}).eq("id", platform_id).execute()
    
    if task_result.data:
        t = task_result.data[0]
        return {
            "id": t["id"],
            "platformId": t["platform_id"],
            "platformName": t["platform_name"],
            "logoUrl": t["logo_url"],
            "rewardAmount": float(t["reward_amount"]),
            "status": t["status"],
            "startTime": t["start_time"]
        }
    
    raise HTTPException(status_code=500, detail="Failed to create task")


@router.post("/{platform_id}/like", response_model=UserResponse, response_model_by_alias=True)
async def like_task(platform_id: str, user_id: str, db: Client = Depends(get_db)):
    """
    点赞任务
    每个用户每个任务只能点赞一次
    """
    # 获取用户
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_result.data[0]
    
    # 获取平台
    platform_result = db.table("platforms").select("*").eq("id", platform_id).execute()
    if not platform_result.data:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    platform = platform_result.data[0]
    
    # 检查是否已点赞
    liked_ids = user.get("liked_task_ids") or []
    if platform_id in liked_ids:
        # 已点赞，直接返回用户数据
        return convert_db_user_to_response(user, db)
    
    # 添加点赞
    liked_ids.append(platform_id)
    db.table("users").update({"liked_task_ids": liked_ids}).eq("id", user_id).execute()
    
    # 增加平台点赞数
    new_likes = (platform.get("likes") or 0) + 1
    db.table("platforms").update({"likes": new_likes}).eq("id", platform_id).execute()
    
    # 返回更新后的用户数据
    updated_user = db.table("users").select("*").eq("id", user_id).execute().data[0]
    
    return convert_db_user_to_response(updated_user, db)


@router.post("", response_model=Platform, response_model_by_alias=True)
async def create_task(task: TaskCreate, db: Client = Depends(get_db)):
    """创建新任务"""
    new_task = {
        "name": task.name,
        "name_color": task.nameColor,
        "logo_url": task.logoUrl,
        "description": task.description,
        "desc_color": task.descColor,
        "download_link": task.downloadLink,
        "first_deposit_amount": task.firstDepositAmount,
        "reward_amount": task.rewardAmount,
        "total_qty": task.totalQty,
        "remaining_qty": task.totalQty, # 初始剩余等于总量
        "steps": [s.model_dump(by_alias=True) for s in task.steps],
        "rules": task.rules,
        "status": task.status,
        "type": task.type,
        "target_countries": task.targetCountries,
        "launch_date": datetime.now().strftime("%Y-%m-%d"),
        "likes": 0
    }
    
    result = db.table("platforms").insert(new_task).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create task")
        
    return convert_db_platform(result.data[0])


@router.patch("/{task_id}", response_model=Platform, response_model_by_alias=True)
async def update_task(task_id: str, task: TaskUpdate, db: Client = Depends(get_db)):
    """更新任务"""
    updates = {}
    if task.name is not None: updates["name"] = task.name
    if task.nameColor is not None: updates["name_color"] = task.nameColor
    if task.logoUrl is not None: updates["logo_url"] = task.logoUrl
    if task.description is not None: updates["description"] = task.description
    if task.descColor is not None: updates["desc_color"] = task.descColor
    if task.downloadLink is not None: updates["download_link"] = task.downloadLink
    if task.firstDepositAmount is not None: updates["first_deposit_amount"] = task.firstDepositAmount
    if task.rewardAmount is not None: updates["reward_amount"] = task.rewardAmount
    if task.totalQty is not None: updates["total_qty"] = task.totalQty
    if task.remainingQty is not None: updates["remaining_qty"] = task.remainingQty
    if task.isPinned is not None: updates["is_pinned"] = task.isPinned
    if task.isHot is not None: updates["is_hot"] = task.isHot
    if task.steps is not None: updates["steps"] = [s.model_dump(by_alias=True) for s in task.steps]
    if task.rules is not None: updates["rules"] = task.rules
    if task.status is not None: updates["status"] = task.status
    if task.type is not None: updates["type"] = task.type
    if task.targetCountries is not None: updates["target_countries"] = task.targetCountries
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = db.table("platforms").update(updates).eq("id", task_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return convert_db_platform(result.data[0])


@router.delete("/{task_id}")
async def delete_task(task_id: str, db: Client = Depends(get_db)):
    """删除任务"""
    result = db.table("platforms").delete().eq("id", task_id).execute()
    
    if not result.data:
        # 可能是 Supabase 的 delete 返回空 data，或者未找到
        # 先检查是否存在
        exists = db.table("platforms").select("id").eq("id", task_id).execute()
        if exists.data:
             raise HTTPException(status_code=500, detail="Failed to delete task")
        else:
             raise HTTPException(status_code=404, detail="Task already deleted or not found")
        
    return {"message": "Task deleted successfully"}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Client = Depends(get_db)):
    """
    上传文件到 Supabase Storage
    """
    try:
        # 生成唯一文件名
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        
        # 读取文件内容
        file_content = await file.read()
        
        # 上传到 Supabase Storage 'proofs' bucket
        # 注意：需要确保 'proofs' bucket 存在且 allow public inserts
        # 如果 bucket 不存在，这里会失败 (可以尝试创建但一般是手动)
        
        # 使用 storage.from_().upload()
        res = db.storage.from_("proofs").upload(
            file_name,
            file_content,
            {"content-type": file.content_type}
        )
        
       
        # 获取公开 URL
        public_url = db.storage.from_("proofs").get_public_url(file_name)
        
        return {"url": public_url}
        
    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/submit-proof")
async def submit_proof(req: SubmitProofRequest, db: Client = Depends(get_db)):
    """
    提交任务凭证，更新状态为待审核
    支持初次提交（ongoing）和被拒绝后重新提交（rejected）
    """
    try:
        # 首先查询当前任务状态
        task_query = db.table("user_tasks").select("*").eq("user_id", req.user_id).eq("id", req.task_id).execute()
        
        if not task_query.data:
            # 尝试通过 platform_id 查找 (兼容逻辑)
            task_query = db.table("user_tasks").select("*").eq("user_id", req.user_id).eq("platform_id", req.task_id).execute()
        
        if not task_query.data:
            raise HTTPException(status_code=404, detail="Task record not found")
        
        current_task = task_query.data[0]
        current_status = current_task.get("status")
        
        # 只允许 ongoing 或 rejected 状态的任务提交证明
        if current_status not in ["ongoing", "rejected"]:
            raise HTTPException(status_code=400, detail=f"Cannot submit proof for task with status: {current_status}")
        
        # 更新 user_tasks 表，重新提交时清除拒绝原因
        update_data = {
            "status": "reviewing",
            "proof_image_url": req.proof_image_url,
            "submission_time": datetime.now().isoformat(),
            "reject_reason": None  # 清除之前的拒绝原因
        }
        
        result = db.table("user_tasks").update(update_data).eq("id", current_task["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update task")
            
        return {"message": "Proof submitted successfully", "data": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Submit proof failed: {e}")
        raise HTTPException(status_code=500, detail=f"Submit failed: {str(e)}")


