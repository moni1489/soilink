"""
Одноразовый перенос данных из старой SQLite-базы в PostgreSQL.

    python migrate_sqlite_to_postgres.py [путь_к_sqlite]   # по умолчанию ./soilink.db

Целевая база берётся из DATABASE_URL (.env). Повторный запуск безопасен:
строки с уже существующим первичным ключом пропускаются.
"""
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, select, text

from app.core.db import Base, engine as target_engine, IS_SQLITE
import app.models  # noqa: F401 — регистрирует таблицы в Base.metadata


def as_utc(value):
    # SQLite хранил время без зоны, фактически в UTC
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def migrate(sqlite_path: str):
    if IS_SQLITE:
        sys.exit("DATABASE_URL указывает на SQLite — укажите PostgreSQL в .env")
    if not os.path.exists(sqlite_path):
        sys.exit(f"Файл {sqlite_path} не найден")

    source_engine = create_engine(f"sqlite:///{sqlite_path}")
    Base.metadata.create_all(bind=target_engine)

    with source_engine.connect() as src, target_engine.begin() as dst:
        for table in Base.metadata.sorted_tables:
            pk = [c.name for c in table.primary_key.columns]
            existing = {tuple(r) for r in dst.execute(select(*table.primary_key.columns))}
            try:
                rows = src.execute(select(table)).mappings().all()
            except Exception as e:  # таблицы может не быть в старой базе
                print(f"{table.name}: пропущено ({e.__class__.__name__})")
                continue

            new_rows = [
                {k: as_utc(v) for k, v in row.items()}
                for row in rows
                if tuple(row[c] for c in pk) not in existing
            ]
            if new_rows:
                dst.execute(table.insert(), new_rows)

            # После вставки явных id сдвигаем счётчики автоинкремента
            for col in table.primary_key.columns:
                if col.autoincrement is True or (col.autoincrement == "auto" and col.type.python_type is int):
                    dst.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{table.name}', '{col.name}'), "
                        f"COALESCE((SELECT MAX({col.name}) FROM {table.name}), 0) + 1, false)"
                    ))
            print(f"{table.name}: перенесено {len(new_rows)} из {len(rows)}")


if __name__ == "__main__":
    migrate(sys.argv[1] if len(sys.argv) > 1 else "soilink.db")
