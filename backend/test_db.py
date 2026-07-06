import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import certifi
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
        user = await client["qa_intelligence"].users.find_one()
        print("Success:", user)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
