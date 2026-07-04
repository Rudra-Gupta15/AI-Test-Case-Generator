import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = "qa_intelligence"

client = AsyncIOMotorClient(MONGODB_URL)
database = client[DB_NAME]

# Dependency
async def get_db():
    yield database
