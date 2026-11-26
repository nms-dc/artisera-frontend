import { addDays, endOfDay, format, isAfter, isBefore, parseISO, startOfDay, startOfWeek, subDays, subHours } from 'date-fns';
import { v4 as uuid } from './uuid';
import {
  EMPTY_PERMISSIONS,
  adminIds,
  can,
  eventNotes,
  fail,
  has,
  isAdmin,
  match,
  need,
  nameOf,
  needFields,
  nextCode,
  normPhone,
  notify,
  nowIso,
  paginate,
  readIds,
  requireAdmin,
  requireRm,
  sortBy,
  summary,
} from './helpers';
import { activities, artists, categories, customers, inquiries, roles, sales, subcategories, users } from './seed';
import { NOT_HANDLED, createSaleFromInquiry, galleryRoutes, serSaleSummary } from './gallery';
import type { RawCustomer, RawInquiry, RawUser } from './db';
import type {
  AdminDashboard,
  AppNotification,
  Customer,
  CustomerSale,
  CustomerType,
  Inquiry,
  InquiryCounts,
  Priority,
  InquirySummaryReport,
  MoveTo,
  NotificationsResponse,
  RmDashboard,
  RoleRecord,
  User,
  UserRecord,
} from '@/lib/types';
import { INQUIRY_TYPES, SOURCES, STATUSES } from '@/lib/constants';

type Req = { url: string; method: string; data?: any; params?: Record<string, any> };
const delay = (ms = 30) => new Promise((r) => setTimeout(r, ms));

const SESSION_KEY = 'mock_user_id';
const toUser = (x: RawUser): User => ({
  id: x.id,
  name: x.name,
  email: x.email,
  role: x.roleId,
  permissions: roles.find((r) => r.id === x.roleId)?.permissions ?? EMPTY_PERMISSIONS,
});
function me(): User {
  const id = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
  const x = users.find((r) => r.id === id && r.status === 'Active');
  if (!x) fail(401, 'Authentication required.');
  return toUser(x);
}

