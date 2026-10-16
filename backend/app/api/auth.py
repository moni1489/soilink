from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal, get_db
from app.core.security import (
    SESSION_COOKIE, SESSION_TTL_S, hash_password, is_locked, make_session, read_session,
    register_fail, reset_fails, verify_password,
)
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Хеш-заглушка: на неизвестный логин тратим столько же времени, сколько на проверку пароля,
# чтобы по времени ответа нельзя было перебрать существующие логины
_DUMMY_HASH = hash_password("dummy-password")


class LoginIn(BaseModel):
    login: str
    password: str


def _client_key(request: Request, login: str) -> str:
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?")
    return f"{ip}:{login}"


@router.post("/login")
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    name = payload.login.strip().lower()
    key = _client_key(request, name)
    if is_locked(key):
        raise HTTPException(status_code=429, detail="Too many attempts")

    user = db.get(User, name)
    if not verify_password(payload.password, user.password_hash if user else _DUMMY_HASH) or not user:
        register_fail(key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    reset_fails(key)
    https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(
        SESSION_COOKIE, make_session(user.login), max_age=SESSION_TTL_S,
        httponly=True, samesite="lax", secure=https, path="/",
    )
    return {"login": user.login}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    name = read_session(request.cookies.get(SESSION_COOKIE))
    if not name:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"login": name}


def upsert_user(db: Session, login: str, password: str) -> User:
    login = login.strip().lower()
    if not login or "|" in login:
        raise ValueError("bad login")
    if len(password) < 8:
        raise ValueError("password must be at least 8 characters")
    user = db.get(User, login) or User(login=login)
    user.password_hash = hash_password(password)
    db.add(user)
    db.commit()
    return user


def bootstrap_admin():
    """Первый вход на новом сервере: ADMIN_LOGIN + ADMIN_PASSWORD из окружения. Существующего не трогаем."""
    if not (settings.ADMIN_LOGIN and settings.ADMIN_PASSWORD):
        return
    db = SessionLocal()
    try:
        if not db.get(User, settings.ADMIN_LOGIN.strip().lower()):
            upsert_user(db, settings.ADMIN_LOGIN, settings.ADMIN_PASSWORD)
    finally:
        db.close()
