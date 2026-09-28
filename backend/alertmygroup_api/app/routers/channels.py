from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from ..db import channels, rings
from ..ringing import push_to_members, schedule_repeats
from ..schemas import CreateChannelBody, JoinChannelBody
from ..security import (
    generate_channel_code,
    generate_member_id,
    get_channel_member,
    hash_password,
    verify_password,
)
from ..serializers import channel_out, ring_out

router = APIRouter(prefix="/api/channels", tags=["channels"])

MAX_AUDIO_BYTES = 300 * 1024
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/mp4", "audio/aac", "audio/ogg"}
RING_COOLDOWN_SECONDS = 60


MIN_PASSWORD_LENGTH = 4


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_channel(body: CreateChannelBody):
    name = body.name.strip()
    display_name = body.displayName.strip()
    if not name or not display_name or not body.password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "name, displayName and password are required")
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"password must be at least {MIN_PASSWORD_LENGTH} characters")

    password_hash, password_salt = hash_password(body.password)
    member_id = generate_member_id()
    code = generate_channel_code()
    for _ in range(5):
        try:
            await channels.insert_one(
                {
                    "code": code,
                    "name": name,
                    "passwordHash": password_hash,
                    "passwordSalt": password_salt,
                    "createdAt": datetime.now(timezone.utc),
                    "members": [{"id": member_id, "name": display_name, "muted": False, "sub": None}],
                }
            )
            break
        except DuplicateKeyError:
            code = generate_channel_code()
    else:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not allocate a channel code")

    return {"code": code, "memberId": member_id, "name": name}


@router.post("/{code}/join")
async def join_channel(code: str, body: JoinChannelBody):
    display_name = body.displayName.strip()
    if not display_name or not body.password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "displayName and password are required")

    channel = await channels.find_one({"code": code})
    if channel is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Channel not found")

    if not verify_password(body.password, channel["passwordSalt"], channel["passwordHash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong password")

    # Same name + the channel password = treated as the same returning member
    # (this is the whole "login"; see api.md for the trust tradeoff this implies).
    existing = next(
        (m for m in channel["members"] if m["name"].lower() == display_name.lower()),
        None,
    )
    if existing:
        return {"memberId": existing["id"], "name": channel["name"]}

    member_id = generate_member_id()
    await channels.update_one(
        {"code": code},
        {"$push": {"members": {"id": member_id, "name": display_name, "muted": False, "sub": None}}},
    )
    return {"memberId": member_id, "name": channel["name"]}


@router.get("/{code}")
async def get_channel(code: str, x_member: str = Header(...)):
    channel, _ = await get_channel_member(code, x_member)
    latest_ring = await rings.find_one({"channelCode": code}, sort=[("createdAt", -1)])
    return channel_out(channel, latest_ring)


@router.post("/{code}/rings")
async def create_ring(code: str, request: Request, x_member: str = Header(...)):
    channel, sender = await get_channel_member(code, x_member)

    last_ring = await rings.find_one({"channelCode": code}, sort=[("createdAt", -1)])
    now = datetime.now(timezone.utc)
    if last_ring is not None and (now - last_ring["createdAt"]).total_seconds() < RING_COOLDOWN_SECONDS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Only one ring per minute per channel")

    audio: bytes | None = None
    audio_type: str | None = None
    content_type = request.headers.get("content-type", "").split(";")[0].strip()
    raw_body = await request.body()
    if raw_body and content_type in ALLOWED_AUDIO_TYPES:
        if len(raw_body) > MAX_AUDIO_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Audio too large (max 300 KB)")
        audio, audio_type = raw_body, content_type

    ring_doc = {
        "channelCode": code,
        "senderId": sender["id"],
        "senderName": sender["name"],
        "audio": audio,
        "audioType": audio_type,
        "createdAt": now,
        "acks": [],
        "repeats": 0,
    }
    result = await rings.insert_one(ring_doc)
    ring_doc["_id"] = result.inserted_id

    await push_to_members(channel, ring_doc)
    schedule_repeats(result.inserted_id, code)

    return ring_out(ring_doc)
