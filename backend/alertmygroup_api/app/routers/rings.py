from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Header, HTTPException, Response, status

from ..db import channels, rings
from ..serializers import ring_out

router = APIRouter(prefix="/api/rings", tags=["rings"])


def _oid(ring_id: str) -> ObjectId:
    try:
        return ObjectId(ring_id)
    except InvalidId:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ring not found")


async def _ring_and_membership(ring_id: str, x_member: str) -> dict:
    ring = await rings.find_one({"_id": _oid(ring_id)})
    if ring is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ring not found")
    channel = await channels.find_one({"code": ring["channelCode"], "members.id": x_member})
    if channel is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this channel")
    return ring


@router.get("/{ring_id}")
async def get_ring(ring_id: str, x_member: str = Header(...)):
    ring = await _ring_and_membership(ring_id, x_member)
    return ring_out(ring)


@router.get("/{ring_id}/audio")
async def get_ring_audio(ring_id: str, x_member: str = Header(...)):
    ring = await _ring_and_membership(ring_id, x_member)
    if not ring.get("audio"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No audio for this ring")
    return Response(content=ring["audio"], media_type=ring.get("audioType") or "application/octet-stream")


@router.post("/{ring_id}/ack", status_code=status.HTTP_204_NO_CONTENT)
async def ack_ring(ring_id: str, x_member: str = Header(...)):
    oid = _oid(ring_id)
    ring = await _ring_and_membership(ring_id, x_member)

    already_acked = any(a["memberId"] == x_member for a in ring.get("acks", []))
    if not already_acked:
        await rings.update_one(
            {"_id": oid},
            {"$push": {"acks": {"memberId": x_member, "at": datetime.now(timezone.utc)}}},
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
