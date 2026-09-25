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
  /** Ключ перевода имени — в UI разворачивается через t() */
  nameKey: string;
  role: Role;
  email: string;
  phone: string;
  /** Поля, за которые отвечает агроном поля / диспетчер */
  assignedFieldIds?: string[];
  /** Для подрядчика — ключ перевода названия организации */
  companyKey?: string;
}

export const ROLES: Record<Role, { labelKey: string; level: AccessLevel; domains: TaskType[] }> = {
  director:              { labelKey: 'roles.director',              level: 'full',       domains: ['water', 'fertilizer', 'protection'] },
  protection_agronomist: { labelKey: 'roles.protection_agronomist', level: 'specialist', domains: ['protection'] },
  irrigation_specialist: { labelKey: 'roles.irrigation_specialist', level: 'specialist', domains: ['water'] },
  agrochemist:           { labelKey: 'roles.agrochemist',           level: 'specialist', domains: ['fertilizer'] },
  field_agronomist:      { labelKey: 'roles.field_agronomist',      level: 'field',      domains: [] },
  dispatcher:            { labelKey: 'roles.dispatcher',            level: 'field',      domains: [] },
  contractor:            { labelKey: 'roles.contractor',            level: 'contractor', domains: [] },
};

export const ACCESS_LEVELS: Record<AccessLevel, { labelKey: string; descriptionKey: string }> = {
  full:       { labelKey: 'access.full.label',       descriptionKey: 'access.full.description' },
  specialist: { labelKey: 'access.specialist.label', descriptionKey: 'access.specialist.description' },
  field:      { labelKey: 'access.field.label',      descriptionKey: 'access.field.description' },
  contractor: { labelKey: 'access.contractor.label', descriptionKey: 'access.contractor.description' },
};

export const TASK_TYPE_KEYS: Record<TaskType, string> = {
  water: 'taskType.water',
  fertilizer: 'taskType.fertilizer',
  protection: 'taskType.protection',
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
