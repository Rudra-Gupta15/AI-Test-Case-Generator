import asyncio
import json
from app import ollama_client

async def main():
    brd = ""
    fsd = "The system shall allow users to log in and reset their password."
    srs = ""
    frd = ""
    figma = []
    images = []
    
    print("Running understand...")
    res = await ollama_client.understand(brd, fsd, srs, frd, figma, images, "", deep=False, ai_mode="strict")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
