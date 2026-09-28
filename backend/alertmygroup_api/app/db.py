import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

client = AsyncIOMotorClient(settings.mongo_url, tz_aware=True, tlsCAFile=certifi.where())
db = client[settings.db_name]

channels = db["channels"]
rings = db["rings"]


async def ensure_indexes() -> None:
    await channels.create_index("code", unique=True)
    await rings.create_index("channelCode")
    await rings.create_index("createdAt", expireAfterSeconds=60 * 60 * 24)
