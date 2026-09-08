"""
Enhanced Genetic Algorithm (EGA) для отбора признаков и подбора гиперпараметров.

Реализация по мотивам "Soil NPK Prediction using Enhanced Genetic Algorithm"
(IEEE, 2023). Отличия «enhanced» версии от классического GA, как в статье:
  * ранговая селекция вместо рулетки — не даёт одной сверхприспособленной
    особи захватить популяцию на маленькой выборке;
  * улучшенный кроссовер — равномерный (uniform) с обменом каждого гена,
    вместо одноточечного, плюс наследование гиперпараметров как блока;
  * адаптивная мутация — высокая в начале (разведка), затухающая к концу
    (эксплуатация); скорость падает линейно по поколениям;
  * элитизм — лучшие особи переходят в следующее поколение без изменений.

Здесь EGA решает задачу, специфичную для нашего датасета: при 80 наблюдениях
и ~20 признаках отбор подмножества признаков важнее тюнинга. Поэтому в fitness
добавлен штраф за размер подмножества (parsimony pressure).
"""
from dataclasses import dataclass, field
from typing import Callable

import numpy as np


@dataclass
class Individual:
    mask: np.ndarray            # бинарная маска признаков
    params: dict                # гиперпараметры модели
    fitness: float = -np.inf
    raw_score: float = -np.inf  # fitness без штрафа за число признаков


@dataclass
class EGAConfig:
    population_size: int = 24
    generations: int = 12
    elite_size: int = 3
    crossover_rate: float = 0.8
    mutation_rate_start: float = 0.25
    mutation_rate_end: float = 0.05
    parsimony: float = 0.004    # штраф за каждый лишний признак
    tournament_pressure: float = 1.8  # 1.0 = без давления, 2.0 = максимум
    random_state: int = 42
    verbose: bool = True
    history: list = field(default_factory=list)


