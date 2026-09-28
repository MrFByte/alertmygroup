import asyncio

from pywebpush import WebPushException, webpush

from .config import settings
from .db import channels


async def send_push(subscription: dict, payload: str, member_id: str) -> None:
    """Send one push message. Drops the subscription if the push service reports it as gone."""
    try:
        await asyncio.to_thread(
            webpush,
            subscription_info=subscription,
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", None)
        if status_code in (404, 410):
            await channels.update_one(
                {"members.id": member_id},
                {"$set": {"members.$.sub": None}},
            )
