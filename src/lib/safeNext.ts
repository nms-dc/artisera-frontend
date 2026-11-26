/** Only allow same-site relative paths as a post-login destination (blocks open redirects such as ?next=https://evil.com). */
export function safeNext(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value === '/login' || value.startsWith('/login?')) return fallback;
  return value;
}
