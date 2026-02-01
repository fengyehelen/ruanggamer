
import os
from supabase import create_client

url = "https://ginnajwliugyqepjfbob.supabase.co"
key = "sb_publishable_ibdt5oYzrSDrcAnmkf0brA_BC3UnBhP" # Anon key is fine to use in transient script

db = create_client(url, key)

print("--- Platforms Logo Sizes ---")
res = db.table("platforms").select("id, logo_url").execute()
for p in res.data:
    url_val = p.get("logo_url", "")
    if url_val.startswith("data:image"):
        print(f"ID: {p['id']}, Size: {len(url_val)} (Base64)")
    else:
        print(f"ID: {p['id']}, Size: {len(url_val)}")

print("\n--- Activities Image Sizes ---")
res = db.table("activities").select("id, image_url").execute()
for a in res.data:
    url_val = a.get("image_url", "")
    if url_val.startswith("data:image"):
        print(f"ID: {a['id']}, Size: {len(url_val)} (Base64)")
    else:
        print(f"ID: {a['id']}, Size: {len(url_val)}")

print("\n--- Config Value Sizes ---")
res = db.table("system_config").select("key, value").execute()
for c in res.data:
    val = str(c.get("value", ""))
    print(f"Key: {c['key']}, Size: {len(val)}")
