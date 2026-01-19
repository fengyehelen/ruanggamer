"""
RuangGamer 后端 API
FastAPI 应用入口
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import auth, users, tasks, config, admin, activities


# 创建 FastAPI 应用
app = FastAPI(
    title="RuangGamer API",
    description="RuangGamer 游戏奖励平台后端 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 获取配置
settings = get_settings()

# 配置 CORS 中间件
origins = settings.cors_origins.split(",") if settings.cors_origins != "*" else ["*"]
allow_all = "*" in origins

# 修改 main.py 第 32-37 行
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 建议直接先写死为 ["*"] 确保通畅
    allow_credentials=False, # 当 Origins 为 * 时，这里必须是 False
    allow_methods=["*"],
    allow_headers=["*"],
)


# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(admin.router, prefix="/api")



@app.get("/")
async def root():
    """健康检查端点"""
    return {"status": "ok", "message": "RuangGamer API is running"}


@app.get("/api/health")
async def health_check():
    """API 健康检查"""
    return {"status": "healthy", "version": "1.0.0"}
