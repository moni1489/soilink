export const apiUrl = () => import.meta.env.VITE_API_URL || '';

/** Завершить настоящую сессию (cookie на сервере) и вернуться к экрану входа */
export async function signOut() {
  await fetch(`${apiUrl()}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  window.location.assign('/');
}