class EnhancedGA:
    def __init__(self, n_features: int, param_space: dict[str, list],
                 score_fn: Callable[[np.ndarray, dict], float],
                 config: EGAConfig | None = None):
        """
        n_features  — длина маски признаков
        param_space — {имя гиперпараметра: список допустимых значений}
        score_fn    — (mask, params) -> метрика качества (чем больше, тем лучше)
        """
        self.n_features = n_features
        self.param_space = param_space
        self.param_names = list(param_space)
        self.score_fn = score_fn
        self.cfg = config or EGAConfig()
        self.rng = np.random.default_rng(self.cfg.random_state)
        self._cache: dict[tuple, tuple[float, float]] = {}

    # --- инициализация ----------------------------------------------------
    def _random_individual(self) -> Individual:
        # доля включённых признаков берётся случайно из [0.3, 0.8],
        # чтобы стартовая популяция покрывала подмножества разного размера
        density = self.rng.uniform(0.3, 0.8)
        mask = (self.rng.random(self.n_features) < density).astype(int)
        if mask.sum() == 0:
            mask[self.rng.integers(self.n_features)] = 1
        params = {k: self.rng.choice(v) for k, v in self.param_space.items()}
        return Individual(mask=mask, params=params)

    # --- приспособленность ------------------------------------------------
    def _evaluate(self, ind: Individual) -> None:
        key = (tuple(ind.mask), tuple(sorted((k, str(v)) for k, v in ind.params.items())))
        if key in self._cache:
            ind.raw_score, ind.fitness = self._cache[key]
            return
        raw = self.score_fn(ind.mask.astype(bool), ind.params)
        # штраф за размер подмножества: на 80 наблюдениях лишние признаки
        # почти всегда переобучение, даже если CV этого сразу не показывает
        penalty = self.cfg.parsimony * ind.mask.sum()
        fit = raw - penalty
        ind.raw_score, ind.fitness = raw, fit
        self._cache[key] = (raw, fit)

    # --- селекция ---------------------------------------------------------
    def _rank_selection(self, pop: list[Individual], k: int) -> list[Individual]:
        """
        Ранговая селекция: вероятность пропорциональна рангу, а не самой
        приспособленности. Устойчива к выбросам fitness и к отрицательным
        значениям R2, которые на маленькой выборке появляются регулярно.
        """
        order = np.argsort([ind.fitness for ind in pop])  # по возрастанию
        n = len(pop)
        ranks = np.empty(n)
        ranks[order] = np.arange(1, n + 1)
        sp = self.cfg.tournament_pressure
        # линейное ранжирование: от (2 - sp) у худшего до sp у лучшего
        weights = (2 - sp) + 2 * (sp - 1) * (ranks - 1) / max(n - 1, 1)
        probs = weights / weights.sum()
        idx = self.rng.choice(n, size=k, p=probs)
        return [pop[i] for i in idx]

    # --- кроссовер --------------------------------------------------------
    def _crossover(self, a: Individual, b: Individual) -> tuple[Individual, Individual]:
        """Равномерный кроссовер по маске + независимое наследование каждого
        гиперпараметра. Даёт куда более широкое перемешивание, чем одноточечный."""
        if self.rng.random() > self.cfg.crossover_rate:
            return (Individual(a.mask.copy(), dict(a.params)),
                    Individual(b.mask.copy(), dict(b.params)))

        swap = self.rng.random(self.n_features) < 0.5
        m1, m2 = a.mask.copy(), b.mask.copy()
        m1[swap], m2[swap] = b.mask[swap], a.mask[swap]

        p1, p2 = dict(a.params), dict(b.params)
        for name in self.param_names:
            if self.rng.random() < 0.5:
                p1[name], p2[name] = b.params[name], a.params[name]

        return (Individual(self._repair(m1), p1), Individual(self._repair(m2), p2))

    # --- мутация ----------------------------------------------------------
    def _mutate(self, ind: Individual, generation: int) -> None:
        """Адаптивная мутация: интенсивная разведка в начале, тонкая
        доводка в конце. Ставка падает линейно от start к end."""
        t = generation / max(self.cfg.generations - 1, 1)
        rate = (self.cfg.mutation_rate_start * (1 - t)
                + self.cfg.mutation_rate_end * t)

        flips = self.rng.random(self.n_features) < rate
        ind.mask[flips] = 1 - ind.mask[flips]
        ind.mask = self._repair(ind.mask)

        for name, values in self.param_space.items():
            if self.rng.random() < rate:
                ind.params[name] = self.rng.choice(values)

    def _repair(self, mask: np.ndarray) -> np.ndarray:
        """Пустая маска — невалидная особь: модель не на чем обучать."""
        if mask.sum() == 0:
            mask[self.rng.integers(self.n_features)] = 1
        return mask

    # --- основной цикл ----------------------------------------------------
    def run(self) -> Individual:
        pop = [self._random_individual() for _ in range(self.cfg.population_size)]
        for ind in pop:
            self._evaluate(ind)

        best = max(pop, key=lambda i: i.fitness)
        for gen in range(self.cfg.generations):
            pop.sort(key=lambda i: i.fitness, reverse=True)
            # элитизм: лучшие переходят как есть
            next_pop = [Individual(i.mask.copy(), dict(i.params), i.fitness, i.raw_score)
                        for i in pop[:self.cfg.elite_size]]

            parents = self._rank_selection(pop, self.cfg.population_size)
            i = 0
            while len(next_pop) < self.cfg.population_size:
                c1, c2 = self._crossover(parents[i % len(parents)],
                                         parents[(i + 1) % len(parents)])
                self._mutate(c1, gen)
                self._mutate(c2, gen)
                next_pop.extend([c1, c2])
                i += 2
            next_pop = next_pop[:self.cfg.population_size]

            for ind in next_pop:
                self._evaluate(ind)
            pop = next_pop

            gen_best = max(pop, key=lambda i: i.fitness)
            if gen_best.fitness > best.fitness:
                best = Individual(gen_best.mask.copy(), dict(gen_best.params),
                                  gen_best.fitness, gen_best.raw_score)
            self.cfg.history.append({
                "generation": gen,
                "best_fitness": float(gen_best.fitness),
                "best_raw": float(gen_best.raw_score),
                "mean_fitness": float(np.mean([i.fitness for i in pop])),
                "n_features": int(gen_best.mask.sum()),
            })
            if self.cfg.verbose:
                print(f"    поколение {gen:2d}: best={gen_best.raw_score:.4f} "
                      f"(признаков {int(gen_best.mask.sum())})  "
                      f"среднее={np.mean([i.fitness for i in pop]):.4f}")

        return best
