import type { TaskType, WateringEvent } from '@/types';

export type Role =
  | 'director'
  | 'protection_agronomist'
  | 'irrigation_specialist'
  | 'agrochemist'
  | 'field_agronomist'
  | 'dispatcher'
  | 'contractor';

// Уровни доступа: полный → специалист (видит всё, меняет свою область)
// → поле (назначенные поля и работы) → подрядчик (только свои задания)
export type AccessLevel = 'full' | 'specialist' | 'field' | 'contractor';

export interface User {
  id: string;
  login: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  /** Поля, за которые отвечает агроном поля / диспетчер */
  assignedFieldIds?: string[];
  /** Для подрядчика — название организации */
  company?: string;
}

export const ROLES: Record<Role, { label: string; level: AccessLevel; domains: TaskType[] }> = {
  director:              { label: 'Руководитель агрокомплекса', level: 'full',       domains: ['water', 'fertilizer', 'protection'] },
  protection_agronomist: { label: 'Агроном по защите растений', level: 'specialist', domains: ['protection'] },
  irrigation_specialist: { label: 'Специалист по орошению',     level: 'specialist', domains: ['water'] },
  agrochemist:           { label: 'Агрохимик',                  level: 'specialist', domains: ['fertilizer'] },
  field_agronomist:      { label: 'Агроном поля',               level: 'field',      domains: [] },
  dispatcher:            { label: 'Диспетчер',                  level: 'field',      domains: [] },
  contractor:            { label: 'Подрядчик',                  level: 'contractor', domains: [] },
};

export const ACCESS_LEVELS: Record<AccessLevel, { label: string; description: string }> = {
  full:       { label: 'Полный доступ',  description: 'Все поля, данные и операции без ограничений' },
  specialist: { label: 'Специалисты',    description: 'Видят большинство данных по полям, изменяют только свою область' },
  field:      { label: 'Управление полем', description: 'Назначенные поля и работы: исполнители, статусы, внесение факта' },
  contractor: { label: 'Подрядчики',     description: 'Только назначенные задания и необходимые данные поля' },
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  water: 'Полив',
  fertilizer: 'Удобрение',
  protection: 'Защита растений',
};

export const levelOf = (user: User) => ROLES[user.role].level;

const managesField = (user: User, fieldId: string) =>
  user.assignedFieldIds?.includes(fieldId) ?? false;

export function canViewField(user: User, fieldId: string) {
  const level = levelOf(user);
  if (level === 'full' || level === 'specialist') return true;
  if (level === 'field') return managesField(user, fieldId);
  return false; // подрядчик видит поле только через свои задания
}

export function canViewDashboard(user: User) {
  return levelOf(user) !== 'contractor';
}

export function canViewTask(user: User, task: WateringEvent) {
  if (levelOf(user) === 'contractor') return task.assigneeId === user.id;
  return canViewField(user, task.fieldId);
}

/** Выгрузка данных почвы и ML-предсказаний файлом — специалисты и руководитель */
export function canExportData(user: User) {
  const level = levelOf(user);
  return level === 'full' || level === 'specialist';
}

/** Планирование (создание / изменение нормы, сроков) — только своя область */
export function canPlanTask(user: User, type: TaskType) {
  return ROLES[user.role].domains.includes(type);
}

/** Назначение исполнителя, смена статуса, внесение факта */
export function canOperateTask(user: User, task: WateringEvent) {
  const level = levelOf(user);
  if (level === 'full') return true;
  return level === 'field' && managesField(user, task.fieldId);
}

export function canConfirmTask(user: User, task: WateringEvent) {
  return levelOf(user) === 'contractor' && task.assigneeId === user.id && task.status !== 'completed';
}
