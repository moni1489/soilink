import { useState, useCallback, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authenticate, findAccount } from './accounts';
import type { User } from './roles';
import { AuthContext, useAuth } from './useAuth';

const STORAGE_KEY = 'soilink.session';

function restoreSession(): User | null {
  try {
    return findAccount(localStorage.getItem(STORAGE_KEY) ?? undefined) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreSession);

  const login = useCallback((loginName: string, password: string) => {
    const found = authenticate(loginName, password);
    if (!found) return false;
    try { localStorage.setItem(STORAGE_KEY, found.id); } catch { /* приватный режим */ }
    setUser(found);
    return true;
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* приватный режим */ }
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children, allow }: { children: ReactNode; allow?: (user: User) => boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (allow && !allow(user)) return <Navigate to="/schedule" replace />;
  return <>{children}</>;
}
