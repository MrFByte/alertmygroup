import hashlib
import hmac
import secrets
import string

from fastapi import HTTPException, status

from .db import channels

_CODE_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1I")
_PBKDF2_ITERATIONS = 100_000


def generate_channel_code(length: int = 6) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


def generate_member_id() -> str:
    return secrets.token_urlsafe(24)


def hash_password(password: str) -> tuple[str, str]:
    """Returns (hash_hex, salt_hex). Stdlib only — no bcrypt/passlib dependency."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return digest.hex(), salt


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), _PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected_hash_hex)


async def get_channel_member(code: str, member_id: str) -> tuple[dict, dict]:
    """Look up a channel and verify member_id belongs to it. Raises 403 otherwise."""
    channel = await channels.find_one({"code": code, "members.id": member_id})
    if channel is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this channel")
    member = next(m for m in channel["members"] if m["id"] == member_id)
    return channel, member