function derivedType(c: RawCustomer, inquiryCount: number): CustomerType {
  if (c.customerType === 'Client') return sales.filter((s) => s.customerId === c.id).length > 1 ? 'Repeat Client' : 'Client';
  return inquiryCount > 1 ? 'Repeat Prospect' : 'Prospect';
}
function serCustomer(c: RawCustomer): Customer {
  const mine = inquiries.filter((i) => i.customerId === c.id);
  const orig = inquiries.find((i) => i.id === c.originalInquiryId);
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    phone: c.phone,
    altPhone: c.altPhone ?? null,
    email: c.email ?? null,
    location: c.location ?? null,
    state: c.state ?? null,
    address1: c.address1 ?? null,
    address2: c.address2 ?? null,
    pin: c.pin ?? null,
    country: c.country ?? null,
    customerType: derivedType(c, mine.length),
    repeatProspect: mine.length > 1,
    customerSince: c.customerSince,
    status: c.status,
    source: c.source,
    originalInquiry: orig ? { id: orig.id, code: orig.code } : null,
    rm: summary(c.rmId),
    notes: c.notes ?? null,
    createdAt: c.createdAt,
    totalInquiries: mine.length,
    openInquiries: mine.filter(isOpen).length,
    wonInquiries: mine.filter((i) => i.status === 'Won').length,
    totalValue: mine.reduce((a, b) => a + b.value, 0),
    lastActivityAt:
      mine
        .map((i) => i.updatedAt)
        .sort()
        .pop() ?? null,
  };
}
function serInquiry(i: RawInquiry): Inquiry {
  const c = customers.find((x) => x.id === i.customerId)!;
  const cat = i.categoryId ? categories.find((x) => x.id === i.categoryId) : undefined;
  const sub = i.subcategoryId ? subcategories.find((x) => x.id === i.subcategoryId) : undefined;
  const art = artists.find((x) => x.id === i.artistId);
  const sale = sales.find((x) => x.inquiryId === i.id);
  return {
    id: i.id,
    code: i.code,
    customer: {
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      email: c.email ?? null,
      location: c.location ?? null,
      state: c.state ?? null,
      address1: c.address1 ?? null,
      address2: c.address2 ?? null,
      pin: c.pin ?? null,
      country: c.country ?? null,
    },
    inquiryType: i.inquiryType,
    requirement: i.requirement,
    quantity: i.quantity,
    value: i.value,
    category: cat ? { id: cat.id, name: cat.name } : null,
    subcategory: sub ? { id: sub.id, name: sub.name } : null,
    artist: art ? { id: art.id, name: art.name } : null,
    source: i.source,
    priority: i.priority,
    status: i.status,
    rm: summary(i.rmId),
    assignedOn: i.assignedOn,
    nextFollowUp: i.nextFollowUp,
    nextAction: i.nextAction ?? null,
    lastContact: i.lastContact,
    closedAt: i.closedAt,
    notes: i.notes ?? null,
    expectedTimeline: i.expectedTimeline ?? null,
    repeatProspect: inquiries.some((x) => x.customerId === i.customerId && x.createdAt < i.createdAt),
    sale: sale ? serSaleSummary(sale) : null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}
const serSub = (s: any) => ({ ...s, categoryName: categories.find((c) => c.id === s.categoryId)?.name ?? '' });
const serArtist = (a: any) => ({
  id: a.id,
  name: a.name,
  categoryId: a.categoryId ?? null,
  categoryName: categories.find((c) => c.id === a.categoryId)?.name ?? null,
  subcategoryId: a.subcategoryId ?? null,
  subcategoryName: subcategories.find((c) => c.id === a.subcategoryId)?.name ?? null,
});
const serUser = (x: RawUser): UserRecord => ({
  id: x.id,
  name: x.name,
  email: x.email,
  phone: x.phone,
  roleId: x.roleId,
  roleName: roles.find((r) => r.id === x.roleId)?.name ?? '',
  status: x.status,
  notes: x.notes ?? null,
});
const serRole = (r: (typeof roles)[number]): RoleRecord => ({ ...r, usersCount: users.filter((x) => x.roleId === r.id).length });

const isOpen = (i: RawInquiry) => i.status !== 'Won' && i.status !== 'Lost';
const endToday = () => endOfDay(new Date());
const dueByToday = (i: RawInquiry) => !!i.nextFollowUp && !isAfter(parseISO(i.nextFollowUp), endToday());
const tabOfStatus = (s: string) =>
  ({ Touchbase: 'touchbase', 'Touchbase Follow-up': 'followup', 'Active Conversations': 'active', Nurture: 'nurture', Won: 'won', Lost: 'lost' })[s] ?? 'touchbase';
const scoped = (u: User) => (isAdmin(u) ? [...inquiries] : inquiries.filter((i) => i.rmId === u.id));

function byTab(rows: RawInquiry[], tab?: string) {
  switch (tab) {
    case 'unassigned':
      return rows.filter((i) => !i.rmId && isOpen(i));
    case 'assigned':
      return rows.filter((i) => !!i.rmId);
    case 'touchbase':
      return rows.filter((i) => i.status === 'Touchbase');
    case 'followup':
      return rows.filter((i) => i.status === 'Touchbase Follow-up');
    case 'active':
      return rows.filter((i) => i.status === 'Active Conversations');
    case 'nurture':
      return rows.filter((i) => i.status === 'Nurture');
    case 'won':
      return rows.filter((i) => i.status === 'Won');
    case 'lost':
      return rows.filter((i) => i.status === 'Lost');
    case 'today':
      return rows.filter(
        (i) => i.status === 'Touchbase' || ((i.status === 'Touchbase Follow-up' || i.status === 'Active Conversations' || i.status === 'Nurture') && dueByToday(i)),
      );
    default:
      return rows;
  }
}
function inRange(iso: string | null, range?: string) {
  if (!iso) return false;
  if (!range || range === 'all') return true;
  const d = parseISO(iso);
  return range === 'today' ? !isBefore(d, startOfDay(new Date())) : isAfter(d, subDays(new Date(), Number(range)));
}
function listInquiries(u: User, p: Record<string, any>) {
  need(u, 'inquiries', 'view');
  if (p.rmId && !isAdmin(u) && p.rmId !== u.id) fail(403, 'You can only view your own inquiries.');
  let rows = byTab(scoped(u), p.tab);
  if (p.q)
    rows = rows.filter((i) => {
      const c = customers.find((x) => x.id === i.customerId)!;
      return has(p.q, i.code, c.name, c.phone, c.email, i.requirement);
    });
  if (isAdmin(u) && p.rmId) rows = rows.filter((i) => i.rmId === p.rmId);
  if (p.customerId) rows = rows.filter((i) => i.customerId === p.customerId);
  if (p.priority) rows = rows.filter((i) => i.priority === p.priority);
  if (p.source) rows = rows.filter((i) => i.source === p.source);
  if (p.valueBand === 'lt1') rows = rows.filter((i) => i.value < 100000);
  if (p.valueBand === '1to5') rows = rows.filter((i) => i.value >= 100000 && i.value <= 500000);
  if (p.valueBand === 'gt5') rows = rows.filter((i) => i.value > 500000);
  if (p.status) rows = rows.filter((i) => i.status === p.status);
  if (p.dateRange) rows = rows.filter((i) => inRange(i.createdAt, p.dateRange));
  const scheduled = p.tab === 'followup' || p.tab === 'active' || p.tab === 'today';
  const ord: string = p.ordering || (scheduled ? 'nextFollowUp' : '-createdAt');
  const dir = ord.startsWith('-') ? -1 : 1;
  const field = ord.replace('-', '') as 'createdAt' | 'nextFollowUp' | 'value' | 'priority' | 'source';
  const sortKey = (r: RawInquiry): string | number => {
    if (field === 'nextFollowUp') return r.nextFollowUp ?? r.assignedOn ?? '';
    if (field === 'priority') return r.priority === 'High' ? 1 : 0; // descending = High first
    if (field === 'source') return r.source.toLowerCase();
    return (r as any)[field];
  };
  const sorted = sortBy(rows, sortKey, dir as 1 | -1);
  if (p.tab === 'today' && !p.ordering) {
    const rank: Record<string, number> = { High: 0, Normal: 1 };
    const when = (i: RawInquiry) => parseISO(i.nextFollowUp ?? i.assignedOn ?? i.createdAt);
    const late = (i: RawInquiry) => (isBefore(when(i), startOfDay(new Date())) ? 0 : 1);
    const hour = (i: RawInquiry) => Math.floor(when(i).getTime() / 3600000);
    return [...rows].sort((a, b) => late(a) - late(b) || hour(a) - hour(b) || rank[a.priority] - rank[b.priority] || b.value - a.value);
  }
  return sorted;
}
function getInquiry(u: User, id: string) {
  need(u, 'inquiries', 'view');
  const i = inquiries.find((x) => x.id === id);
  if (!i) fail(404, 'Inquiry not found.');
  if (!isAdmin(u) && i.rmId !== u.id) fail(403, 'This inquiry is not assigned to you.');
  return i;
}
function ownInquiry(u: User, id: string) {
  requireRm(u);
  return getInquiry(u, id);
}
type ActIn = { inquiryId: string; kind: any; method?: any; text: string; nextFollowUp?: string | null; byId: string; at?: string };
const addActivity = (a: ActIn) => {
  activities.push({ id: uuid(), at: a.at ?? nowIso(), ...a });
};
/** History line for a recorded interaction: the notes, plus the status move and its remark when one was chosen. */
const interactionText = (kind: string, method: string, notes?: string, moveTo?: string, remark?: string) => {
  const note = notes?.trim();
  const reason = remark?.trim();
  let text = `${kind} via ${method}`;
  if (note) text += `: ${note}`;
  if (moveTo) text += ` · moved to ${moveTo}${reason ? `: ${reason}` : ''}`;
  return note || moveTo ? text : `${text}.`;
};
const actOut = (a: (typeof activities)[number]) => ({
  id: a.id,
  inquiryId: a.inquiryId,
  kind: a.kind,
  method: a.method ?? null,
  text: a.text,
  nextFollowUp: a.nextFollowUp ?? null,
  by: summary(a.byId),
  at: a.at,
});

function buildNotifications(u: User): AppNotification[] {
  const out: AppNotification[] = eventNotes.filter((n) => n.userId === u.id).map(({ userId: _userId, ...n }) => n);
  const push = (type: AppNotification['type'], i: RawInquiry, title: string, body: string, createdAt: string, tab: string | null) =>
    out.push({
      id: `${type}:${i.id}`,
      type,
      title,
      body,
      inquiryId: i.id,
      customerId: null,
      saleId: null,
      orderId: null,
      tab,
      read: readIds.has(`${u.id}:${type}:${i.id}`),
      createdAt,
    });
  if (isAdmin(u)) {
    inquiries.filter((i) => !i.rmId && isOpen(i)).forEach((i) => push('UNASSIGNED_INQUIRY', i, 'Unassigned inquiry', `${i.code} is waiting for an RM.`, i.createdAt, 'unassigned'));
  } else {
    inquiries
      .filter((i) => i.rmId === u.id && (i.status === 'Touchbase Follow-up' || i.status === 'Active Conversations' || i.status === 'Nurture') && i.nextFollowUp)
      .forEach((i) => {
        const d = parseISO(i.nextFollowUp!);
        if (isBefore(d, startOfDay(new Date())))
          push('FOLLOWUP_OVERDUE', i, 'Follow-up overdue', `${i.code} was due ${format(d, 'dd-MMM-yyyy')}.`, i.nextFollowUp!, tabOfStatus(i.status));
        else if (dueByToday(i)) push('FOLLOWUP_DUE', i, 'Follow-up due today', `${i.code} is due at ${format(d, 'hh:mm a')}.`, i.nextFollowUp!, tabOfStatus(i.status));
      });
  }
  return sortBy(out, (n) => n.createdAt, -1).slice(0, 30);
}

function convertCustomer(i: RawInquiry) {
  const c = customers.find((x) => x.id === i.customerId);
  if (c && c.customerType !== 'Client') {
    c.customerType = 'Client';
    c.customerSince = nowIso();
  }
}
function applyStatus(i: RawInquiry, status: string, actor: User, notes?: string, closedOn?: string) {
  i.status = status as RawInquiry['status'];
  i.updatedAt = nowIso();
  if (status === 'Won' || status === 'Lost') {
    i.closedAt = closedOn ? parseISO(closedOn).toISOString() : nowIso();
    i.nextFollowUp = null;
  }
  if (status === 'Won') convertCustomer(i);
  addActivity({ inquiryId: i.id, kind: 'Status', text: `Moved to ${status}.${notes ? ' ' + notes : ''}`, byId: actor.id });
  const body = `${i.code} was moved to ${status} by ${actor.name}.`;
  notify(isAdmin(actor) ? [i.rmId] : adminIds(), actor.id, 'STATUS_CHANGED', `Inquiry ${status}`, body, { inquiryId: i.id, tab: tabOfStatus(status) });
}
const MOVES: Record<string, MoveTo[]> = {
  'Touchbase Follow-up': ['Active Conversations', 'Nurture', 'Lost'],
  'Active Conversations': ['Nurture', 'Lost'],
  Nurture: ['Active Conversations'],
};

function checkArtistLinks(d: { categoryId?: string | null; subcategoryId?: string | null }) {
  if (!d.subcategoryId) return;
  const sub = subcategories.find((x) => x.id === d.subcategoryId);
  if (!sub) fail(400, { subcategoryId: ['Subcategory does not exist.'] });
  if (d.categoryId && sub.categoryId !== d.categoryId) fail(400, { subcategoryId: ['Subcategory does not belong to the selected category.'] });
}

function reportRows(u: User, p: Record<string, any>) {
  need(u, 'inquiries', 'view');
  if (p.rmId && !isAdmin(u) && p.rmId !== u.id) fail(403, 'You can only view your own data.');
  return scoped(u).filter((i) => {
    const d = parseISO(i.createdAt);
    if (p.from && isBefore(d, startOfDay(parseISO(p.from)))) return false;
    if (p.to && isAfter(d, endOfDay(parseISO(p.to)))) return false;
    if (p.rmId && isAdmin(u) && i.rmId !== p.rmId) return false;
    if (p.categoryId && i.categoryId !== p.categoryId) return false;
    if (p.subcategoryId && i.subcategoryId !== p.subcategoryId) return false;
    if (p.status && i.status !== p.status) return false;
    return true;
  });
}

export async function mockDispatch({ url, method, data, params = {} }: Req): Promise<any> {
  await delay();
  const m = method.toUpperCase();
  url = url.replace(/^\/v1/, '');
  let p: Record<string, string> | null;

  if (match(url, '/account/auth/login') && m === 'POST') {
    needFields(data ?? {}, ['email', 'password']);
    const x = users.find((r) => r.email.toLowerCase() === String(data.email).toLowerCase() && r.status === 'Active');
    if (!x) fail(401, 'Invalid email or password.');
    window.localStorage.setItem(SESSION_KEY, x.id);
    return { access: 'mock-access-token', refresh: 'mock-refresh-token' };
  }
  if (match(url, '/account/auth/logout') && m === 'POST') {
    window.localStorage.removeItem(SESSION_KEY);
    return {};
  }
  if (match(url, '/account/auth/change-password') && m === 'POST') {
    needFields(data ?? {}, ['email', 'currentPassword', 'newPassword', 'confirmPassword']);
    if (data.newPassword !== data.confirmPassword) fail(400, { confirmPassword: ['Passwords do not match.'] });
    if (data.newPassword === data.currentPassword) fail(400, { newPassword: ['New password must be different from the current one.'] });
    return { detail: 'Password changed successfully.' };
  }
  if (match(url, '/account/auth/me') && m === 'GET') return me();

  const u = me();

  const handled = await galleryRoutes(u, m, url, data, params);
  if (handled !== NOT_HANDLED) return handled;

  if (match(url, '/account/users/options') && m === 'GET') {
    return users.filter((x) => x.status === 'Active' && (!params.role || x.roleId === params.role)).map((x) => ({ id: x.id, name: x.name }));
  }
  if (match(url, '/account/users') && m === 'GET') {
    need(u, 'users', 'view');
    const rows = users.filter((x) => has(params.q, x.name, x.email, x.phone) && (!params.role || x.roleId === params.role) && (!params.status || x.status === params.status));
    return paginate(rows.map(serUser), params);
  }
  if (match(url, '/account/users') && m === 'POST') {
    need(u, 'users', 'create');
    needFields(data, ['name', 'email', 'phone', 'roleId']);
    if (users.some((x) => x.email.toLowerCase() === String(data.email).toLowerCase())) fail(400, { email: ['A user with this email already exists.'] });
    if (!roles.some((r) => r.id === data.roleId)) fail(400, { roleId: ['Role does not exist.'] });
    const rec: RawUser = { id: uuid(), status: 'Active', ...data };
    users.push(rec);
    return serUser(rec);
  }
  if ((p = match(url, '/account/users/:id')) && m === 'GET') {
    need(u, 'users', 'view');
    const x = users.find((r) => r.id === p!.id);
    if (!x) fail(404, 'User not found.');
    return serUser(x);
  }
  if ((p = match(url, '/account/users/:id')) && m === 'PATCH') {
    need(u, 'users', 'edit');
    const x = users.find((r) => r.id === p!.id);
    if (!x) fail(404, 'User not found.');
    if (data.email && users.some((r) => r.id !== x.id && r.email.toLowerCase() === String(data.email).toLowerCase()))
      fail(400, { email: ['A user with this email already exists.'] });
    if (x.id === u.id && data.status === 'Inactive') fail(400, { status: ['You cannot deactivate yourself.'] });
    Object.assign(x, data);
    return serUser(x);
  }

  if (match(url, '/account/roles/options') && m === 'GET') return roles.filter((r) => r.status === 'Active').map((r) => ({ id: r.id, name: r.name }));
  if (match(url, '/account/roles') && m === 'GET') {
    need(u, 'users', 'view');
    return paginate(roles.filter((r) => has(params.q, r.name, r.description) && (!params.status || r.status === params.status)).map(serRole), params);
  }
  if (match(url, '/account/roles') && m === 'POST') {
    need(u, 'users', 'create');
    needFields(data, ['name', 'description']);
    if (roles.some((r) => r.name.toLowerCase() === String(data.name).toLowerCase())) fail(400, { name: ['This role already exists.'] });
    const rec = { id: uuid(), status: 'Active' as const, permissions: EMPTY_PERMISSIONS, ...data };
    roles.push(rec);
    return serRole(rec);
  }
  if ((p = match(url, '/account/roles/:id')) && m === 'GET') {
    need(u, 'users', 'view');
    const r = roles.find((x) => x.id === p!.id);
    if (!r) fail(404, 'Role not found.');
    return serRole(r);
  }
  if ((p = match(url, '/account/roles/:id')) && m === 'PATCH') {
    need(u, 'users', 'edit');
    const r = roles.find((x) => x.id === p!.id);
    if (!r) fail(404, 'Role not found.');
    if (r.id === 'ADMIN' && data.status === 'Inactive') fail(400, { status: ['The Admin role cannot be deactivated.'] });
    Object.assign(r, data);
    return serRole(r);
  }

  if (match(url, '/crm/inquiries') && m === 'GET') return paginate(listInquiries(u, params).map(serInquiry), params);
  if (match(url, '/crm/inquiries/counts') && m === 'GET') {
    need(u, 'inquiries', 'view');
    if (params.rmId && !isAdmin(u) && params.rmId !== u.id) fail(403, 'You can only view your own inquiries.');
    const s = isAdmin(u) && params.rmId ? inquiries.filter((i) => i.rmId === params.rmId) : scoped(u);
    const c = (t: string) => byTab(s, t).length;
    const res: InquiryCounts = {
      all: s.length,
      unassigned: c('unassigned'),
      assigned: c('assigned'),
      today: c('today'),
      touchbase: c('touchbase'),
      followup: c('followup'),
      active: c('active'),
      nurture: c('nurture'),
      won: c('won'),
      lost: c('lost'),
    };
    return res;
  }
  if (match(url, '/crm/inquiries/bulk') && m === 'POST') {
    // Admin may run any bulk action; an RM may only reassign their own Nurture inquiries.
    const rmReassign = !isAdmin(u) && u.role === 'RM' && data.action === 'reassign';
    if (!rmReassign) {
      requireAdmin(u);
      need(u, 'inquiries', 'assignRm');
    }
    const ids: string[] = Array.isArray(data.ids) ? data.ids : [];
    if (!ids.length) fail(400, { ids: ['Select at least one inquiry.'] });
    if (!['reassign', 'lost', 'snooze'].includes(data.action)) fail(400, { action: ['Invalid action.'] });
    const rmUser = users.find((x) => x.id === data.rmId);
    if (data.action === 'reassign' && (!rmUser || rmUser.roleId !== 'RM' || rmUser.status !== 'Active')) fail(400, { rmId: ['Select an active Relationship Manager.'] });
    if (data.action === 'lost' && !String(data.remark ?? '').trim()) fail(400, { remark: ['Reason for closing is required.'] });
    if (data.action === 'snooze' && (!data.nextFollowUp || isBefore(parseISO(data.nextFollowUp), startOfDay(new Date()))))
      fail(400, { nextFollowUp: ['Choose a date today or later.'] });
    const targets = ids.map((id) => inquiries.find((x) => x.id === id));
    if (targets.some((i) => !i)) fail(404, 'Inquiry not found.');
    // Admin can assign/reassign any open inquiry; snooze, close and every RM action stay Nurture-only.
    const nurtureOnly = data.action !== 'reassign' || rmReassign;
    if (nurtureOnly && targets.some((i) => i!.status !== 'Nurture')) fail(409, 'Bulk actions apply to Nurture inquiries only.');
    if (!nurtureOnly && targets.some((i) => i!.status === 'Won' || i!.status === 'Lost')) fail(409, 'Won or closed inquiries cannot be reassigned.');
    if (rmReassign && targets.some((i) => i!.rmId !== u.id)) fail(403, 'You can only reassign your own inquiries.');
    // All rows are validated above, so the change is all-or-nothing.
    (targets as RawInquiry[]).forEach((i) => {
      if (data.action === 'reassign' && rmUser) {
        const prev = i.rmId;
        i.rmId = rmUser.id;
        i.assignedOn = nowIso();
        i.updatedAt = nowIso();
        addActivity({ inquiryId: i.id, kind: 'Reassigned', text: `Reassigned to ${rmUser.name}.`, byId: u.id });
        notify(
          [i.rmId],
          u.id,
          'INQUIRY_REASSIGNED',
          'Inquiry assigned to you',
          i.status === 'Nurture' ? `${i.code} was moved to you from Nurture.` : `${i.code} was assigned to you.`,
          { inquiryId: i.id, tab: i.status === 'Nurture' ? 'nurture' : undefined },
        );
        if (prev && prev !== i.rmId) notify([prev], u.id, 'INQUIRY_REASSIGNED', 'Inquiry reassigned', `${i.code} was moved to ${rmUser.name}.`, { inquiryId: i.id });
      } else if (data.action === 'lost') {
        applyStatus(i, 'Lost', u, String(data.remark).trim());
      } else {
        i.nextFollowUp = data.nextFollowUp;
        i.updatedAt = nowIso();
        addActivity({
          inquiryId: i.id,
          kind: 'Snooze',
          text: `Follow-up snoozed to ${format(parseISO(data.nextFollowUp), 'dd-MMM-yyyy')}.`,
          nextFollowUp: i.nextFollowUp,
          byId: u.id,
        });
      }
    });
    return { updated: targets.length };
  }
  if (match(url, '/crm/inquiries') && m === 'POST') {
    need(u, 'inquiries', 'create');
    needFields(data, ['customerId', 'inquiryType', 'source', 'requirement', 'quantity', 'value']);
    const cust = customers.find((c) => c.id === data.customerId);
    if (!cust) fail(400, { customerId: ['Customer does not exist.'] });
    if (!(Number(data.value) > 0)) fail(400, { value: ['Must be greater than 0.'] });
    let rmId: string | null = null;
    const repeat = inquiries.some((x) => x.customerId === cust.id);
    let priority: Priority = repeat ? 'High' : 'Normal';
    if (can(u, 'inquiries', 'assignRm')) {
      rmId = data.rmId || null;
      if (data.priority) priority = data.priority;
    } else {
      rmId = u.id;
    }
    if (!['Normal', 'High'].includes(priority)) fail(400, { priority: ['Choose Normal or High.'] });
    const t = nowIso();
    const rec: RawInquiry = {
      id: uuid(),
      code: nextCode('INQ', 5, inquiries),
      customerId: data.customerId,
      inquiryType: data.inquiryType,
      requirement: data.requirement,
      quantity: Number(data.quantity),
      value: Number(data.value),
      categoryId: data.categoryId || null,
      subcategoryId: data.subcategoryId || null,
      artistId: data.artistId || null,
      source: data.source,
      priority,
      status: 'Touchbase',
      rmId,
      assignedOn: rmId ? t : null,
      nextFollowUp: null,
      lastContact: null,
      closedAt: null,
      notes: data.notes,
      expectedTimeline: data.expectedTimeline,
      createdAt: t,
      updatedAt: t,
    };
    inquiries.unshift(rec);
    addActivity({ inquiryId: rec.id, kind: 'Created', text: `Inquiry created from ${rec.source}.`, byId: u.id });
    if (rmId) addActivity({ inquiryId: rec.id, kind: 'Assigned', text: `Assigned to ${nameOf(rmId)} (${priority}).`, byId: u.id });
    if (!isAdmin(u)) notify(adminIds(), u.id, 'NEW_INQUIRY', 'New inquiry created', `${rec.code} for ${cust.name} was created by ${u.name}.`, { inquiryId: rec.id });
    else if (rmId)
      notify([rmId], u.id, 'INQUIRY_ASSIGNED', 'New inquiry assigned', `${rec.code} (${cust.name}) is assigned to you — ${priority} priority.`, {
        inquiryId: rec.id,
        tab: 'touchbase',
      });
    return serInquiry(rec);
  }
  if ((p = match(url, '/crm/inquiries/:id')) && m === 'GET') return serInquiry(getInquiry(u, p.id));
  if ((p = match(url, '/crm/inquiries/:id')) && m === 'PATCH') {
    need(u, 'inquiries', 'edit');
    const i = getInquiry(u, p.id);
    if (data.value !== undefined && !(Number(data.value) > 0)) fail(400, { value: ['Must be greater than 0.'] });
    ['inquiryType', 'source', 'requirement', 'quantity', 'value', 'categoryId', 'subcategoryId', 'artistId', 'priority', 'notes', 'expectedTimeline'].forEach((k) => {
      if (data[k] !== undefined) (i as any)[k] = k === 'artistId' || k === 'categoryId' ? data[k] || null : data[k];
    });
    if (data.priority !== undefined && !['Normal', 'High'].includes(data.priority)) fail(400, { priority: ['Choose Normal or High.'] });
    if (data.rmId !== undefined && (data.rmId || null) !== i.rmId) {
      need(u, 'inquiries', 'assignRm');
      if (!isOpen(i)) fail(409, 'Closed inquiries cannot be reassigned.');
      const rmUser = users.find((x) => x.id === data.rmId);
      if (!rmUser || rmUser.roleId !== 'RM' || rmUser.status !== 'Active') fail(400, { rmId: ['Select an active Relationship Manager.'] });
      const prev = i.rmId;
      i.rmId = rmUser.id;
      i.assignedOn = nowIso();
      addActivity({ inquiryId: i.id, kind: prev ? 'Reassigned' : 'Assigned', text: `Assigned to ${rmUser.name} (${i.priority}).`, byId: u.id });
      notify([i.rmId], u.id, 'INQUIRY_ASSIGNED', 'New inquiry assigned', `${i.code} is assigned to you — ${i.priority} priority.`, { inquiryId: i.id, tab: tabOfStatus(i.status) });
      if (prev && prev !== i.rmId) notify([prev], u.id, 'INQUIRY_REASSIGNED', 'Inquiry reassigned', `${i.code} was moved to ${rmUser.name}.`, { inquiryId: i.id });
    }
    i.updatedAt = nowIso();
    addActivity({ inquiryId: i.id, kind: 'Edited', text: 'Inquiry details edited by Admin.', byId: u.id });
    notify([i.rmId], u.id, 'INQUIRY_UPDATED', 'Inquiry updated', `${i.code} was edited by ${u.name}.`, { inquiryId: i.id });
    return serInquiry(i);
  }
  if ((p = match(url, '/crm/inquiries/:id/activities')) && m === 'GET') {
    getInquiry(u, p.id);
    return sortBy(
      activities.filter((a) => a.inquiryId === p!.id),
      (a) => a.at,
      -1,
    ).map(actOut);
  }
  if ((p = match(url, '/crm/inquiries/:id/assign')) && m === 'POST') {
    need(u, 'inquiries', 'assignRm');
    needFields(data, ['rmId', 'priority']);
    const i = getInquiry(u, p.id);
    if (!isOpen(i)) fail(409, 'Closed inquiries cannot be reassigned.');
    const rmUser = users.find((x) => x.id === data.rmId);
    if (!rmUser || rmUser.roleId !== 'RM' || rmUser.status !== 'Active') fail(400, { rmId: ['Select an active Relationship Manager.'] });
    const prev = i.rmId;
    i.rmId = data.rmId;
    i.priority = data.priority;
    i.assignedOn = nowIso();
    i.updatedAt = nowIso();
    addActivity({ inquiryId: i.id, kind: prev ? 'Reassigned' : 'Assigned', text: `Assigned to ${rmUser.name} (${i.priority}).`, byId: u.id });
    notify([i.rmId], u.id, 'INQUIRY_ASSIGNED', 'New inquiry assigned', `${i.code} is assigned to you — ${i.priority} priority.`, { inquiryId: i.id, tab: tabOfStatus(i.status) });
    if (prev && prev !== i.rmId) notify([prev], u.id, 'INQUIRY_REASSIGNED', 'Inquiry reassigned', `${i.code} was moved to ${rmUser.name}.`, { inquiryId: i.id });
    return serInquiry(i);
  }
  if ((p = match(url, '/crm/inquiries/:id/touchbase')) && m === 'POST') {
    needFields(data, ['method']);
    data.at = data.at ?? nowIso();
    const i = ownInquiry(u, p.id);
    if (i.status !== 'Touchbase') fail(409, 'A touchbase has already been recorded for this inquiry.');
    i.status = 'Touchbase Follow-up';
    i.lastContact = data.at;
    i.nextFollowUp = addDays(parseISO(data.at), 1).toISOString();
    i.updatedAt = nowIso();
    addActivity({
      inquiryId: i.id,
      kind: 'Touchbase',
      method: data.method,
      text: data.notes ? `Touchbase via ${data.method}: ${data.notes}` : `Touchbase via ${data.method}.`,
      nextFollowUp: i.nextFollowUp,
      byId: u.id,
      at: data.at,
    });
    notify(adminIds(), u.id, 'TOUCHBASE_RECORDED', 'Touchbase recorded', `${u.name} recorded a ${data.method} touchbase on ${i.code}.`, { inquiryId: i.id });
    return serInquiry(i);
  }
  if ((p = match(url, '/crm/inquiries/:id/interactions')) && m === 'POST') {
    needFields(data, ['method']);
    data.at = data.at ?? nowIso();
    const i = ownInquiry(u, p.id);
    if (i.status !== 'Touchbase Follow-up' && i.status !== 'Active Conversations')
      fail(409, 'Interactions can only be recorded on Touchbase Follow-up or Active Conversations inquiries.');
    if (data.moveTo === 'Won') fail(400, { moveTo: ['Use the Mark as Won form to record a sale.'] });
    const moveTo: MoveTo | undefined = data.moveTo || undefined;
    if (moveTo && !MOVES[i.status].includes(moveTo)) fail(400, { moveTo: [`Cannot move from ${i.status} to ${moveTo}.`] });
    const terminal = moveTo === 'Lost';
    if (terminal && !String(data.remark ?? '').trim()) fail(400, { remark: ['Reason for closing is required.'] });
    if (terminal && data.closedOn && isAfter(parseISO(data.closedOn), new Date())) fail(400, { closedOn: ['Closed date cannot be in the future.'] });
    if (!terminal) {
      if (!data.nextFollowUp) fail(400, { nextFollowUp: ['This field is required.'] });
      if (isBefore(parseISO(data.nextFollowUp), startOfDay(parseISO(data.at)))) fail(400, { nextFollowUp: ['Next follow-up cannot be before the interaction date.'] });
    }
    const kind = i.status === 'Touchbase Follow-up' ? 'Follow-up' : 'Conversation';
    i.lastContact = data.at;
    i.nextFollowUp = terminal ? null : data.nextFollowUp;
    i.updatedAt = nowIso();
    addActivity({
      inquiryId: i.id,
      kind,
      method: data.method,
      text: interactionText(kind, data.method, data.notes, moveTo, data.remark),
      nextFollowUp: i.nextFollowUp,
      byId: u.id,
      at: data.at,
    });
    notify(
      adminIds(),
      u.id,
      'INTERACTION_RECORDED',
      kind === 'Follow-up' ? 'Follow-up recorded' : 'Conversation recorded',
      `${u.name} recorded a ${data.method} ${kind.toLowerCase()} on ${i.code}.`,
      { inquiryId: i.id },
    );
    if (moveTo) applyStatus(i, moveTo, u, data.remark, terminal ? data.closedOn : undefined);
    return serInquiry(i);
  }
  if ((p = match(url, '/crm/inquiries/:id/snooze')) && m === 'POST') {
    needFields(data, ['nextFollowUp']);
    const i = ownInquiry(u, p.id);
    if (i.status !== 'Touchbase Follow-up' && i.status !== 'Active Conversations') fail(409, 'Only Touchbase Follow-up or Active Conversations inquiries can be snoozed.');
    if (isBefore(parseISO(data.nextFollowUp), startOfDay(new Date()))) fail(400, { nextFollowUp: ['Choose a date in the future.'] });
    i.nextFollowUp = data.nextFollowUp;
    i.updatedAt = nowIso();
    addActivity({ inquiryId: i.id, kind: 'Snooze', text: `Follow-up snoozed to ${format(parseISO(data.nextFollowUp), 'dd-MMM-yyyy')}.`, nextFollowUp: i.nextFollowUp, byId: u.id });
    notify(adminIds(), u.id, 'FOLLOWUP_SNOOZED', 'Follow-up snoozed', `${u.name} snoozed ${i.code} to ${format(parseISO(data.nextFollowUp), 'dd-MMM-yyyy')}.`, { inquiryId: i.id });
    return serInquiry(i);
  }
  if ((p = match(url, '/crm/inquiries/:id/status')) && m === 'POST') {
    needFields(data, ['status']);
    if (isAdmin(u)) need(u, 'inquiries', 'edit');
    const i = getInquiry(u, p.id);
    if (data.status === 'Won') fail(400, { status: ['Use the Mark as Won form to record a sale.'] });
    if (!['Lost', 'Nurture', 'Active Conversations'].includes(data.status)) fail(400, { status: ['Invalid status.'] });
    if (!isOpen(i)) fail(409, 'Inquiry is already closed.');
    if (i.status === data.status) fail(409, `Inquiry is already ${data.status}.`);
    if (!isAdmin(u) && !(MOVES[i.status] ?? []).some((x) => x === data.status)) fail(409, `Cannot move from ${i.status} to ${data.status}.`);
    if (data.status === 'Lost' && !String(data.remark ?? '').trim()) fail(400, { remark: ['Reason for losing is required.'] });
    if (String(data.remark ?? '').length > 500) fail(400, { remark: ['Maximum 500 characters.'] });
    if (data.status === 'Active Conversations') {
      if (!data.nextFollowUp) fail(400, { nextFollowUp: ['This field is required.'] });
      if (isBefore(parseISO(data.nextFollowUp), startOfDay(new Date()))) fail(400, { nextFollowUp: ['Choose a date today or later.'] });
    }
    if (data.status === 'Nurture') {
      if (!data.nextFollowUp) fail(400, { nextFollowUp: ['This field is required.'] });
      if (isBefore(parseISO(data.nextFollowUp), startOfDay(new Date()))) fail(400, { nextFollowUp: ['Choose a date today or later.'] });
      i.nextFollowUp = data.nextFollowUp;
    }
    if (data.status === 'Active Conversations') i.nextFollowUp = data.nextFollowUp;
    applyStatus(i, data.status, u, data.remark);
    return serInquiry(i);
  }

  if ((p = match(url, '/crm/inquiries/:id/won')) && m === 'POST') {
    const i = getInquiry(u, p.id);
    if (isAdmin(u)) need(u, 'inquiries', 'edit');
    if (!isOpen(i)) fail(409, 'Inquiry is already closed.');
    if (!isAdmin(u) && i.status !== 'Active Conversations') fail(409, 'Only inquiries in Active Conversations can be marked as Won.');
    createSaleFromInquiry(i, u, data ?? {});
    applyStatus(i, 'Won', u, 'Sale recorded.');
    return serInquiry(i);
  }

  if (match(url, '/crm/customers') && m === 'GET') {
    need(u, 'customers', 'view');
    let rows = customers.filter(
      (c) =>
        has(params.q, c.name, c.phone, c.email, c.code) &&
        (!params.location || c.location === params.location) &&
        (!params.rmId || c.rmId === params.rmId) &&
        (!params.status || c.status === params.status),
    );
    rows = sortBy(rows, (c) => c.createdAt, -1);
    return paginate(
      rows.map(serCustomer).filter((c) => !params.customerType || c.customerType === params.customerType),
      params,
    );
  }
  if (match(url, '/crm/customers/locations') && m === 'GET') return Array.from(new Set(customers.map((c) => c.location).filter(Boolean))).sort();
  if (match(url, '/crm/customers') && m === 'POST') {
    need(u, 'customers', 'create');
    needFields(data, ['name', 'phone', 'email']);
    const errs: Record<string, string[]> = {};
    if (customers.some((c) => normPhone(c.phone) === normPhone(data.phone))) errs.phone = ['A customer with this phone number already exists.'];
    if (customers.some((c) => (c.email ?? '').toLowerCase() === String(data.email).toLowerCase())) errs.email = ['A customer with this email already exists.'];
    if (Object.keys(errs).length) fail(400, errs);
    const { rmId, ...rest } = data;
    const rec: RawCustomer = {
      customerType: 'Prospect',
      status: 'Active',
      source: 'Other',
      ...rest,
      id: uuid(),
      code: nextCode('CUST', 4, customers),
      customerSince: rest.customerType === 'Client' ? nowIso() : null,
      rmId: rmId ?? null,
      createdAt: nowIso(),
    };
    customers.unshift(rec);
    if (!isAdmin(u)) notify(adminIds(), u.id, 'CUSTOMER_CREATED', 'New contact added', `${rec.name} was added by ${u.name}.`, { customerId: rec.id });
    return serCustomer(rec);
  }
  if ((p = match(url, '/crm/customers/:id')) && m === 'GET') {
    const c = customers.find((x) => x.id === p!.id);
    if (!c) fail(404, 'Customer not found.');
    return serCustomer(c);
  }
  if ((p = match(url, '/crm/customers/:id')) && m === 'PATCH') {
    need(u, 'customers', 'edit');
    const c = customers.find((x) => x.id === p!.id);
    if (!c) fail(404, 'Customer not found.');
    const errs: Record<string, string[]> = {};
    if (data.phone && customers.some((x) => x.id !== c.id && normPhone(x.phone) === normPhone(data.phone))) errs.phone = ['A customer with this phone number already exists.'];
    if (data.email && customers.some((x) => x.id !== c.id && (x.email ?? '').toLowerCase() === String(data.email).toLowerCase()))
      errs.email = ['A customer with this email already exists.'];
    if (Object.keys(errs).length) fail(400, errs);
    // Customer Type is system-managed; edits cannot change it.
    const { rmId, customerType: _ignored, ...rest } = data;
    Object.assign(c, rest);
    if (rmId !== undefined) c.rmId = rmId || null;
    if (!['Prospect', 'Client'].includes(c.customerType)) c.customerType = 'Prospect';
    if (c.customerType === 'Client' && !c.customerSince) c.customerSince = nowIso();
    return serCustomer(c);
  }
  if ((p = match(url, '/crm/customers/:id/sales')) && m === 'GET') {
    need(u, 'customers', 'view');
    if (!customers.some((x) => x.id === p!.id)) fail(404, 'Customer not found.');
    const mine = sales.filter((x) => x.customerId === p!.id && (isAdmin(u) || x.rmId === u.id));
    const out: CustomerSale[] = sortBy(mine, (x) => x.saleDate, -1).map((x) => ({
      ...serSaleSummary(x),
      inquiry: { id: x.inquiryId, code: inquiries.find((i) => i.id === x.inquiryId)?.code ?? '' },
    }));
    return out;
  }
  if ((p = match(url, '/crm/customers/:id/activities')) && m === 'GET') {
    const ids = new Set(
      scoped(u)
        .filter((i) => i.customerId === p!.id)
        .map((i) => i.id),
    );
    return sortBy(
      activities.filter((a) => ids.has(a.inquiryId)),
      (a) => a.at,
      -1,
    ).map(actOut);
  }

  const tbl = (k: string) => (k === 'categories' ? categories : k === 'subcategories' ? subcategories : k === 'artists' ? artists : null) as any[] | null;
  const ser = (k: string, r: any) => (k === 'subcategories' ? serSub(r) : k === 'artists' ? serArtist(r) : r);
  if ((p = match(url, '/common/:kind/options')) && m === 'GET') {
    const t = tbl(p.kind);
    if (!t) fail(404, 'Unknown master.');
    return t
      .filter(
        (r) =>
          (r.status ?? 'Active') === 'Active' && (!params.categoryId || r.categoryId === params.categoryId) && (!params.subcategoryId || r.subcategoryId === params.subcategoryId),
      )
      .map((r) => ({ id: r.id, name: r.name, categoryId: r.categoryId ?? null, subcategoryId: r.subcategoryId ?? null }));
  }
  if ((p = match(url, '/common/:kind')) && m === 'GET') {
    need(u, 'masters', 'view');
    const t = tbl(p.kind);
    if (!t) fail(404, 'Unknown master.');
    const rows = t.filter(
      (r) =>
        has(params.q, r.name, r.description) &&
        (!params.status || !r.status || r.status === params.status) &&
        (!params.categoryId || r.categoryId === params.categoryId) &&
        (!params.subcategoryId || r.subcategoryId === params.subcategoryId),
    );
    return paginate(
      sortBy(rows, (r) => r.name.toLowerCase()).map((r) => ser(p!.kind, r)),
      params,
    );
  }
  if ((p = match(url, '/common/:kind')) && m === 'POST') {
    need(u, 'masters', 'create');
    const t = tbl(p.kind);
    if (!t) fail(404, 'Unknown master.');
    needFields(data, p.kind === 'subcategories' ? ['name', 'categoryId'] : ['name']);
    if (p.kind === 'artists') checkArtistLinks(data);
    if (t.some((r) => r.name.toLowerCase() === String(data.name).trim().toLowerCase() && (p!.kind === 'categories' || r.categoryId === (data.categoryId ?? null))))
      fail(400, { name: ['This name already exists.'] });
    const rec =
      p.kind === 'artists'
        ? { id: uuid(), name: String(data.name).trim(), categoryId: data.categoryId || null, subcategoryId: data.subcategoryId || null }
        : { status: 'Active', description: '', ...data, name: String(data.name).trim(), id: uuid() };
    t.unshift(rec);
    return ser(p.kind, rec);
  }
  if ((p = match(url, '/common/:kind/:id')) && m === 'GET') {
    need(u, 'masters', 'view');
    const t = tbl(p.kind);
    if (!t) fail(404, 'Unknown master.');
    const rec = t.find((r) => r.id === p!.id);
    if (!rec) fail(404, 'Record not found.');
    return ser(p.kind, rec);
  }
  if ((p = match(url, '/common/:kind/:id')) && m === 'PATCH') {
    need(u, 'masters', 'edit');
    const t = tbl(p.kind);
    if (!t) fail(404, 'Unknown master.');
    const rec = t.find((r) => r.id === p!.id);
    if (!rec) fail(404, 'Record not found.');
    if (
      data.name &&
      t.some(
        (r) =>
          r.id !== rec.id && r.name.toLowerCase() === String(data.name).trim().toLowerCase() && (p!.kind === 'categories' || r.categoryId === (data.categoryId ?? rec.categoryId)),
      )
    )
      fail(400, { name: ['This name already exists.'] });
    if (p.kind === 'artists') {
      checkArtistLinks({ categoryId: rec.categoryId, subcategoryId: rec.subcategoryId, ...data });
      Object.assign(rec, {
        name: data.name ?? rec.name,
        categoryId: data.categoryId === undefined ? rec.categoryId : data.categoryId || null,
        subcategoryId: data.subcategoryId === undefined ? rec.subcategoryId : data.subcategoryId || null,
      });
    } else Object.assign(rec, data);
    return ser(p.kind, rec);
  }

  if (match(url, '/crm/dashboard/admin') && m === 'GET') {
    requireAdmin(u);
    const range = params.range ?? '30';
    const rows = inquiries.filter((i) => inRange(i.createdAt, range));
    const won = inquiries.filter((i) => i.status === 'Won' && inRange(i.closedAt, range));
    const now = new Date();
    const weeks = Array.from({ length: 13 }, (_, k) => startOfWeek(subDays(now, (12 - k) * 7), { weekStartsOn: 1 }));
    const res: AdminDashboard = {
      kpis: {
        total: rows.length,
        unassigned: inquiries.filter((i) => !i.rmId && isOpen(i)).length,
        active: rows.filter((i) => ['Touchbase', 'Touchbase Follow-up', 'Active Conversations'].includes(i.status)).length,
        activeConversations: rows.filter((i) => i.status === 'Active Conversations').length,
        wonCount: won.length,
        wonRevenue: won.reduce((a, b) => a + b.value, 0),
        pipelineCount: inquiries.filter(isOpen).length,
        pipelineValue: inquiries.filter(isOpen).reduce((a, b) => a + b.value, 0),
        lostCount: inquiries.filter((i) => i.status === 'Lost' && inRange(i.closedAt, range)).length,
      },
      bySource: SOURCES.map((s) => ({ source: s, count: rows.filter((i) => i.source === s).length })),
      byType: INQUIRY_TYPES.map((t) => ({ type: t, count: rows.filter((i) => i.inquiryType === t).length })),
      trend: weeks.map((w, k) => ({
        weekStart: w.toISOString(),
        count: inquiries.filter((i) => {
          const d = parseISO(i.createdAt);
          return !isBefore(d, w) && (k === 12 || isBefore(d, weeks[k + 1]));
        }).length,
      })),
      rmTable: users
        .filter((x) => x.roleId === 'RM' && x.status === 'Active')
        .map((rm) => {
          const mine = rows.filter((i) => i.rmId === rm.id);
          const c = (s: string) => mine.filter((i) => i.status === s).length;
          const rmWon = won.filter((i) => i.rmId === rm.id);
          const rmLost = inquiries.filter((i) => i.rmId === rm.id && i.status === 'Lost' && inRange(i.closedAt, range));
          const rmOpen = inquiries.filter((i) => i.rmId === rm.id && isOpen(i));
          const wonValue = rmWon.reduce((a, b) => a + b.value, 0);
          const pipelineValue = rmOpen.reduce((a, b) => a + b.value, 0);
          return {
            rm: { id: rm.id, name: rm.name },
            touchbase: c('Touchbase'),
            followUp: c('Touchbase Follow-up'),
            active: c('Active Conversations'),
            nurture: c('Nurture'),
            won: rmWon.length,
            lost: rmLost.length,
            total: mine.length,
            wonValue,
            pipelineValue,
            revenue: wonValue + pipelineValue,
          };
        }),
    };
    return res;
  }
  if (match(url, '/crm/dashboard/rm') && m === 'GET') {
    let target = u;
    if (isAdmin(u)) {
      need(u, 'inquiries', 'assignRm');
      if (!params.rmId) fail(400, { rmId: ['This field is required for Admin.'] });
      const t = users.find((x) => x.id === params.rmId && x.roleId === 'RM');
      if (!t) fail(404, 'Relationship Manager not found.');
      target = toUser(t);
    } else if (params.rmId && params.rmId !== u.id) fail(403, 'You can only view your own dashboard.');
    const mine = inquiries.filter((i) => i.rmId === target.id);
    const range = params.range ?? '30';
    const sum = (xs: RawInquiry[]) => xs.reduce((a, b) => a + b.value, 0);
    const won = mine.filter((i) => i.status === 'Won' && inRange(i.closedAt, range));
    const lost = mine.filter((i) => i.status === 'Lost' && inRange(i.closedAt, range));
    const tb = mine.filter((i) => i.status === 'Touchbase');
    const fu = mine.filter((i) => i.status === 'Touchbase Follow-up');
    const ac = mine.filter((i) => i.status === 'Active Conversations');
    const todayStart = startOfDay(new Date());
    const res: RmDashboard = {
      kpis: {
        touchbase: { count: tb.length, overdue: tb.filter((i) => i.assignedOn && isBefore(parseISO(i.assignedOn), subHours(new Date(), 24))).length },
        followUp: { count: fu.length, overdue: fu.filter((i) => i.nextFollowUp && isBefore(parseISO(i.nextFollowUp), new Date())).length },
        active: { count: ac.length, dueToday: ac.filter((i) => i.nextFollowUp && !isBefore(parseISO(i.nextFollowUp), todayStart) && dueByToday(i)).length },
        nurture: mine.filter((i) => i.status === 'Nurture').length,
        won: { count: won.length, value: sum(won) },
        pipeline: { count: mine.filter(isOpen).length, value: sum(mine.filter(isOpen)) },
        lost: { count: lost.length, value: sum(lost) },
      },
    };
    return res;
  }

  if (match(url, '/crm/reports/inquiry-summary') && m === 'GET') {
    need(u, 'reports', 'view');
    const rows = reportRows(u, params);
    const n = (s: string) => rows.filter((i) => i.status === s).length;
    const top = (key: (i: RawInquiry) => string) => {
      const mp = new Map<string, number>();
      rows.forEach((i) => mp.set(key(i), (mp.get(key(i)) ?? 0) + 1));
      return [...mp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    const res: InquirySummaryReport = {
      kpis: {
        total: rows.length,
        touchbase: n('Touchbase'),
        followUp: n('Touchbase Follow-up'),
        active: n('Active Conversations'),
        nurture: n('Nurture'),
        won: n('Won'),
        lost: n('Lost'),
      },
      byStatus: STATUSES.map((s) => ({ status: s, count: n(s) })),
      byCategory: top((i) => categories.find((c) => c.id === i.categoryId)?.name ?? 'Not specified').map(([category, count]) => ({ category, count })),
      byRm: top((i) => summary(i.rmId)?.name ?? 'Unassigned').map(([rm, count]) => ({ rm, count })),
    };
    return res;
  }
  if (url.includes('/reports/')) need(u, 'reports', 'view');
  const detailRows = () =>
    reportRows(u, params).filter((i) => {
      const c = customers.find((x) => x.id === i.customerId)!;
      return has(params.q, i.code, c.name, c.email, c.phone);
    });
  if (match(url, '/crm/reports/inquiry-detail/export') && m === 'GET') {
    const head = ['Inquiry ID', 'Customer', 'Phone', 'Email', 'Category', 'Subcategory', 'Quantity', 'Value', 'Status', 'Follow-up Date', 'RM', 'Created'];
    const lines = detailRows()
      .map(serInquiry)
      .map((i) => [
        i.code,
        i.customer.name,
        i.customer.phone,
        i.customer.email,
        i.category?.name ?? '',
        i.subcategory?.name ?? '',
        i.quantity,
        i.value,
        i.status,
        i.nextFollowUp ? format(parseISO(i.nextFollowUp), 'yyyy-MM-dd') : '',
        i.rm?.name ?? 'Unassigned',
        format(parseISO(i.createdAt), 'yyyy-MM-dd'),
      ]);
    return [head, ...lines].map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  }
  if (match(url, '/crm/reports/inquiry-detail') && m === 'GET') return paginate(sortBy(detailRows(), (i) => i.createdAt, -1).map(serInquiry), params);

  if (match(url, '/crm/notifications') && m === 'GET') {
    const results = buildNotifications(u);
    const res: NotificationsResponse = { unreadCount: results.filter((n) => !n.read).length, results };
    return res;
  }
  if (match(url, '/crm/notifications/read-all') && m === 'POST') {
    eventNotes.filter((n) => n.userId === u.id).forEach((n) => (n.read = true));
    buildNotifications(u).forEach((n) => readIds.add(`${u.id}:${n.id}`));
    return {};
  }
  if ((p = match(url, '/crm/notifications/:id/read')) && m === 'POST') {
    const id = decodeURIComponent(p.id);
    const ev = eventNotes.find((n) => n.id === id && n.userId === u.id);
    if (ev) ev.read = true;
    else readIds.add(`${u.id}:${id}`);
    return {};
  }

  fail(404, `No mock handler for ${m} ${url}`);
}
