"""
创建超级管理员账号脚本

使用方法:
    cd backend
    python create_admin.py
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


def create_super_admin():
    """在数据库中创建超级管理员账号"""
    
    # 获取 Supabase 配置
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("错误: 请确保 .env 文件中配置了 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    # 创建 Supabase 客户端
    db: Client = create_client(supabase_url, supabase_key)
    
    # 默认管理员信息
    default_admin = {
        "username": "admin",
        "password": "admin123",  # 生产环境请使用更强的密码
        "role": "super_admin"
    }
    
    try:
        # 检查管理员是否已存在
        existing = db.table("admins").select("*").eq("username", default_admin["username"]).execute()
        
        if existing.data:
            print(f"管理员账号 '{default_admin['username']}' 已存在！")
            print(f"  - 用户名: {existing.data[0]['username']}")
            print(f"  - 角色: {existing.data[0]['role']}")
            print("\n如需重置密码，请手动在 Supabase 控制台的 admins 表中修改。")
            return True
        
        # 创建新管理员
        result = db.table("admins").insert(default_admin).execute()
        
        if result.data:
            print("=" * 50)
            print("超级管理员账号创建成功！")
            print("=" * 50)
            print(f"  用户名: {default_admin['username']}")
            print(f"  密码: {default_admin['password']}")
            print(f"  角色: {default_admin['role']}")
            print("=" * 50)
            print("\n⚠️  请尽快修改默认密码！")
            return True
        else:
            print("错误: 无法创建管理员账号")
            return False
            
    except Exception as e:
        print(f"错误: {e}")
        return False


if __name__ == "__main__":
    print("正在创建超级管理员账号...\n")
    create_super_admin()
