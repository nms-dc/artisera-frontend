export const ACCESS_COOKIE = 'artisera_access';
export const REFRESH_COOKIE = 'artisera_refresh';

type TokenPair = { access?: string; refresh?: string };
type CookieJar = { set: (name: string, value: string, options: Record<string, unknown>) => void };

function secondsUntilExpiry(jwt: string, fallback: number): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    if (typeof payload.exp === 'number') return Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    return fallback;
  }
  return fallback;
}

export function writeAuthCookies(jar: CookieJar, tokens: TokenPair, secure: boolean) {
  const base = { httpOnly: true, sameSite: 'lax', secure, path: '/' } as const;
  if (tokens.access) jar.set(ACCESS_COOKIE, tokens.access, { ...base, maxAge: secondsUntilExpiry(tokens.access, 300) });
  if (tokens.refresh) jar.set(REFRESH_COOKIE, tokens.refresh, { ...base, maxAge: secondsUntilExpiry(tokens.refresh, 7 * 24 * 3600) });
}

export function clearAuthCookies(jar: CookieJar, secure: boolean) {
  const base = { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 } as const;
  jar.set(ACCESS_COOKIE, '', base);
  jar.set(REFRESH_COOKIE, '', base);
}
