import type { User } from './roles';

// Демо-аккаунты. Проверка пароля на клиенте — только для прототипа;
// в проде аутентификация и проверка прав должны выполняться на бэкенде.
export const DEMO_PASSWORD = 'soilink';

export const accounts: User[] = [
  { id: 'u-director',   login: 'director',   nameKey: 'data.accounts.u-director',   role: 'director',              email: 'director@soilink.kz',   phone: '+7 (705) 100-00-01' },
  { id: 'u-protection', login: 'protection', nameKey: 'data.accounts.u-protection', role: 'protection_agronomist', email: 'protection@soilink.kz', phone: '+7 (705) 100-00-02' },
  { id: 'u-irrigation', login: 'irrigation', nameKey: 'data.accounts.u-irrigation', role: 'irrigation_specialist', email: 'irrigation@soilink.kz', phone: '+7 (705) 100-00-03' },
  { id: 'u-agrochem',   login: 'agrochem',   nameKey: 'data.accounts.u-agrochem',   role: 'agrochemist',           email: 'agrochem@soilink.kz',   phone: '+7 (705) 100-00-04' },
  { id: 'u-field',      login: 'field',      nameKey: 'data.accounts.u-field',      role: 'field_agronomist',      email: 'field@soilink.kz',      phone: '+7 (705) 100-00-05', assignedFieldIds: ['f-1'] },
  { id: 'u-dispatcher', login: 'dispatcher', nameKey: 'data.accounts.u-dispatcher', role: 'dispatcher',            email: 'dispatch@soilink.kz',   phone: '+7 (705) 100-00-06', assignedFieldIds: ['f-1', 'f-2'] },
  { id: 'u-contractor', login: 'contractor', nameKey: 'data.accounts.u-contractor', role: 'contractor',            email: 'agroservis@mail.kz',    phone: '+7 (705) 100-00-07', companyKey: 'data.companies.u-contractor' },
  { id: 'u-contractor2', login: 'contractor2', nameKey: 'data.accounts.u-contractor2', role: 'contractor',         email: 'petrov@mail.kz',        phone: '+7 (705) 100-00-08', companyKey: 'data.companies.u-contractor2' },
];

export const contractors = accounts.filter(a => a.role === 'contractor');

export function authenticate(login: string, password: string): User | null {
  const user = accounts.find(a => a.login === login.trim().toLowerCase());
  return user && password === DEMO_PASSWORD ? user : null;
}

export const findAccount = (id: string | undefined) => accounts.find(a => a.id === id);

export const initials = (name: string) =>
  name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
