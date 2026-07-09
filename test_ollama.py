import httpx
import asyncio
import json

async def main():
    body = {
        "model": "qwen2.5-coder:7b",
        "messages": [{"role": "user", "content": "Extract features from this text: 'The system shall allow users to log in and reset their password.'\nRespond ONLY with valid JSON in this shape: {\"features\": [{\"name\": \"...\"}]}."}],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.0, "seed": 42}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:11434/api/chat", json=body, timeout=240)
        print("Status:", resp.status_code)
        print("Response:", resp.text)

asyncio.run(main())
