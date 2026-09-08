"""
Зоопарк моделей.

Регрессоры повторяют набор алгоритмов из репозитория-референса
"Soil Moisture Prediction Using machine Learning algorithms"
(Linear Regression, Decision Tree, Random Forest, KNN, XGBoost),
плюс Ridge — на 80 наблюдениях регуляризованная линейная модель
часто оказывается сильнее ансамблей, и её стоит иметь в сравнении.

Гиперпараметры выставлены под маленькую выборку: неглубокие деревья,
обязательный min_samples_leaf, сильная регуляризация у XGBoost.
Дефолтные настройки sklearn на n=80 переобучаются гарантированно.

Все модели однопоточные (n_jobs=1) намеренно: параллелится внешний цикл
кросс-валидации. Вложенный параллелизм на машине с двумя ядрами даёт
oversubscription и замедляет обучение в разы.
"""
from sklearn.ensemble import (GradientBoostingRegressor, RandomForestClassifier,
                              RandomForestRegressor, StackingRegressor)
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.neural_network import MLPRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.svm import SVR
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor

RANDOM_STATE = 42


def _scaled(estimator):
    """Масштабирование обязательно для линейных моделей и KNN:
    признаки различаются на порядки (EC ~ 10^3, pH ~ 10^0)."""
    return Pipeline([("scaler", StandardScaler()), ("model", estimator)])


def regressors() -> dict:
    return {
        "LinearRegression": _scaled(LinearRegression()),
        "Ridge": _scaled(Ridge(alpha=10.0, random_state=RANDOM_STATE)),
        "DecisionTree": DecisionTreeRegressor(
            max_depth=4, min_samples_leaf=5, random_state=RANDOM_STATE),
        "RandomForest": RandomForestRegressor(
            n_estimators=400, max_depth=6, min_samples_leaf=3,
            max_features="sqrt", random_state=RANDOM_STATE, n_jobs=1),
        "KNN": _scaled(KNeighborsRegressor(n_neighbors=5, weights="distance")),
        "XGBoost": XGBRegressor(
            n_estimators=300, max_depth=3, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            reg_lambda=5.0, reg_alpha=0.5, min_child_weight=3,
            random_state=RANDOM_STATE, n_jobs=1, verbosity=0),
    }


def ph_regressors() -> dict:
    """
    Расширенный набор под задачу pH.

    Повторяет состав из репозитория-референса "Prediction of Soil pH":
    Random Forest, XGBoost, Decision Tree, SVR, ANN и стекинг.
    Там на своих данных лучшим оказался Random Forest с R2=0.62 и RMSE=0.52 —
    это ориентир, с которым сравниваются наши цифры.
    """
    base = regressors()
    base["SVR"] = _scaled(SVR(kernel="rbf", C=10.0, epsilon=0.1, gamma="scale"))
    # ANN: одна скрытая прослойка, сильная L2-регуляризация и ранняя остановка.
    # На 80 наблюдениях сеть побольше просто запомнит обучающую выборку.
    base["ANN"] = _scaled(MLPRegressor(
        hidden_layer_sizes=(32,), alpha=1.0, max_iter=3000,
        early_stopping=True, n_iter_no_change=30,
        random_state=RANDOM_STATE))
    # cv=3 и 150 деревьев вместо 5 и 300: стекинг переобучает базовые модели
    # внутри каждого внешнего фолда, и при 40 фолдах LOSO полный вариант
    # обходится в десятки минут без заметного выигрыша в качестве.
    base["Stacking"] = StackingRegressor(
        estimators=[
            ("rf", RandomForestRegressor(
                n_estimators=150, max_depth=6, min_samples_leaf=3,
                max_features="sqrt", random_state=RANDOM_STATE, n_jobs=1)),
            ("svr", _scaled(SVR(kernel="rbf", C=10.0, epsilon=0.1))),
            ("gbr", GradientBoostingRegressor(
                n_estimators=200, max_depth=2, learning_rate=0.05,
                random_state=RANDOM_STATE)),
        ],
        final_estimator=Ridge(alpha=1.0),
        cv=3, n_jobs=1)
    return base


def classifiers() -> dict:
    return {
        "LogisticRegression": _scaled(LogisticRegression(
            C=1.0, max_iter=2000, random_state=RANDOM_STATE)),
        "DecisionTree": DecisionTreeClassifier(
            max_depth=4, min_samples_leaf=4, class_weight="balanced",
            random_state=RANDOM_STATE),
        "RandomForest": RandomForestClassifier(
            n_estimators=500, max_depth=6, min_samples_leaf=2,
            max_features="sqrt", class_weight="balanced_subsample",
            random_state=RANDOM_STATE, n_jobs=1),
        "KNN": _scaled(KNeighborsClassifier(n_neighbors=5, weights="distance")),
        "XGBoost": XGBClassifier(
            n_estimators=300, max_depth=3, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            reg_lambda=5.0, min_child_weight=2,
            random_state=RANDOM_STATE, n_jobs=1, verbosity=0),
    }


# Пространства гиперпараметров для генетического алгоритма
GA_PARAM_SPACE_REG = {
    "n_estimators": [100, 200, 300],
    "max_depth": [2, 3, 4, 6],
    "min_samples_leaf": [1, 2, 3, 5],
    "max_features": [0.4, 0.6, 0.8, 1.0],
}

GA_PARAM_SPACE_CLF = {
    "n_estimators": [150, 300],
    "max_depth": [3, 4, 6],
    "min_samples_leaf": [1, 2, 3],
    "max_features": [0.4, 0.6, 0.8],
}


def make_ga_regressor(params: dict) -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=int(params["n_estimators"]),
        max_depth=int(params["max_depth"]),
        min_samples_leaf=int(params["min_samples_leaf"]),
        max_features=float(params["max_features"]),
        random_state=RANDOM_STATE, n_jobs=1)


def make_ga_classifier(params: dict) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=int(params["n_estimators"]),
        max_depth=int(params["max_depth"]),
        min_samples_leaf=int(params["min_samples_leaf"]),
        max_features=float(params["max_features"]),
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE, n_jobs=1)
