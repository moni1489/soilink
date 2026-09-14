# Ноутбук на Kaggle: модели состояния почвы Soilink

В этой папке — всё для публикации ноутбука на Kaggle:

```
notebook/
├── soilink_soil_models.ipynb   # сам ноутбук
├── kaggle_dataset/              # данные для отдельного Kaggle Dataset
│   ├── Supplement 2.xlsx
│   ├── site_climate.csv
│   └── dataset-metadata.json    # шаблон для kaggle CLI
├── kernel-metadata.json         # шаблон для kaggle CLI (сам ноутбук)
└── README.md                    # этот файл
```

Ноутбук воспроизводит весь пайплайн `backend/training/*.py`: сборку датасета
из `Supplement 2.xlsx`, защиту от утечек, две схемы кросс-валидации, зоопарк
алгоритмов и генетический отбор признаков — с теми же графиками (matplotlib
вместо HTML/SVG), что в опубликованном HTML-отчёте.

У меня нет доступа к вашему аккаунту Kaggle и API-токену, поэтому саму
публикацию нужно сделать вам — двумя способами на выбор.

## Способ 1 — через веб-интерфейс (без установки чего-либо)

**Шаг 1. Датасет с данными.**
1. Зайдите на [kaggle.com/datasets](https://www.kaggle.com/datasets) → **New Dataset**.
2. Перетащите оба файла из `kaggle_dataset/`: `Supplement 2.xlsx` и `site_climate.csv`.
3. Назовите датасет, например `Kazakhstan Soil Transect (Supplement 2)`, лицензия — CC0 или любая, под которую подпадают ваши данные.
4. Нажмите **Create**. Запомните URL — вида `kaggle.com/datasets/<ваш-ник>/<slug>`.

**Шаг 2. Ноутбук.**
1. [kaggle.com/code](https://www.kaggle.com/code) → **New Notebook**.
2. В открывшемся редакторе: **File → Import Notebook** → загрузите `soilink_soil_models.ipynb`.
3. Справа в панели **Add Input** → **Datasets** → найдите и прикрепите датасет из шага 1.
4. Нажмите **Save Version → Save & Run All** — Kaggle выполнит ноутбук с нуля на своей инфраструктуре (обычно 4 ядра CPU, что близко к среде, где ноутбук уже проверен: полный прогон занимает 10–20 минут).

Путь к данным ноутбук находит сам — код в первой кодовой ячейке ищет файлы
и рядом с собой, и под `/kaggle/input/*/`, так что привязки к конкретному
названию датасета нет.

## Способ 2 — через Kaggle CLI (если хотите автоматизировать)

Требует API-токен вашего аккаунта — я не могу его получить или использовать
за вас, но если вы положите `kaggle.json` в `~/.kaggle/` в этом кодспейсе,
я могу выполнить команды ниже сам.

```bash
pip install kaggle
mkdir -p ~/.kaggle
# kaggle.json скачивается на kaggle.com/settings -> API -> Create New Token
cp /path/to/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json
```

Замените `YOUR_KAGGLE_USERNAME` на ваш ник в обоих файлах метаданных:

```bash
cd backend/training/notebook
sed -i "s/YOUR_KAGGLE_USERNAME/<ваш-ник>/" kaggle_dataset/dataset-metadata.json kernel-metadata.json
```

Публикация датасета:
```bash
kaggle datasets create -p kaggle_dataset
```

Публикация ноутбука (после того как датасет создан — `kernel-metadata.json`
уже ссылается на него через `dataset_sources`):
```bash
kaggle kernels push -p .
```

Проверить статус выполнения:
```bash
kaggle kernels status <ваш-ник>/soilink-soil-state-models
```

## Если что-то в данных не найдётся

Ноутбук проверяет `site_climate.csv` на наличие «фолбэковых» строк (точки,
для которых климат ERA5 выкачать не удалось) и **останавливается с assert**,
если такие есть — специально, чтобы не обучаться на признаках-заглушках.
В приложенном файле фолбэков нет (все 40 точек собраны), так что при
использовании файла из `kaggle_dataset/` эта проверка пройдёт молча.

## Локальная проверка перед загрузкой

Ноутбук уже выполнен целиком в этой среде для проверки (`executed_test.ipynb`,
не публикуется — только для контроля). Если захотите повторить:

```bash
cd backend/training/notebook
cp "kaggle_dataset/Supplement 2.xlsx" .
cp kaggle_dataset/site_climate.csv .
../../.venv/bin/jupyter nbconvert --to notebook --execute \
    --output executed_test.ipynb soilink_soil_models.ipynb
```
