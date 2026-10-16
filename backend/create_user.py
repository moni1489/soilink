"""Создать пользователя или сменить ему пароль: python create_user.py <логин>  (пароль спросит без эха)."""
import getpass
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal, create_tables
from app.api.auth import upsert_user

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python create_user.py <login>")
    password = getpass.getpass("Пароль (от 8 символов): ")
    if password != getpass.getpass("Ещё раз: "):
        sys.exit("Пароли не совпали")
    create_tables()
    db = SessionLocal()
    try:
        print("Готово:", upsert_user(db, sys.argv[1], password).login)
    except ValueError as e:
        sys.exit(f"Ошибка: {e}")
    finally:
        db.close()
