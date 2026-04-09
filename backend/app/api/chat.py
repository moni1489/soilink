from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.chat_service import build_chat_context, ask_chatbot

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    field_id: str
    message: str
    context: Optional[dict] = None


@router.get("/context")
def get_chat_context(field_id: str, db: Session = Depends(get_db)):
    """Return the raw ML + sensor context used to ground chatbot responses."""
    return build_chat_context(db, field_id)


@router.post("/ask")
def chat_ask(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Ask the AI agronomist a question about a specific field.
    The response is grounded in custom context (if provided) and live sensor data.
    """
    try:
        result = ask_chatbot(db, req.field_id, req.message, req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")
    return result
