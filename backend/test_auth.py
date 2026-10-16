"""Self-check входа: python test_auth.py (на временной SQLite, рабочую базу не трогает)."""
import os, sys, tempfile
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/t.db"
os.environ["AUTH_SECRET"] = "test-secret"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.core.db import create_tables, SessionLocal
from app.core.security import require_session, read_session, make_session
from app.api import auth, sensors, readings

app = FastAPI(); app.middleware("http")(require_session)
for r in (auth, sensors, readings): app.include_router(r.router)
create_tables()
db = SessionLocal(); auth.upsert_user(db, "Farmer", "correct-horse"); db.close()

c = TestClient(app)
assert c.get("/api/sensors").status_code == 401                      # без входа API закрыт
assert c.post("/api/readings/linkedge", json={}).status_code == 200  # вебхук хаба открыт
assert c.post("/api/auth/login", json={"login": "farmer", "password": "wrong"}).status_code == 401
assert c.post("/api/auth/login", json={"login": "nobody", "password": "x"}).status_code == 401
r = c.post("/api/auth/login", json={"login": " FARMER ", "password": "correct-horse"})
assert r.status_code == 200 and "httponly" in r.headers["set-cookie"].lower(), r.headers
assert c.get("/api/auth/me").json()["login"] == "farmer"
assert c.get("/api/sensors").status_code == 200                      # с cookie — открыт
c.post("/api/auth/logout"); c.cookies.clear()
assert c.get("/api/sensors").status_code == 401

# подделка и просрочка
tok = make_session("farmer")
assert read_session(tok) == "farmer"
assert read_session(tok.replace("farmer", "admin", 1)) is None
assert read_session("farmer|1|deadbeef") is None and read_session(None) is None

# подбор: после 8 ошибок — 429 даже с верным паролем
for _ in range(8): c.post("/api/auth/login", json={"login": "farmer", "password": "nope"})
assert c.post("/api/auth/login", json={"login": "farmer", "password": "correct-horse"}).status_code == 429

try:
    auth.upsert_user(SessionLocal(), "x", "short"); raise SystemExit("short password accepted")
except ValueError:
    pass
print("ok")
