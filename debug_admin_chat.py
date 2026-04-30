import httpx
import asyncio
import json

async def debug_webhook():
    url = "https://vinod3.app.n8n.cloud/webhook/b3b0a7fe-5eef-4449-b480-7ef11c51ae63/chat"
    payload = {
        "action": "sendMessage",
        "sessionId": "test_admin_session",
        "chatInput": "List all high urgency leads with budget over 50000",
        "metadata": {"source": "admin_dashboard"}
    }
    print(f"DEBUG: Testing URL: {url}")
    print(f"DEBUG: Payload: {json.dumps(payload)}")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            print(f"DEBUG: Status Code: {resp.status_code}")
            print(f"DEBUG: Response Headers: {resp.headers}")
            print(f"DEBUG: Response Body: {resp.text}")
    except Exception as e:
        print(f"DEBUG: Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug_webhook())
