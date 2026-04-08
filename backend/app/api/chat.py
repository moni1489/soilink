from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.chat_service import build_chat_context

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/context")
def get_chat_context(field_id: str, db: Session = Depends(get_db)):
    return build_chat_context(db, field_id)
