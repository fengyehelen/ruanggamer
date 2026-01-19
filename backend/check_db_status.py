
import sys
import os
from database import get_db

def check_status():
    print("Checking database connection...")
    try:
        db = get_db()
        print("Connection successful.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    tables = ["system_config", "users", "platforms", "activities", "user_tasks", "transactions", "messages", "admins"]
    
    for table in tables:
        try:
            res = db.table(table).select("count", count="exact").execute()
            count = res.count
            print(f"Table '{table}' exists. Rows: {count}")
        except Exception as e:
            # If error contains "does not exist", then table is missing
            if "does not exist" in str(e) or "404" in str(e):
                 print(f"Table '{table}' MISSING.")
            else:
                 print(f"Table '{table}' error: {e}")

if __name__ == "__main__":
    check_status()
