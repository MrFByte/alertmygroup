from fastapi import APIRouter, Header, HTTPException, Response, status

from ..db import channels
from ..schemas import MuteBody, SubscriptionBody

router = APIRouter(tags=["me"])


@router.patch("/api/me", status_code=status.HTTP_204_NO_CONTENT)
async def set_mute(body: MuteBody, x_member: str = Header(...)):
    result = await channels.update_one(
        {"members.id": x_member},
        {"$set": {"members.$.muted": body.muted}},
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/api/me/subscription", status_code=status.HTTP_204_NO_CONTENT)
async def save_subscription(body: SubscriptionBody, x_member: str = Header(...)):
    result = await channels.update_one(
        {"members.id": x_member},
        {"$set": {"members.$.sub": body.model_dump(exclude_none=True)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
