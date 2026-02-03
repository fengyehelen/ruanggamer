import os
import time
import hashlib
import logging
import httpx
from typing import Optional, List, Dict, Any

# Configure logging
logger = logging.getLogger(__name__)

# Load FB Config from environment
FB_ACCESS_TOKEN = os.getenv("FB_ACCESS_TOKEN")
FB_PIXEL_ID = os.getenv("FB_PIXEL_ID")
FB_TEST_EVENT_CODE = os.getenv("FB_TEST_EVENT_CODE")

def hash_data(data: Optional[str]) -> Optional[str]:
    """Meta requires hashing for PII data (email, phone, etc.) using SHA256."""
    if not data:
        return None
    return hashlib.sha256(data.strip().lower().encode('utf-8')).hexdigest()

async def send_fb_event(
    event_name: str,
    user_email: Optional[str] = None,
    user_id: Optional[str] = None,
    value: Optional[float] = None,
    currency: str = "IDR",
    event_id: Optional[str] = None,
    content_ids: Optional[List[str]] = None,
    content_name: Optional[str] = None
):
    """
    Sends an event to Meta Conversions API (CAPI).
    Documentation: https://developers.facebook.com/docs/marketing-api/conversions-api
    """
    if not FB_ACCESS_TOKEN or not FB_PIXEL_ID:
        logger.warning("FB_ACCESS_TOKEN or FB_PIXEL_ID missing. CAPI event skipped.")
        return

    url = f"https://graph.facebook.com/v18.0/{FB_PIXEL_ID}/events"

    # User Data (PII should be hashed)
    user_data = {
        "external_id": hash_data(user_id),
        "em": [hash_data(user_email)] if user_email else [],
        "client_user_agent": "RuangGamer-Backend/1.0", # Optional but recommended
    }

    # Custom Data
    custom_data = {
        "value": value,
        "currency": currency,
        "content_ids": content_ids or [],
        "content_name": content_name,
        "content_type": "product"
    }

    # Data payload
    data_payload = {
        "event_name": event_name,
        "event_time": int(time.time()),
        "action_source": "system_generated",
        "user_data": user_data,
        "custom_data": custom_data,
    }

    # event_id for deduplication (Must match frontend event_id)
    if event_id:
        data_payload["event_id"] = str(event_id)

    # Test code for Meta Events Manager testing
    if FB_TEST_EVENT_CODE:
        payload = {
            "data": [data_payload],
            "test_event_code": FB_TEST_EVENT_CODE,
            "access_token": FB_ACCESS_TOKEN
        }
    else:
        payload = {
            "data": [data_payload],
            "access_token": FB_ACCESS_TOKEN
        }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            result = response.json()
            if response.status_code == 200:
                logger.info(f"Successfully sent CAPI event: {event_name}, event_id: {event_id}")
            else:
                logger.error(f"Failed to send CAPI event: {result}")
            return result
    except Exception as e:
        logger.error(f"Error sending CAPI event: {str(e)}")
        return None
