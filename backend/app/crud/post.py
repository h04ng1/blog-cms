from slugify import slugify
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.crud.tag import get_or_create_many
from app.models.post import Post, PostStatus
from app.models.user import User, UserRole
from app.schemas.post import PostCreate, PostUpdate

POST_RELATIONS = (
    joinedload(Post.author),
    joinedload(Post.category),
    joinedload(Post.tags),
)


def _unique_slug(db: Session, title: str, exclude_id: int | None = None) -> str:
    base_slug = slugify(title)
    slug = base_slug
    counter = 1
    while True:
        stmt = select(Post).where(Post.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Post.id != exclude_id)
        if not db.scalar(stmt):
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"


def list_posts(
    db: Session,
    page: int,
    page_size: int,
    current_user: User | None,
    category_slug: str | None = None,
    tag_slug: str | None = None,
    search: str | None = None,
    author_id: int | None = None,
) -> tuple[list[Post], int]:
    stmt = select(Post).options(*POST_RELATIONS)

    is_admin = bool(current_user and current_user.role == UserRole.ADMIN)
    if author_id is not None:
        stmt = stmt.where(Post.author_id == author_id)
        if not (is_admin or (current_user and current_user.id == author_id)):
            stmt = stmt.where(Post.status == PostStatus.PUBLISHED)
    elif not is_admin:
        if current_user:
            stmt = stmt.where(
                or_(Post.status == PostStatus.PUBLISHED, Post.author_id == current_user.id)
            )
        else:
            stmt = stmt.where(Post.status == PostStatus.PUBLISHED)

    if category_slug:
        stmt = stmt.join(Post.category).where(Post.category.has(slug=category_slug))
    if tag_slug:
        stmt = stmt.join(Post.tags).where(Post.tags.any(slug=tag_slug))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Post.title.ilike(like), Post.summary.ilike(like)))

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Post.id).subquery()))

    stmt = stmt.order_by(Post.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(stmt).unique())
    return items, total or 0


def get_by_id(db: Session, post_id: int) -> Post | None:
    stmt = select(Post).options(*POST_RELATIONS).where(Post.id == post_id)
    return db.scalar(stmt)


def get_by_slug(db: Session, slug: str) -> Post | None:
    stmt = select(Post).options(*POST_RELATIONS).where(Post.slug == slug)
    return db.scalar(stmt)


def increment_views(db: Session, post: Post) -> None:
    post.views += 1
    db.commit()


def create(db: Session, data: PostCreate, author_id: int) -> Post:
    post = Post(
        title=data.title,
        slug=_unique_slug(db, data.title),
        summary=data.summary,
        content=data.content,
        status=data.status,
        category_id=data.category_id,
        author_id=author_id,
    )
    post.tags = get_or_create_many(db, data.tag_names)
    db.add(post)
    db.commit()
    db.refresh(post)
    return get_by_id(db, post.id)


def update(db: Session, post: Post, data: PostUpdate) -> Post:
    payload = data.model_dump(exclude_unset=True, exclude={"tag_names"})
    for field, value in payload.items():
        setattr(post, field, value)
    if "title" in payload:
        post.slug = _unique_slug(db, post.title, exclude_id=post.id)
    if data.tag_names is not None:
        post.tags = get_or_create_many(db, data.tag_names)
    db.commit()
    db.refresh(post)
    return get_by_id(db, post.id)


def set_cover_image(db: Session, post: Post, path: str) -> Post:
    post.cover_image = path
    db.commit()
    db.refresh(post)
    return post


def delete(db: Session, post: Post) -> None:
    db.delete(post)
    db.commit()
