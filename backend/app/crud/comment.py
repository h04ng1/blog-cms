from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment


def list_for_post(db: Session, post_id: int) -> list[Comment]:
    stmt = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .options(joinedload(Comment.author))
        .order_by(Comment.created_at)
    )
    return list(db.scalars(stmt))


def get(db: Session, comment_id: int) -> Comment | None:
    return db.get(Comment, comment_id)


def create(db: Session, post_id: int, author_id: int, content: str) -> Comment:
    comment = Comment(post_id=post_id, author_id=author_id, content=content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def delete(db: Session, comment: Comment) -> None:
    db.delete(comment)
    db.commit()
