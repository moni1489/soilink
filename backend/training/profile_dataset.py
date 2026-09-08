"""
Профилирование Excel-датасета перед обучением моделей состояния почвы.

Запуск:
    backend/.venv/bin/python backend/training/profile_dataset.py <путь к .xlsx>
"""
import sys
from pathlib import Path

import pandas as pd

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 100)


def profile_sheet(name: str, df: pd.DataFrame) -> None:
    print("=" * 100)
    print(f"ЛИСТ: {name}   строк={len(df)}  столбцов={df.shape[1]}")
    print("=" * 100)

    print("\n--- Столбцы (тип / пропуски / уникальных) ---")
    info = pd.DataFrame({
        "dtype": df.dtypes.astype(str),
        "n_missing": df.isna().sum(),
        "pct_missing": (df.isna().mean() * 100).round(1),
        "n_unique": df.nunique(dropna=True),
    })
    print(info.to_string())

    num = df.select_dtypes("number")
    if not num.empty:
        print("\n--- Числовые признаки ---")
        print(num.describe().T.round(3).to_string())

    cat = df.select_dtypes(exclude="number")
    if not cat.empty:
        print("\n--- Категориальные / текстовые признаки (топ-10 значений) ---")
        for col in cat.columns:
            vals = df[col].value_counts(dropna=False).head(10)
            print(f"\n  [{col}]  уникальных={df[col].nunique(dropna=True)}")
            for v, c in vals.items():
                print(f"     {str(v)[:60]:<60} {c}")

    print("\n--- Первые 5 строк ---")
    print(df.head(5).to_string())
    print()


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Файл не найден: {path}")
        sys.exit(1)

    sheets = pd.read_excel(path, sheet_name=None)
    print(f"Файл: {path}  ({path.stat().st_size / 1024:.1f} КБ)")
    print(f"Листов: {len(sheets)} -> {list(sheets)}\n")

    for name, df in sheets.items():
        profile_sheet(name, df)


if __name__ == "__main__":
    main()
