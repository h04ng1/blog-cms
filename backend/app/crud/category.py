from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate


def list_all(db: Session) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)))


def get(db: Session, category_id: int) -> Category | None:
    return db.get(Category, category_id)


def get_by_slug(db: Session, slug: str) -> Category | None:
    return db.scalar(select(Category).where(Category.slug == slug))


def create(db: Session, data: CategoryCreate) -> Category:
    category = Category(name=data.name, slug=slugify(data.name))
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()
