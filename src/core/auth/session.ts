import type { User } from '@/lib/types';

export type SessionUser = User;
const USER_KEY = 'artisera_user';

export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}
export function setSession(user: SessionUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
}

const LOGOUT_KEY = 'artisera_logged_out';
/** Remember that the user signed out on purpose, so the login page does not send the next user back to this user's page. */
export function markLoggedOut() {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(LOGOUT_KEY, '1');
}
export function wasLoggedOut() {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(LOGOUT_KEY) === '1';
}
export function clearLoggedOut() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(LOGOUT_KEY);
}
