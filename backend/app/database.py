import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Force dnspython (used by pymongo/motor for mongodb+srv:// SRV resolution)
# to use Google's public DNS instead of the system DNS, which may be broken
# on certain networks (e.g. mobile hotspots with internal corporate DNS).
try:
    import dns.resolver
    _resolver = dns.resolver.Resolver(configure=False)
    _resolver.nameservers = ['8.8.8.8', '8.8.4.4']
    dns.resolver.default_resolver = _resolver
except Exception:
    pass  # dnspython not available, motor will use system DNS

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
