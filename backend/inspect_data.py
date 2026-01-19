
import json
from database import get_db

def inspect_and_seed():
    db = get_db()
    
    # 1. Check system_config
    print("\n--- Inspecting system_config ---")
    config_res = db.table("system_config").select("*").execute()
    keys = [item['key'] for item in config_res.data]
    print(f"Existing keys: {keys}")
    
    # 2. Check platforms
    print("\n--- Inspecting platforms ---")
    platforms_res = db.table("platforms").select("id, name").execute()
    print(f"Platforms: {len(platforms_res.data)}")
    for p in platforms_res.data:
        print(f" - {p['name']} ({p['id']})")
        
    # 3. Check activities
    print("\n--- Inspecting activities ---")
    activities_res = db.table("activities").select("id, title").execute()
    print(f"Activities: {len(activities_res.data)}")
    for a in activities_res.data:
        print(f" - {a['title']} ({a['id']})")

if __name__ == "__main__":
    inspect_and_seed()
