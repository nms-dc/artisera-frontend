import { v4 as uuid } from './uuid';
import { users } from './seed';
import type { AppNotification, Paginated, PermissionAction, PermissionModule, Permissions, User, UserSummary } from '@/lib/types';
import { GALLERY_ROLE } from '@/lib/constants';

export const nowIso = () => new Date().toISOString();

export function fail(status: number, body: string | Record<string, string[]>): never {
  const e: any = new Error(typeof body === 'string' ? body : 'Validation error');
  e.response = { status, data: typeof body === 'string' ? { detail: body } : body };
  throw e;
}
export function match(url: string, pattern: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = url.split('?')[0].split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) out[a[i].slice(1)] = b[i];
    else if (a[i] !== b[i]) return null;
  }
  return out;
}

export const EMPTY_PERMISSIONS: Permissions = {
  inquiries: {},
  customers: {},
  masters: {},
  reports: {},
  users: {},
  sales: {},
  orders: {},
  shipments: {},
  certificates: {},
};

export const isAdmin = (u: User) => u.role === 'ADMIN';
export const requireAdmin = (u: User) => {
  if (!isAdmin(u)) fail(403, 'Admin only.');
};
export const can = (u: User, m: PermissionModule, a: PermissionAction) => Boolean(u.permissions?.[m]?.[a]);
export const need = (u: User, m: PermissionModule, a: PermissionAction) => {
  if (!can(u, m, a)) fail(403, 'You do not have permission to do this.');
};
export const requireRm = (u: User) => {
  if (isAdmin(u)) fail(403, 'Relationship Manager only.');
};
export const summary = (id: string | null | undefined): UserSummary | null => {
  const x = users.find((r) => r.id === id);
  return x ? { id: x.id, name: x.name } : null;
};
export const nameOf = (id: string | null | undefined) => users.find((x) => x.id === id)?.name ?? 'Someone';
export const adminIds = () => users.filter((x) => x.roleId === 'ADMIN' && x.status === 'Active').map((x) => x.id);

export function paginate<T>(rows: T[], p: Record<string, any> = {}): Paginated<T> {
  const pageSize = Math.min(Math.max(Number(p.pageSize) || 10, 1), 100);
  const page = Math.max(Number(p.page) || 1, 1);
  return { count: rows.length, page, pageSize, results: rows.slice((page - 1) * pageSize, page * pageSize) };
}
export const has = (q: string | undefined, ...f: (string | null | undefined)[]) => {
  const n = (q ?? '').trim().toLowerCase();
  return !n || f.some((x) => (x ?? '').toLowerCase().includes(n));
};
export const sortBy = <T>(rows: T[], key: (r: T) => string | number, dir: 1 | -1 = 1) => [...rows].sort((a, b) => (key(a) < key(b) ? -dir : key(a) > key(b) ? dir : 0));
export const normPhone = (p: string) => p.replace(/\D/g, '').slice(-10);
export const nextCode = (prefix: string, width: number, list: { code: string }[]) =>
  `${prefix}-${String(list.reduce((m, x) => Math.max(m, parseInt(x.code.split('-')[1], 10) || 0), 0) + 1).padStart(width, '0')}`;
export const needFields = (o: Record<string, any>, fields: string[]) => {
  const errs: Record<string, string[]> = {};
  fields.forEach((f) => {
    if (o[f] === undefined || o[f] === null || o[f] === '') errs[f] = ['This field is required.'];
  });
  if (Object.keys(errs).length) fail(400, errs);
};

export type RawNote = AppNotification & { userId: string };
export const eventNotes: RawNote[] = [];
export const readIds = new Set<string>();
export function notify(
  to: (string | null | undefined)[],
  actorId: string,
  type: AppNotification['type'],
  title: string,
  body: string,
  ref: { inquiryId?: string; customerId?: string; saleId?: string; orderId?: string; tab?: string },
) {
  new Set(to.filter((x): x is string => !!x && x !== actorId)).forEach((userId) =>
    eventNotes.push({
      id: `evt:${uuid()}`,
      userId,
      type,
      title,
      body,
      inquiryId: ref.inquiryId ?? null,
      customerId: ref.customerId ?? null,
      saleId: ref.saleId ?? null,
      orderId: ref.orderId ?? null,
      tab: ref.tab ?? null,
      read: false,
      createdAt: nowIso(),
    }),
  );
}

export const galleryIds = () => users.filter((x) => x.roleId === GALLERY_ROLE && x.status === 'Active').map((x) => x.id);
export const isGallery = (u: User) => u.role === GALLERY_ROLE;
