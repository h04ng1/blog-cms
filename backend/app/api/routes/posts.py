import math
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.config import settings
from app.crud import post as post_crud
from app.db.session import get_db
from app.models.post import PostStatus
from app.models.user import User, UserRole
from app.schemas.post import PaginatedPosts, PostCreate, PostRead, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _check_owner_or_admin(post, current_user: User):
    if post.author_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not allowed to modify this post")


@router.get("", response_model=PaginatedPosts)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    author_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    items, total = post_crud.list_posts(
        db,
        page=page,
        page_size=page_size,
        current_user=current_user,
        category_slug=category,
        tag_slug=tag,
        search=search,
        author_id=author_id,
    )
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedPosts(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.get("/{slug}", response_model=PostRead)
def get_post(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    post = post_crud.get_by_slug(db, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    is_owner_or_admin = current_user and (
        current_user.id == post.author_id or current_user.role == UserRole.ADMIN
    )
    if post.status != PostStatus.PUBLISHED and not is_owner_or_admin:
        raise HTTPException(status_code=404, detail="Post not found")
    post_crud.increment_views(db, post)
    return post


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return post_crud.create(db, data, author_id=current_user.id)


@router.put("/{post_id}", response_model=PostRead)
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = post_crud.get_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    _check_owner_or_admin(post, current_user)
    return post_crud.update(db, post, data)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = post_crud.get_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    _check_owner_or_admin(post, current_user)
    post_crud.delete(db, post)


@router.post("/{post_id}/cover-image", response_model=PostRead)
def upload_cover_image(
    post_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = post_crud.get_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    _check_owner_or_admin(post, current_user)
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(file_path, "wb") as out:
        out.write(file.file.read())

    return post_crud.set_cover_image(db, post, f"/uploads/{filename}")
