"""
RuangGamer 后端配置
从环境变量加载 Supabase 配置
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    
    # Supabase 配置
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    
    # JWT 配置
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 天
    
    # CORS 配置
    cors_origins: str = "*"
    
    # Facebook CAPI 配置
    fb_access_token: str = ""
    fb_pixel_id: str = ""
    fb_test_event_code: str = "" # 仅用于测试，正式环境留空
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """获取缓存的配置实例"""
    return Settings()
