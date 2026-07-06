import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = "qa_intelligence"

client = AsyncIOMotorClient(
    MONGODB_URL,
    tlsCAFile=certifi.where(),
    maxIdleTimeMS=45000
)
database = client[DB_NAME]

# Dependency
async def get_db():
    yield database
