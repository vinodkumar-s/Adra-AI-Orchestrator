import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_tts():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "Xb7hH8MSUJpSbSDYk0k2")
    
    print(f"Testing TTS with ID: {voice_id}")
    print(f"API Key: {api_key[:10]}...{api_key[-5:] if api_key else ''}")
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    data = {
        "text": "Hello, this is a test.",
        "model_id": "eleven_turbo_v2"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data, timeout=10.0)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_tts())
