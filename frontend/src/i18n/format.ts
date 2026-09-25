import type { TFunction } from 'i18next';

/**
 * Норма/факт внесения хранится как «значение|ключ единицы» — например «15|unit.lm2».
 * Введённый вручную текст остаётся как есть: разделителя в нём нет.
 */
export function formatAmount(t: TFunction, raw: string): string {
  const sep = raw.indexOf('|');
  return sep === -1 ? raw : `${raw.slice(0, sep)} ${t(raw.slice(sep + 1))}`;
}
