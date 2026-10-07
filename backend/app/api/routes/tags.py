from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import tag as tag_crud
from app.db.session import get_db
from app.schemas.tag import TagRead

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)):
    return tag_crud.list_all(db)
