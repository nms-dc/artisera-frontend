import { NextRequest, NextResponse } from 'next/server';
import { endpoints } from '@/core/api/endpoints';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, writeAuthCookies } from '@/server/auth-cookies';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DROP_REQUEST = ['host', 'connection', 'content-length', 'accept-encoding', 'cookie'];
const DROP_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'];

const isSecure = (req: NextRequest) => (req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')) === 'https';

function backendUrl(req: NextRequest) {
  const base = process.env.API_URL?.replace(/\/+$/, '');
  if (!base) return null;
  return `${base}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

const apiPath = (req: NextRequest) => req.nextUrl.pathname.replace(/^\/api/, '');

async function callBackend(url: string, init: { method: string; headers: Headers; body?: ArrayBuffer }) {
  return fetch(url, { ...init, redirect: 'manual', cache: 'no-store' });
}

function relay(upstream: Response) {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.includes(key)) headers.append(key, value);
  });
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

async function refreshTokens(refresh: string) {
  const base = process.env.API_URL!.replace(/\/+$/, '');
  const res = await callBackend(`${base}/api${endpoints.auth.refresh}`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', accept: 'application/json' }),
    body: new TextEncoder().encode(JSON.stringify({ refresh })).buffer as ArrayBuffer,
  });
  if (!res.ok) return null;
  return (await res.json()) as { access?: string; refresh?: string };
}

async function handleLogin(req: NextRequest, url: string) {
  const upstream = await callBackend(url, { method: 'POST', headers: forwardHeaders(req), body: await req.arrayBuffer() });
  if (!upstream.ok) return relay(upstream);
  const tokens = (await upstream.json()) as { access?: string; refresh?: string };
  if (!tokens.access || !tokens.refresh) return NextResponse.json({ detail: 'Login response did not include tokens.' }, { status: 502 });
  const res = NextResponse.json({});
  writeAuthCookies(res.cookies, tokens, isSecure(req));
  return res;
}

async function handleLogout(req: NextRequest, url: string) {
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  if (refresh) {
    const headers = forwardHeaders(req);
    headers.set('content-type', 'application/json');
    if (access) headers.set('authorization', `Bearer ${access}`);
    await callBackend(url, { method: 'POST', headers, body: new TextEncoder().encode(JSON.stringify({ refresh })).buffer as ArrayBuffer }).catch(() => null);
  }
  const res = NextResponse.json({});
  clearAuthCookies(res.cookies, isSecure(req));
  return res;
}

function forwardHeaders(req: NextRequest) {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!DROP_REQUEST.includes(key)) headers.set(key, value);
  });
  return headers;
}

async function proxy(req: NextRequest) {
  const url = backendUrl(req);
  if (!url) return NextResponse.json({ detail: 'API_URL is not configured.' }, { status: 502 });

  try {
    const path = apiPath(req);
    if (path === endpoints.auth.login && req.method === 'POST') return await handleLogin(req, url);
    if (path === endpoints.auth.logout && req.method === 'POST') return await handleLogout(req, url);

    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();
    const headers = forwardHeaders(req);
    const access = req.cookies.get(ACCESS_COOKIE)?.value;
    if (access) headers.set('authorization', `Bearer ${access}`);

    let upstream = await callBackend(url, { method: req.method, headers, body });
    let rotated: { access?: string; refresh?: string } | null = null;

    const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
    if (upstream.status === 401 && refresh) {
      rotated = await refreshTokens(refresh);
      if (rotated?.access) {
        headers.set('authorization', `Bearer ${rotated.access}`);
        upstream = await callBackend(url, { method: req.method, headers, body });
      }
    }

    const res = relay(upstream);
    if (rotated?.access) writeAuthCookies(res.cookies, { access: rotated.access, refresh: rotated.refresh }, isSecure(req));
    else if (upstream.status === 401 && refresh) clearAuthCookies(res.cookies, isSecure(req));
    return res;
  } catch {
    return NextResponse.json({ detail: 'Backend is unreachable.' }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
