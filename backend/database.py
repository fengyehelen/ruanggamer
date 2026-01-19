"""
Supabase 数据库连接管理
"""

from supabase import create_client, Client
from functools import lru_cache
from config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    获取 Supabase 客户端实例
    使用 lru_cache 确保单例模式
    """
    settings = get_settings()
    
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ValueError(
            "Supabase 配置缺失。请在 .env 文件中设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY"
        )
    
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )


def get_db() -> Client:
    """
    依赖注入函数，用于 FastAPI 路由
    """
    return get_supabase_client()
