"""Вход по логину/паролю: хеш пароля, подписанная cookie сессии и закрытие /api без неё."""
import hashlib
import hmac
import logging
import secrets
import time
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings

SESSION_COOKIE = "soilink_session"
SESSION_TTL_S = 7 * 24 * 3600
PBKDF2_ITERATIONS = 200_000

# Без AUTH_SECRET сессии подписываются случайным ключом и слетают при каждом перезапуске
_secret = (settings.AUTH_SECRET or secrets.token_hex(32)).encode()
if not settings.AUTH_SECRET:
    logging.getLogger(__name__).warning("AUTH_SECRET не задан — сессии сбросятся при перезапуске сервера")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, digest = stored.split("$")
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(check.hex(), digest)
    except ValueError:
        return False


def _sign(payload: str) -> str:
    return hmac.new(_secret, payload.encode(), hashlib.sha256).hexdigest()


def make_session(login: str) -> str:
    payload = f"{login}|{int(time.time()) + SESSION_TTL_S}"
    return f"{payload}|{_sign(payload)}"


def read_session(token: Optional[str]) -> Optional[str]:
    """Логин из cookie, если подпись верна и срок не вышел."""
    try:
        login, exp, sig = (token or "").rsplit("|", 2)
    except ValueError:
        return None
    if not hmac.compare_digest(sig, _sign(f"{login}|{exp}")) or int(exp) < time.time():
        return None
    return login


# ─── Защита от подбора ───
# ponytail: счётчик в памяти процесса — при нескольких воркерах/репликах у каждого свой; Redis, если масштабироваться
MAX_FAILS = 8
LOCK_WINDOW_S = 15 * 60
_fails: dict[str, list[float]] = {}


def is_locked(key: str) -> bool:
    now = time.time()
    _fails[key] = [t for t in _fails.get(key, []) if now - t < LOCK_WINDOW_S]
    return len(_fails[key]) >= MAX_FAILS


def register_fail(key: str):
    _fails.setdefault(key, []).append(time.time())


def reset_fails(key: str):
    _fails.pop(key, None)


# ─── Закрываем API ───
# Вебхук хаба открыт: датчик не умеет входить. Вход и проверка сессии — тоже.
PUBLIC_API = ("/api/auth/", "/api/readings/linkedge")


async def require_session(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and not path.startswith(PUBLIC_API) and request.method != "OPTIONS":
        if not read_session(request.cookies.get(SESSION_COOKIE)):
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)
    return await call_next(request)
