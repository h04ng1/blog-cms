from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tag import Tag


def list_all(db: Session) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(Tag.name)))


def get_or_create_many(db: Session, names: list[str]) -> list[Tag]:
    tags = []
    for name in names:
        name = name.strip()
        if not name:
            continue
        slug = slugify(name)
        tag = db.scalar(select(Tag).where(Tag.slug == slug))
        if not tag:
            tag = Tag(name=name, slug=slug)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags
