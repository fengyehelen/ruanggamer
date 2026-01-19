
import json
from database import get_db

def capture_stats():
    db = get_db()
    stats = {}
    
    tables = ["system_config", "users", "platforms", "activities", "user_tasks", "transactions", "messages", "admins"]
    for table in tables:
        try:
            res = db.table(table).select("*").execute()
            stats[table] = {
                "count": len(res.data),
                "samples": res.data[:2] if res.data else []
            }
        except Exception as e:
            stats[table] = {"error": str(e)}
            
    with open("db_stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print("Stats saved to db_stats.json")

if __name__ == "__main__":
    capture_stats()
