import sqlite3
import json
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB = "projects.db"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = "qa_intelligence"

async def migrate():
    if not os.path.exists(SQLITE_DB):
        print(f"No SQLite database found at {SQLITE_DB}. Skipping migration.")
        return

    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Migrate Users
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
    print(f"Found {len(users)} users to migrate.")
    for u in users:
        user_dict = dict(u)
        user_dict['is_active'] = bool(user_dict['is_active'])
        await db.users.update_one({"id": user_dict["id"]}, {"$set": user_dict}, upsert=True)

    # Migrate Projects
    cur.execute("SELECT * FROM projects")
    projects = cur.fetchall()
    print(f"Found {len(projects)} projects to migrate.")
    for p in projects:
        p_dict = dict(p)
        if p_dict.get('understanding'):
            p_dict['understanding'] = json.loads(p_dict['understanding'])
        if p_dict.get('test_report'):
            p_dict['test_report'] = json.loads(p_dict['test_report'])
        await db.projects.update_one({"id": p_dict["id"]}, {"$set": p_dict}, upsert=True)

    # Migrate Tree Nodes
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tree_nodes'")
    has_tree_nodes = cur.fetchone()
    if has_tree_nodes:
        cur.execute("SELECT * FROM tree_nodes")
        nodes = cur.fetchall()
        print(f"Found {len(nodes)} tree nodes to migrate.")
        for n in nodes:
            n_dict = dict(n)
            if n_dict.get('data'):
                n_dict['data'] = json.loads(n_dict['data'])
            await db.tree_nodes.update_one({"id": n_dict["id"]}, {"$set": n_dict}, upsert=True)

    conn.close()
    client.close()
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
