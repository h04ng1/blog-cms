from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.post import PostStatus
from app.schemas.category import CategoryRead
from app.schemas.tag import TagRead
from app.schemas.user import UserRead


class PostCreate(BaseModel):
    title: str
    summary: str = ""
    content: str
    status: PostStatus = PostStatus.DRAFT
    category_id: int | None = None
    tag_names: list[str] = []


class PostUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    status: PostStatus | None = None
    category_id: int | None = None
    tag_names: list[str] | None = None


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    summary: str
    content: str
    cover_image: str | None
    status: PostStatus
    views: int
    created_at: datetime
    updated_at: datetime
    author: UserRead
    category: CategoryRead | None
    tags: list[TagRead]


class PostListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    summary: str
    cover_image: str | None
    status: PostStatus
    views: int
    created_at: datetime
    author: UserRead
    category: CategoryRead | None
    tags: list[TagRead]


class PaginatedPosts(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int
    pages: int
