import asyncio
from app.database import database

async def test():
    p = await database.projects.find().to_list(100)
    print("TOTAL PROJECTS:", len(p))
    for x in p:
        print(x.get('id'), x.get('name'), x.get('created_at'))

asyncio.run(test())
