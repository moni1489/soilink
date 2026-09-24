import { createContext, useContext } from 'react';
import type { User } from './roles';

export interface AuthState {
  user: User | null;
  login: (login: string, password: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Текущий пользователь внутри защищённых маршрутов */
export function useUser() {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called without an authenticated user');
  return user;
}
