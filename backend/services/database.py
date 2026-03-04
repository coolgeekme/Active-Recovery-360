from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import os

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        raise ValueError("MONGO_URL environment variable is not set")
    
    db_name = os.environ.get("DB_NAME", "ar360")
    
    print(f"[DB] Connecting to MongoDB...")
    client = AsyncIOMotorClient(mongo_url, server_api=ServerApi('1'))
    db = client[db_name]
    
    # Test connection
    await client.admin.command('ping')
    print(f"[DB] Connected to MongoDB database: {db_name}")

async def close_db():
    global client
    if client:
        client.close()
        print("[DB] MongoDB connection closed")

def get_db():
    return db

def get_collection(name: str):
    return db[name]
