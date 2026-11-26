// Test-only stand-in for the Django backend: serves the mock API over HTTP so the production proxy path can be exercised.
import http from 'node:http';
import { mockDispatch } from '@/mocks/server';

const store: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] },
};
(globalThis as any).document = { cookie: '' };

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (ttl: number) => `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + ttl })}.sig`;
let log: string[] = [];

http
  .createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    const u = new URL(req.url ?? '/', 'http://x');
    log.push(`${req.method} ${u.pathname}${req.headers.authorization ? ' [auth]' : ''}`);
    if (u.pathname === '/__log') return void res.end(JSON.stringify(log.splice(0)));
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const url = u.pathname.replace(/^\/api/, '');
    try {
      if (url.endsWith('/auth/refresh/')) return send(200, { access: jwt(300), refresh: jwt(86400) });
      const isAuth = url.includes('/auth/login') || url.includes('/auth/logout');
      if (!isAuth && !req.headers.authorization) return send(401, { detail: 'Authentication credentials were not provided.' });
      const params = Object.fromEntries(u.searchParams.entries());
      const data = raw && (req.headers['content-type'] ?? '').includes('json') ? JSON.parse(raw) : undefined;
      const out = await mockDispatch({ url, method: req.method ?? 'GET', data, params });
      if (url.includes('/auth/login')) return send(200, { access: jwt(300), refresh: jwt(86400) });
      if (typeof out === 'string') {
        res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="export.csv"' });
        return void res.end(out);
      }
      return send(200, out ?? {});
    } catch (e: any) {
      send(e.response?.status ?? 500, e.response?.data ?? { detail: String(e) });
    }
  })
  .listen(4000, () => console.log('fake backend on :4000'));
