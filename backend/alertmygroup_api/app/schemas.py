from pydantic import BaseModel, ConfigDict


class CreateChannelBody(BaseModel):
    name: str
    displayName: str
    password: str


class JoinChannelBody(BaseModel):
    displayName: str
    password: str


class MuteBody(BaseModel):
    muted: bool


class SubscriptionBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    endpoint: str
    keys: dict[str, str]
