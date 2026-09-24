import type { User } from './roles';

// Демо-аккаунты. Проверка пароля на клиенте — только для прототипа;
// в проде аутентификация и проверка прав должны выполняться на бэкенде.
export const DEMO_PASSWORD = 'soilink';

export const accounts: User[] = [
  { id: 'u-director',   login: 'director',   name: 'Нурлан Ахметов',    role: 'director',              email: 'director@soilink.kz',   phone: '+7 (705) 100-00-01' },
  { id: 'u-protection', login: 'protection', name: 'Айгерим Садыкова',  role: 'protection_agronomist', email: 'protection@soilink.kz', phone: '+7 (705) 100-00-02' },
  { id: 'u-irrigation', login: 'irrigation', name: 'Дмитрий Ковалёв',   role: 'irrigation_specialist', email: 'irrigation@soilink.kz', phone: '+7 (705) 100-00-03' },
  { id: 'u-agrochem',   login: 'agrochem',   name: 'Мария Ким',         role: 'agrochemist',           email: 'agrochem@soilink.kz',   phone: '+7 (705) 100-00-04' },
  { id: 'u-field',      login: 'field',      name: 'Алексей Никитин',   role: 'field_agronomist',      email: 'field@soilink.kz',      phone: '+7 (705) 100-00-05', assignedFieldIds: ['f-1'] },
  { id: 'u-dispatcher', login: 'dispatcher', name: 'Иван Кузнецов',     role: 'dispatcher',            email: 'dispatch@soilink.kz',   phone: '+7 (705) 100-00-06', assignedFieldIds: ['f-1', 'f-2'] },
  { id: 'u-contractor', login: 'contractor', name: 'Бекзат Омаров',     role: 'contractor',            email: 'agroservis@mail.kz',    phone: '+7 (705) 100-00-07', company: 'ТОО «АгроСервис ВКО»' },
  { id: 'u-contractor2', login: 'contractor2', name: 'Сергей Петров',   role: 'contractor',            email: 'petrov@mail.kz',        phone: '+7 (705) 100-00-08', company: 'ИП Петров' },
];

export const contractors = accounts.filter(a => a.role === 'contractor');

export function authenticate(login: string, password: string): User | null {
  const user = accounts.find(a => a.login === login.trim().toLowerCase());
  return user && password === DEMO_PASSWORD ? user : null;
}

export const findAccount = (id: string | undefined) => accounts.find(a => a.id === id);

export const initials = (name: string) =>
  name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
