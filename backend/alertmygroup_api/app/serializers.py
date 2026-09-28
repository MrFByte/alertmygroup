def member_out(member: dict) -> dict:
    return {"id": member["id"], "name": member["name"], "muted": member.get("muted", False)}


def ring_out(ring: dict) -> dict:
    return {
        "_id": str(ring["_id"]),
        "channelCode": ring["channelCode"],
        "senderId": ring["senderId"],
        "senderName": ring["senderName"],
        "hasAudio": bool(ring.get("audio")),
        "createdAt": ring["createdAt"].isoformat(),
        "acks": [
            {"memberId": a["memberId"], "at": a["at"].isoformat()}
            for a in ring.get("acks", [])
        ],
    }


def channel_out(channel: dict, latest_ring: dict | None) -> dict:
    return {
        "code": channel["code"],
        "name": channel["name"],
        "members": [member_out(m) for m in channel["members"]],
        "latestRing": ring_out(latest_ring) if latest_ring else None,
    }
