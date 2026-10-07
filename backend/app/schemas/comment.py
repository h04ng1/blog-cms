from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserRead


class CommentCreate(BaseModel):
    content: str


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_at: datetime
    author: UserRead
