import asyncio
import json

from bson import ObjectId

from .db import channels, rings
from .push import send_push

REPEAT_INTERVAL_SECONDS = 30
MAX_REPEATS = 6

_background_tasks: set[asyncio.Task] = set()


async def push_to_members(channel: dict, ring: dict) -> None:
    acked = {a["memberId"] for a in ring.get("acks", [])}
    targets = [
        m
        for m in channel["members"]
        if m["id"] != ring["senderId"] and not m.get("muted") and m.get("sub") and m["id"] not in acked
    ]
    if not targets:
        return

    payload = json.dumps(
        {
            "ringId": str(ring["_id"]),
            "channelName": channel["name"],
            "senderName": ring["senderName"],
            "hasAudio": bool(ring.get("audio")),
        }
    )
    await asyncio.gather(*(send_push(m["sub"], payload, m["id"]) for m in targets))


async def _repeat_loop(ring_id: ObjectId, channel_code: str) -> None:
    for _ in range(MAX_REPEATS - 1):
        await asyncio.sleep(REPEAT_INTERVAL_SECONDS)

        ring = await rings.find_one({"_id": ring_id})
        channel = await channels.find_one({"code": channel_code})
        if ring is None or channel is None:
            return

        acked = {a["memberId"] for a in ring.get("acks", [])}
        still_unacked = any(m["id"] != ring["senderId"] and m["id"] not in acked for m in channel["members"])
        if not still_unacked:
            return

        await rings.update_one({"_id": ring_id}, {"$inc": {"repeats": 1}})
        await push_to_members(channel, ring)


def schedule_repeats(ring_id: ObjectId, channel_code: str) -> None:
    task = asyncio.create_task(_repeat_loop(ring_id, channel_code))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
