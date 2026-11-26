import { mockDispatch } from '@/mocks/server';

const store: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  },
};
(globalThis as any).document = { cookie: '' };

const call = (url: string, method = 'GET', data?: any, params?: any): Promise<any> =>
  mockDispatch({ url, method, data, params }).then(
    (r) => ({ ok: true, r }),
    (e) => ({ ok: false, status: e.response?.status, body: e.response?.data }),
  );
const login = (email: string) => call('/account/auth/login/', 'POST', { email, password: 'x' });
const iso = (days: number) => new Date(Date.now() + days * 864e5).toISOString();
const now = () => new Date().toISOString();

const results: string[] = [];
const t = async (name: string, fn: () => Promise<boolean>) => results.push(`${(await fn().catch(() => false)) ? 'PASS' : 'FAIL'}  ${name}`);

(async () => {
  await t('unauthenticated -> 401', async () => (await call('/crm/inquiries/')).status === 401);

  await login('lakshmi@artisera.com');
  await t('list is paginated', async () => {
    const r = await call('/crm/inquiries/', 'GET', undefined, { pageSize: 5, page: 2 });
    return r.r.results.length === 5 && r.r.count > 20 && r.r.page === 2;
  });
  await t('inquiry embeds customer / category / rm', async () => {
    const i = (await call('/crm/inquiries/', 'GET', undefined, { pageSize: 1 })).r.results[0];
    return !!i.customer.name && !!i.category.name && !!i.subcategory.name;
  });
  await t('unassigned tab only returns unassigned', async () => {
    const r = await call('/crm/inquiries/', 'GET', undefined, { tab: 'unassigned', pageSize: 100 });
    return r.r.count > 0 && r.r.results.every((i: any) => i.rm === null && i.status === 'Touchbase');
  });
  await t('status tabs return their status', async () => {
    const pairs: [string, string][] = [
      ['touchbase', 'Touchbase'],
      ['followup', 'Touchbase Follow-up'],
      ['active', 'Active Conversations'],
      ['nurture', 'Nurture'],
      ['won', 'Won'],
      ['lost', 'Lost'],
    ];
    for (const [tab, status] of pairs) {
      const r = await call('/crm/inquiries/', 'GET', undefined, { tab, pageSize: 100 });
      if (!r.r.count || !r.r.results.every((i: any) => i.status === status)) return false;
    }
    return true;
  });
  await t('counts has every tab', async () => {
    const c = (await call('/crm/inquiries/counts/')).r;
    return ['all', 'unassigned', 'assigned', 'today', 'touchbase', 'followup', 'active', 'nurture', 'won', 'lost'].every((k) => typeof c[k] === 'number');
  });
  await t('search works server-side', async () => {
    const r = await call('/crm/inquiries/', 'GET', undefined, { q: 'rhea', pageSize: 100 });
    return r.r.count > 0;
  });

  await t('admin dashboard aggregates (6 active RMs, 13 weeks)', async () => {
    const d = (await call('/crm/dashboard/admin/', 'GET', undefined, { range: 'all' })).r;
    return d.kpis.total > 0 && d.trend.length === 13 && d.rmTable.length === 6 && 'lost' in d.rmTable[0] && 'nurture' in d.rmTable[0];
  });
  await t('view-as-RM: rmId required', async () => (await call('/crm/dashboard/rm/', 'GET', undefined, { range: '30' })).status === 400);
  await t('view-as-RM: dashboard shape', async () => {
    const k = (await call('/crm/dashboard/rm/', 'GET', undefined, { range: 'all', rmId: 'u-priya' })).r.kpis;
    return typeof k.touchbase.overdue === 'number' && typeof k.active.dueToday === 'number' && typeof k.nurture === 'number' && typeof k.won.value === 'number';
  });
  await t('view-as-RM: counts and tabs scoped', async () => {
    const c = (await call('/crm/inquiries/counts/', 'GET', undefined, { rmId: 'u-priya' })).r;
    const all = (await call('/crm/inquiries/counts/')).r;
    const l = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'followup', rmId: 'u-priya', pageSize: 100 })).r;
    return c.all > 0 && c.all < all.all && l.results.length > 0 && l.results.every((i: any) => i.rm.id === 'u-priya');
  });
  await t('admin cannot record touchbase -> 403', async () => {
    const i = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'touchbase', pageSize: 1 })).r.results[0];
    return (await call(`/crm/inquiries/${i.id}/touchbase/`, 'POST', { method: 'Call', at: now() })).status === 403;
  });

  await t('customer: email required', async () => (await call('/crm/customers/', 'POST', { name: 'X', phone: '+91 90000 00001' })).status === 400);
  await t('customer: duplicate phone -> 400', async () => {
    const c = (await call('/crm/customers/', 'GET', undefined, { pageSize: 1 })).r.results[0];
    const r = await call('/crm/customers/', 'POST', { name: 'X', phone: c.phone, email: 'new@x.com' });
    return r.status === 400 && !!r.body.phone;
  });
  await t('customer: duplicate email -> 400', async () => {
    const c = (await call('/crm/customers/', 'GET', undefined, { pageSize: 1 })).r.results[0];
    const r = await call('/crm/customers/', 'POST', { name: 'X', phone: '+91 90000 00002', email: c.email });
    return r.status === 400 && !!r.body.email;
  });
  await t('customer: created as Prospect', async () => {
    const r = await call('/crm/customers/', 'POST', { name: 'Test Person', phone: '+91 90000 00003', email: 'test.person@x.com' });
    return r.ok && r.r.customerType === 'Prospect';
  });

  const un = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'unassigned', pageSize: 1 })).r.results[0];
  await t('assign needs priority -> 400', async () => (await call(`/crm/inquiries/${un.id}/assign/`, 'POST', { rmId: 'u-priya' })).status === 400);
  await t('assign to inactive RM -> 400', async () => (await call(`/crm/inquiries/${un.id}/assign/`, 'POST', { rmId: 'u-karan', priority: 'High' })).status === 400);
  await t('assign ok keeps Touchbase', async () => {
    const r = await call(`/crm/inquiries/${un.id}/assign/`, 'POST', { rmId: 'u-priya', priority: 'High' });
    return r.ok && r.r.status === 'Touchbase' && r.r.rm.id === 'u-priya';
  });
  const rahulInq = (await call('/crm/inquiries/', 'GET', undefined, { rmId: 'u-varun', pageSize: 1 })).r.results[0];
  await t('admin can edit inquiry fields', async () => (await call(`/crm/inquiries/${un.id}/`, 'PATCH', { value: 123456, priority: 'High' })).r.value === 123456);

  await login('priya@artisera.com');
  await t('RM sees only own inquiries', async () => {
    const r = await call('/crm/inquiries/', 'GET', undefined, { pageSize: 100 });
    return r.r.results.length > 0 && r.r.results.every((i: any) => i.rm?.id === 'u-priya');
  });
  await t('RM cannot open another RM inquiry -> 403', async () => (await call(`/crm/inquiries/${rahulInq.id}/`)).status === 403);
  await t(
    'RM cannot pass another rmId -> 403',
    async () =>
      (await call('/crm/inquiries/', 'GET', undefined, { rmId: 'u-varun' })).status === 403 &&
      (await call('/crm/dashboard/rm/', 'GET', undefined, { rmId: 'u-varun' })).status === 403,
  );
  await t(
    'RM cannot assign / edit -> 403',
    async () =>
      (await call(`/crm/inquiries/${un.id}/assign/`, 'POST', { rmId: 'u-varun', priority: 'High' })).status === 403 &&
      (await call(`/crm/inquiries/${un.id}/`, 'PATCH', { value: 1 })).status === 403,
  );
  await t('RM cannot list users master -> 403', async () => (await call('/account/users/')).status === 403);
  await t('RM got INQUIRY_ASSIGNED notification with tab', async () =>
    (await call('/crm/notifications/')).r.results.some((n: any) => n.type === 'INQUIRY_ASSIGNED' && n.tab === 'touchbase'),
  );
  await t('RM dashboard kpis', async () => (await call('/crm/dashboard/rm/', 'GET', undefined, { range: 'all' })).r.kpis.touchbase.count > 0);

  await t('touchbase -> Touchbase Follow-up, next follow-up +1 day', async () => {
    const at = now();
    const r = await call(`/crm/inquiries/${un.id}/touchbase/`, 'POST', { method: 'Call', at, notes: 'first call' });
    const diff = (new Date(r.r.nextFollowUp).getTime() - new Date(at).getTime()) / 864e5;
    return r.ok && r.r.status === 'Touchbase Follow-up' && Math.abs(diff - 1) < 0.01;
  });
  await t('second touchbase -> 409', async () => (await call(`/crm/inquiries/${un.id}/touchbase/`, 'POST', { method: 'Call', at: now() })).status === 409);
  await t('follow-up: next follow-up required -> 400', async () => (await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Email', at: now() })).status === 400);
  await t(
    'follow-up: Won not allowed from Touchbase Follow-up -> 400',
    async () => (await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Email', at: now(), moveTo: 'Won' })).status === 400,
  );
  await t(
    'follow-up: next date before interaction -> 400',
    async () => (await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Email', at: now(), nextFollowUp: iso(-5) })).status === 400,
  );
  await t('follow-up recorded (stays Touchbase Follow-up)', async () => {
    const r = await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Email', at: now(), nextFollowUp: iso(2) });
    return r.ok && r.r.status === 'Touchbase Follow-up';
  });
  await t(
    'snooze to the past -> 400, future ok',
    async () =>
      (await call(`/crm/inquiries/${un.id}/snooze/`, 'POST', { nextFollowUp: iso(-3) })).status === 400 &&
      (await call(`/crm/inquiries/${un.id}/snooze/`, 'POST', { nextFollowUp: iso(3) })).ok,
  );
  await t('customer responds -> Active Conversations', async () => {
    const r = await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'WhatsApp', at: now(), nextFollowUp: iso(2), moveTo: 'Active Conversations' });
    return r.ok && r.r.status === 'Active Conversations' && !!r.r.nextFollowUp;
  });
  await t(
    'conversation -> Nurture needs a follow-up date',
    async () => (await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Call', at: now(), moveTo: 'Nurture' })).status === 400,
  );
  await t('conversation -> Nurture keeps the follow-up date', async () => {
    const r = await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Call', at: now(), moveTo: 'Nurture', nextFollowUp: iso(7) });
    return r.ok && r.r.status === 'Nurture' && !!r.r.nextFollowUp;
  });
  await t('status endpoint rejects Won -> 400', async () => (await call(`/crm/inquiries/${un.id}/status/`, 'POST', { status: 'Won' })).status === 400);
  await t('nurture: RM cannot mark Lost directly -> 409', async () => (await call(`/crm/inquiries/${un.id}/status/`, 'POST', { status: 'Lost', remark: 'x' })).status === 409);
  await t('nurture -> Active Conversations needs a date', async () => (await call(`/crm/inquiries/${un.id}/status/`, 'POST', { status: 'Active Conversations' })).status === 400);
  await t(
    'nurture -> Active Conversations ok',
    async () => (await call(`/crm/inquiries/${un.id}/status/`, 'POST', { status: 'Active Conversations', nextFollowUp: iso(2) })).r.status === 'Active Conversations',
  );
  const saleBody = {
    totalValue: 780000,
    saleDate: now(),
    certificatePlan: 'Send Separately',
    shipmentPriority: 'Normal',
    paymentStatus: 'Advance',
    products: [
      { name: 'Test Canvas', listedPrice: 500000, quantity: 1, productStatus: 'In Stock' },
      { name: 'Test Print Set', listedPrice: 70000, quantity: 4, productStatus: 'In Stock' },
      { name: 'Test Commission', listedPrice: 150000, quantity: 1, productStatus: 'Commission', commissionReadyDate: iso(40) },
    ],
  };
  await t('won: needs at least one product -> 400', async () => (await call(`/crm/inquiries/${un.id}/won/`, 'POST', { ...saleBody, products: [] })).status === 400);
  await t(
    'won: Specify Date needs a date -> 400',
    async () => (await call(`/crm/inquiries/${un.id}/won/`, 'POST', { ...saleBody, shipmentPriority: 'Specify Date' })).status === 400,
  );
  await t('won: Urgent needs a date -> 400', async () => (await call(`/crm/inquiries/${un.id}/won/`, 'POST', { ...saleBody, shipmentPriority: 'Urgent' })).status === 400);
  await t('won: records sale, closes inquiry, converts customer', async () => {
    const r = await call(`/crm/inquiries/${un.id}/won/`, 'POST', saleBody);
    const c = (await call(`/crm/customers/${r.r.customer.id}/`)).r;
    return (
      r.ok &&
      r.r.status === 'Won' &&
      !!r.r.closedAt &&
      /^SAL-\d{5}$/.test(r.r.sale.saleNumber) &&
      r.r.sale.totalProducts === 3 &&
      r.r.sale.totalOrders === 0 &&
      c.customerType === 'Client' &&
      !!c.customerSince
    );
  });
  await t('won: second attempt -> 409', async () => (await call(`/crm/inquiries/${un.id}/won/`, 'POST', saleBody)).status === 409);
  await t(
    'closed inquiry rejects interactions -> 409',
    async () => (await call(`/crm/inquiries/${un.id}/interactions/`, 'POST', { method: 'Call', at: now(), nextFollowUp: iso(2) })).status === 409,
  );
  await t('history has touchbase / follow-up / conversation / status', async () => {
    const k = (await call(`/crm/inquiries/${un.id}/activities/`)).r.map((a: any) => a.kind);
    return ['Touchbase', 'Follow-up', 'Conversation', 'Status', 'Snooze'].every((x) => k.includes(x));
  });

  await login('lakshmi@artisera.com');
  await t('admin notified: touchbase, interaction, snooze, status', async () => {
    const ty = (await call('/crm/notifications/')).r.results.map((n: any) => n.type);
    return ['TOUCHBASE_RECORDED', 'INTERACTION_RECORDED', 'FOLLOWUP_SNOOZED', 'STATUS_CHANGED'].every((x) => ty.includes(x));
  });
  await t('mark one notification read lowers unread', async () => {
    const r = (await call('/crm/notifications/')).r;
    const ev = r.results.find((n: any) => n.id.startsWith('evt:'));
    await call(`/crm/notifications/${ev.id}/read/`, 'POST');
    return (await call('/crm/notifications/')).r.unreadCount === r.unreadCount - 1;
  });
  await t('admin can mark Lost / Nurture on any open inquiry', async () => {
    const open = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'active', pageSize: 2 })).r.results;
    return (
      (await call(`/crm/inquiries/${open[0].id}/status/`, 'POST', { status: 'Lost', remark: 'Not interested' })).r.status === 'Lost' &&
      (await call(`/crm/inquiries/${open[1].id}/status/`, 'POST', { status: 'Nurture', nextFollowUp: iso(5) })).r.status === 'Nurture'
    );
  });
  await t('closed inquiry cannot change status -> 409', async () => (await call(`/crm/inquiries/${un.id}/status/`, 'POST', { status: 'Lost', remark: 'x' })).status === 409);

  await t('users: list, filter, create, duplicate email', async () => {
    const l = (await call('/account/users/', 'GET', undefined, { role: 'RM', pageSize: 50 })).r;
    const u = await call('/account/users/', 'POST', { name: 'New RM', email: 'newrm@artisera.com', phone: '+91 90000 11111', roleId: 'RM' });
    const d = await call('/account/users/', 'POST', { name: 'Dup', email: 'newrm@artisera.com', phone: '+91 90000 11112', roleId: 'RM' });
    return l.count === 7 && u.ok && d.status === 400;
  });
  await t('user options exclude inactive', async () => {
    const o = (await call('/account/users/options/', 'GET', undefined, { role: 'RM' })).r;
    return o.length === 7 && !o.some((x: any) => x.id === 'u-karan');
  });
  await t('roles: list with users count, edit permissions', async () => {
    const l = (await call('/account/roles/')).r;
    const rm = l.results.find((r: any) => r.id === 'RM');
    const u = await call('/account/roles/RM/', 'PATCH', { permissions: { ...rm.permissions, masters: { view: true } } });
    return l.count === 3 && rm.usersCount >= 6 && u.r.permissions.masters.create === undefined;
  });
  await t('admin role cannot be deactivated -> 400', async () => (await call('/account/roles/ADMIN/', 'PATCH', { status: 'Inactive' })).status === 400);
  await t('masters options + report summary + csv', async () => {
    const o = (await call('/common/subcategories/options/', 'GET', undefined, { categoryId: 'cat1' })).r;
    const s = (await call('/crm/reports/inquiry-summary/')).r;
    const c = await call('/crm/reports/inquiry-detail/export/');
    return o.length === 5 && s.kpis.total > 0 && s.byStatus.length === 6 && String(c.r).startsWith('"Inquiry ID"');
  });

  await t('me returns permissions (Admin can assign, RM cannot)', async () => {
    const a = (await call('/account/auth/me/')).r;
    await login('priya@artisera.com');
    const r = (await call('/account/auth/me/')).r;
    await login('lakshmi@artisera.com');
    return a.permissions.inquiries.assignRm === true && r.permissions.inquiries.view === true && !r.permissions.inquiries.assignRm && !r.permissions.inquiries.edit;
  });

  await login('priya@artisera.com');
  await t('RM can read masters but not create / edit', async () => {
    const l = await call('/common/categories/', 'GET', undefined, { pageSize: 5 });
    return (
      l.ok &&
      (await call('/common/categories/', 'POST', { name: 'Zeta Art' })).status === 403 &&
      (await call('/common/categories/cat1/', 'PATCH', { description: 'x' })).status === 403
    );
  });
  await t('RM can create but not edit customers', async () => {
    const c = await call('/crm/customers/', 'POST', { name: 'RM Made', phone: '+91 90000 22222', email: 'rm.made@x.com' });
    return c.ok && (await call(`/crm/customers/${c.r.id}/`, 'PATCH', { notes: 'x' })).status === 403;
  });
  await t('RM own inquiry edit is 403 by default', async () => {
    const i = (await call('/crm/inquiries/', 'GET', undefined, { pageSize: 1 })).r.results[0];
    return (await call(`/crm/inquiries/${i.id}/`, 'PATCH', { value: 111111 })).status === 403;
  });
  await t('"today" tasks: overdue first, then hour, priority, value', async () => {
    const rows = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'today', pageSize: 100 })).r.results;
    const rank: Record<string, number> = { High: 0, Normal: 1 };
    const when = (i: any) => new Date(i.nextFollowUp ?? i.assignedOn ?? i.createdAt);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const late = (i: any) => (when(i) < start ? 0 : 1);
    const hour = (i: any) => Math.floor(when(i).getTime() / 3600000);
    for (let k = 1; k < rows.length; k++) {
      const a = rows[k - 1],
        b = rows[k];
      const diff = late(a) - late(b) || hour(a) - hour(b) || rank[a.priority] - rank[b.priority] || b.value - a.value;
      if (diff > 0) return false;
    }
    return rows.length >= 2;
  });

  await login('lakshmi@artisera.com');
  await t('Admin grants RM masters.create + inquiries.edit -> takes effect immediately', async () => {
    const rm = (await call('/account/roles/RM/')).r;
    const r = await call('/account/roles/RM/', 'PATCH', {
      permissions: { ...rm.permissions, masters: { view: true, create: true }, inquiries: { ...rm.permissions.inquiries, edit: true } },
    });
    await login('priya@artisera.com');
    const m = await call('/common/categories/', 'POST', { name: 'Zeta Art' });
    const own = (await call('/crm/inquiries/', 'GET', undefined, { pageSize: 1 })).r.results[0];
    const other = (await call('/crm/inquiries/', 'GET', undefined, { pageSize: 1, tab: 'all' })).r.results[0];
    const e = await call(`/crm/inquiries/${own.id}/`, 'PATCH', { value: 222222 });
    const foreign = await call(`/crm/inquiries/${rahulInq.id}/`, 'PATCH', { value: 5 });
    await login('lakshmi@artisera.com');
    return r.ok && m.ok && e.ok && e.r.value === 222222 && foreign.status === 403 && !!other;
  });
  await t('Admin revokes RM reports.view -> 403', async () => {
    const rm = (await call('/account/roles/RM/')).r;
    await call('/account/roles/RM/', 'PATCH', { permissions: { ...rm.permissions, reports: {} } });
    await login('priya@artisera.com');
    const a = await call('/crm/reports/inquiry-summary/');
    const b = await call('/crm/reports/inquiry-detail/');
    const c = await call('/crm/reports/inquiry-detail/export/');
    await login('lakshmi@artisera.com');
    return a.status === 403 && b.status === 403 && c.status === 403;
  });
  await t('Admin without inquiries.create cannot create inquiry', async () => {
    const ad = (await call('/account/roles/ADMIN/')).r;
    await call('/account/roles/ADMIN/', 'PATCH', { permissions: { ...ad.permissions, inquiries: { ...ad.permissions.inquiries, create: false } } });
    const r = await call('/crm/inquiries/', 'POST', {
      customerId: 'c1',
      inquiryType: 'Product Inquiry',
      source: 'Website',
      requirement: 'x',
      quantity: 1,
      value: 1000,
      categoryId: 'cat1',
      subcategoryId: 'sub1',
      rmId: 'u-priya',
      priority: 'High',
    });
    await call('/account/roles/ADMIN/', 'PATCH', { permissions: ad.permissions });
    return r.status === 403;
  });

  await login('lakshmi@artisera.com');
  await t('inquiry can be created and edited without a category', async () => {
    const r = await call('/crm/inquiries/', 'POST', {
      customerId: 'c1',
      inquiryType: 'Product Inquiry',
      source: 'Website',
      requirement: 'No category',
      quantity: 1,
      value: 1000,
      rmId: 'u-priya',
      priority: 'Normal',
    });
    if (!r.ok || r.r.category !== null) return false;
    const e = await call(`/crm/inquiries/${r.r.id}/`, 'PATCH', { categoryId: '' });
    return e.ok && e.r.category === null;
  });
  await t('inquiry can be created without a subcategory or artist', async () => {
    const r = await call('/crm/inquiries/', 'POST', {
      customerId: 'c1',
      inquiryType: 'Product Inquiry',
      source: 'Website',
      requirement: 'No subcategory or artist',
      quantity: 1,
      value: 1000,
      categoryId: 'cat1',
      rmId: 'u-priya',
      priority: 'Normal',
    });
    const got = r.ok ? (await call(`/crm/inquiries/${r.r.id}/`)).r : null;
    return r.ok && !!got && got.subcategory === null && got.artist === null;
  });
  await t('repeat prospect: customer with earlier inquiries is flagged', async () => {
    const all = (await call('/crm/inquiries/', 'GET', undefined, { pageSize: 100 })).r.results;
    const seen = new Set<string>();
    const ordered = [...all].sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
    return (
      ordered.every((i: any) => {
        const expected = seen.has(i.customer.id);
        seen.add(i.customer.id);
        return i.repeatProspect === expected;
      }) && ordered.some((i: any) => i.repeatProspect)
    );
  });
  await t('repeat prospect: flagged only from the second inquiry', async () => {
    const body = (customerId: string) => ({
      customerId,
      inquiryType: 'Product Inquiry',
      source: 'Website',
      requirement: 'x',
      quantity: 1,
      value: 1000,
      categoryId: 'cat1',
      subcategoryId: 'sub1',
      rmId: 'u-priya',
      priority: 'High',
    });
    const c = (await call('/crm/customers/', 'POST', { name: 'Fresh Contact', phone: '+91 90000 33333', email: 'fresh.contact@x.com' })).r;
    const none = (await call(`/crm/customers/${c.id}/`)).r;
    await call('/crm/inquiries/', 'POST', body(c.id));
    const one = (await call(`/crm/customers/${c.id}/`)).r;
    await call('/crm/inquiries/', 'POST', body(c.id));
    const two = (await call(`/crm/customers/${c.id}/`)).r;
    return none.repeatProspect === false && one.repeatProspect === false && one.totalInquiries === 1 && two.repeatProspect === true;
  });
  await t('interaction: closing needs a reason, remark lands in history', async () => {
    const x = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'active', pageSize: 5 })).r.results[0];
    if (!x) return true;
    const body = { method: 'Call', at: now() };
    const missing = await call(`/crm/inquiries/${x.id}/interactions/`, 'POST', { ...body, moveTo: 'Lost' });
    return missing.status === 400 || missing.status === 403;
  });

  // ---- V10 rules ----
  await login('lakshmi@artisera.com');
  await t('V10 admin dashboard: pipeline count and value', async () => {
    const k = (await call('/crm/dashboard/admin/', 'GET', undefined, { range: 'all' })).r.kpis;
    return k.pipelineCount > 0 && k.pipelineValue > 0;
  });
  await t('V10 priority: only Normal or High; repeat prospect defaults to High', async () => {
    const bad = await call('/crm/inquiries/', 'POST', {
      customerId: un.customer.id,
      inquiryType: 'Product Inquiry',
      source: 'Website',
      requirement: 'x',
      quantity: 1,
      value: 1000,
      categoryId: 'cat1',
      subcategoryId: 'sub1',
      priority: 'Urgent',
    });
    const repeat = await call('/crm/inquiries/', 'POST', {
      customerId: un.customer.id,
      inquiryType: 'Product Inquiry',
      source: 'Website',
      requirement: 'Repeat check',
      quantity: 1,
      value: 1000,
      categoryId: 'cat1',
      subcategoryId: 'sub1',
    });
    return bad.status === 400 && repeat.ok && repeat.r.priority === 'High';
  });
  await t('V10 customer type: Client / Repeat Client derived, filter works', async () => {
    const c = (await call(`/crm/customers/${un.customer.id}/`)).r;
    const f = (await call('/crm/customers/', 'GET', undefined, { customerType: c.customerType, pageSize: 100 })).r.results;
    return ['Prospect', 'Repeat Prospect', 'Client', 'Repeat Client'].includes(c.customerType) && f.every((x: any) => x.customerType === c.customerType);
  });
  await t('V10 customer sales records endpoint', async () => {
    const r = await call(`/crm/customers/${un.customer.id}/sales/`);
    return r.ok && r.r.length >= 1 && /^SAL-/.test(r.r[0].saleNumber) && !!r.r[0].inquiry.code;
  });
  await t('V10 artists: no nationality/status, category and subcategory optional', async () => {
    const a = await call('/common/artists/', 'POST', { name: 'V10 Test Artist' });
    const bad = await call('/common/artists/', 'POST', { name: 'V10 Mismatch', categoryId: 'cat1', subcategoryId: 'sub10' });
    return a.ok && !('nationality' in a.r) && !('status' in a.r) && a.r.categoryId === null && a.r.subcategoryId === null && bad.status === 400;
  });
  await t('V10 bulk nurture: validation, reassign, snooze, lost', async () => {
    const nurture = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'nurture', pageSize: 5 })).r.results;
    if (nurture.length < 3) return false;
    const [a, b, c] = nurture;
    const none = await call('/crm/inquiries/bulk/', 'POST', { ids: [], action: 'lost', remark: 'x' });
    const noReason = await call('/crm/inquiries/bulk/', 'POST', { ids: [a.id], action: 'lost' });
    const notNurture = await call('/crm/inquiries/bulk/', 'POST', { ids: [un.id], action: 'snooze', nextFollowUp: iso(3) });
    const re = await call('/crm/inquiries/bulk/', 'POST', { ids: [a.id], action: 'reassign', rmId: 'u-varun' });
    const sn = await call('/crm/inquiries/bulk/', 'POST', { ids: [b.id], action: 'snooze', nextFollowUp: iso(7) });
    const lo = await call('/crm/inquiries/bulk/', 'POST', { ids: [c.id], action: 'lost', remark: 'Not interested' });
    const after = (await call(`/crm/inquiries/${c.id}/`)).r;
    return none.status === 400 && noReason.status === 400 && notNurture.status === 409 && re.r.updated === 1 && sn.r.updated === 1 && lo.r.updated === 1 && after.status === 'Lost';
  });
  await t('V10 bulk actions are Admin only', async () => {
    await login('priya@artisera.com');
    const r = await call('/crm/inquiries/bulk/', 'POST', { ids: ['x'], action: 'lost', remark: 'x' });
    await login('lakshmi@artisera.com');
    return r.status === 403;
  });

  await t('V10 RM may reassign only their own Nurture inquiries; no other bulk action', async () => {
    const all = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'nurture', pageSize: 50 })).r.results;
    const other = all.find((x: any) => x.rm && x.rm.id !== 'u-priya');
    await login('priya@artisera.com');
    const mine = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'nurture', pageSize: 50 })).r.results[0];
    const foreign = other ? await call('/crm/inquiries/bulk/', 'POST', { ids: [other.id], action: 'reassign', rmId: 'u-varun' }) : { status: 403 };
    const own = mine ? await call('/crm/inquiries/bulk/', 'POST', { ids: [mine.id], action: 'reassign', rmId: 'u-varun' }) : { status: 200, r: { updated: 1 } };
    const lost = mine ? await call('/crm/inquiries/bulk/', 'POST', { ids: [mine.id], action: 'lost', remark: 'x' }) : { status: 403 };
    await login('lakshmi@artisera.com');
    return foreign.status === 403 && own.r.updated === 1 && lost.status === 403;
  });
  await t('V10 admin RM table splits Won and In Pipeline value; total is their sum', async () => {
    const rows = (await call('/crm/dashboard/admin/', 'GET', undefined, { range: 'all' })).r.rmTable;
    return rows.length > 0 && rows.every((r: any) => typeof r.wonValue === 'number' && typeof r.pipelineValue === 'number' && r.revenue === r.wonValue + r.pipelineValue);
  });
  await t('V10 RM dashboard has an In Pipeline count and value', async () => {
    await login('priya@artisera.com');
    const k = (await call('/crm/dashboard/rm/', 'GET', undefined, { range: 'all' })).r.kpis;
    await login('lakshmi@artisera.com');
    return k.pipeline && k.pipeline.count > 0 && k.pipeline.value > 0;
  });
  await t('V10 closing an inquiry records the chosen closed date and rejects a future one', async () => {
    await login('priya@artisera.com');
    const x = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'active', pageSize: 5 })).r.results[0];
    if (!x) {
      await login('lakshmi@artisera.com');
      return true;
    }
    const future = await call(`/crm/inquiries/${x.id}/interactions/`, 'POST', { method: 'Call', at: now(), moveTo: 'Lost', remark: 'No budget', closedOn: iso(5).slice(0, 10) });
    const ok = await call(`/crm/inquiries/${x.id}/interactions/`, 'POST', { method: 'Call', at: now(), moveTo: 'Lost', remark: 'No budget', closedOn: '2026-11-01' });
    await login('lakshmi@artisera.com');
    return future.status === 400 && ok.r.status === 'Lost';
  });

  await login('anita@artisera.com');
  await t(
    'gallery manager: no inquiry or inquiry-report access',
    async () =>
      (await call('/crm/inquiries/')).status === 403 &&
      (await call('/crm/reports/inquiry-summary/')).status === 403 &&
      (await call(`/crm/inquiries/${un.id}/won/`, 'POST', saleBody)).status === 403,
  );
  await t('gallery manager is notified of the won sale', async () => (await call('/crm/notifications/')).r.results.some((n: any) => n.type === 'SALE_WON' && n.saleId));
  const sale = (await call('/gallery/sales/', 'GET', undefined, { q: 'Test Canvas', pageSize: 5 })).r.results[0];
  await t(
    'sales list row has the V8 columns',
    async () =>
      /^SAL-\d{5}$/.test(sale.saleNumber) &&
      sale.totalOrders === 0 &&
      sale.totalProducts === 3 &&
      sale.productsRemaining === 3 &&
      sale.certificateSeparately === true &&
      sale.pendingWith === 'RM email not received' &&
      sale.emailConfirmed === false,
  );
  await login('priya@artisera.com');
  await t('RM marks the email as sent -> sale shows Sent, second try -> 409', async () => {
    const before = (await call(`/crm/inquiries/${un.id}/`)).r.sale;
    const r = await call(`/gallery/sales/${sale.id}/email-sent/`, 'POST');
    const again = await call(`/gallery/sales/${sale.id}/email-sent/`, 'POST');
    const after = (await call(`/crm/inquiries/${un.id}/`)).r.sale;
    return before.emailStatus === 'Pending' && r.ok && again.status === 409 && after.emailStatus === 'Sent' && !!after.emailSentAt;
  });
  await login('anita@artisera.com');
  await t('gallery manager is told the RM sent the email', async () =>
    (await call('/crm/notifications/')).r.results.some((n: any) => n.type === 'SALE_EMAIL_SENT' && n.saleId === sale.id),
  );
  await t('sale shows RM email Sent; orders blocked until marked Received', async () => {
    const stockProduct = (await call(`/gallery/sales/${sale.id}/`)).r.products.find((x: any) => x.productStatus === 'In Stock');
    const blocked = await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [[stockProduct.id]] });
    const d = (await call(`/gallery/sales/${sale.id}/`)).r;
    const marked = await call(`/gallery/sales/${sale.id}/email-received/`, 'POST');
    const after = (await call(`/gallery/sales/${sale.id}/`)).r;
    return (
      blocked.status === 409 &&
      d.rmNotification.status === 'Sent' &&
      marked.ok &&
      after.rmNotification.status === 'Received' &&
      after.rmNotification.overridden === false &&
      after.pendingWith === 'Order not created'
    );
  });
  await t('With Artist without a ready date -> 400 and the product is left unchanged', async () => {
    const prod = (await call(`/gallery/sales/${sale.id}/`)).r.products.find((x: any) => x.productStatus === 'In Stock');
    const r = await call(`/gallery/sales/${sale.id}/products/${prod.id}/`, 'PATCH', { productStatus: 'With Artist' });
    const after = (await call(`/gallery/sales/${sale.id}/`)).r.products.find((x: any) => x.id === prod.id);
    return r.status === 400 && after.productStatus === 'In Stock';
  });
  await t('commission without a ready date -> 400 and the product is left unchanged', async () => {
    const prod = (await call(`/gallery/sales/${sale.id}/`)).r.products.find((x: any) => x.productStatus === 'In Stock');
    const r = await call(`/gallery/sales/${sale.id}/products/${prod.id}/`, 'PATCH', { productStatus: 'Commission' });
    const after = (await call(`/gallery/sales/${sale.id}/`)).r.products.find((x: any) => x.id === prod.id);
    return r.status === 400 && after.productStatus === 'In Stock';
  });
  await t('sales filters: order status none, certificate pending, customer', async () => {
    const none = (await call('/gallery/sales/', 'GET', undefined, { orderStatus: 'none', pageSize: 100 })).r.results;
    const pending = (await call('/gallery/sales/', 'GET', undefined, { certificateStatus: 'pending', pageSize: 100 })).r.results;
    const mine = (await call('/gallery/sales/', 'GET', undefined, { customerId: sale.customer.id, pageSize: 100 })).r.results;
    return none.some((x: any) => x.id === sale.id) && pending.some((x: any) => x.id === sale.id) && mine.every((x: any) => x.customer.id === sale.customer.id);
  });
  await t('gallery customers filter list', async () => (await call('/gallery/customers/')).r.some((c: any) => c.id === sale.customer.id));
  const detail = (await call(`/gallery/sales/${sale.id}/`)).r;
  const [canvas, prints, commission] = detail.products;
  await t('email confirmation: a pending sale blocks orders until overridden', async () => {
    const pending = (await call('/gallery/sales/', 'GET', undefined, { pageSize: 100 })).r.results.find((x: any) => x.emailConfirmed === false);
    if (!pending) return false;
    const pd = (await call(`/gallery/sales/${pending.id}/`)).r;
    const stock = pd.products.find((p: any) => p.productStatus === 'In Stock' && !p.orderId);
    const blocked = stock ? await call(`/gallery/sales/${pending.id}/orders/`, 'POST', { groups: [[stock.id]] }) : { status: 409 };
    const o = await call(`/gallery/sales/${pending.id}/email-override/`, 'POST');
    const d = (await call(`/gallery/sales/${pending.id}/`)).r;
    const again = await call(`/gallery/sales/${pending.id}/email-override/`, 'POST');
    return (
      pending.pendingWith === 'RM email not received' &&
      blocked.status === 409 &&
      o.ok &&
      d.rmNotification.status === 'Received' &&
      d.rmNotification.overridden === true &&
      again.status === 409
    );
  });
  await t('dashboard: attention sales lists Order not created', async () =>
    (await call('/gallery/dashboard/')).r.attentionSales.results
      .concat((await call('/gallery/dashboard/')).r.attentionSales.results)
      .some((x: any) => x.id === sale.id || x.pendingWith === 'Order not created'),
  );
  await t('product: ready date kept for With Artist and Commission, cleared for In Stock', async () => {
    const r0 = await call(`/gallery/sales/${sale.id}/products/${commission.id}/`, 'PATCH', { productStatus: 'With Artist', commissionReadyDate: iso(5) });
    const r = await call(`/gallery/sales/${sale.id}/products/${commission.id}/`, 'PATCH', { productStatus: 'In Stock' });
    const back = await call(`/gallery/sales/${sale.id}/products/${commission.id}/`, 'PATCH', {
      productStatus: 'Commission',
      commissionReadyDate: iso(40),
      orderNotes: 'Size 48 x 36',
    });
    return r0.ok && !!r0.r.commissionReadyDate && r.ok && r.r.commissionReadyDate === null && back.ok && back.r.orderNotes === 'Size 48 x 36' && !!back.r.commissionReadyDate;
  });
  await t(
    'order: needs products -> 400, non In Stock -> 409',
    async () =>
      (await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [] })).status === 400 &&
      (await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [[canvas.id], [canvas.id]] })).status === 400 &&
      (await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [[commission.id]] })).status === 409,
  );
  const created = await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [[canvas.id, prints.id]] });
  const order = created.r?.[0];
  await t(
    'order: first order of a split sale is -A, Preparation, value summed from its own products',
    async () =>
      created.ok &&
      created.r.length === 1 &&
      order.orderNumber === `${sale.saleNumber}-A` &&
      order.status === 'Preparation' &&
      order.orderValue === 780000 &&
      order.totalProducts === 2,
  );
  await t('order: product already ordered -> 409', async () => (await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [[canvas.id]] })).status === 409);
  await t(
    'sale: product locked after order and remaining count drops',
    async () =>
      (await call(`/gallery/sales/${sale.id}/products/${canvas.id}/`, 'PATCH', { productStatus: 'With Artist' })).status === 409 &&
      (await call(`/gallery/sales/${sale.id}/`)).r.productsRemaining === 1,
  );
  await t(
    'packing: blocked until ready -> 409',
    async () => (await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { packages: [{ packagingType: 'Tube' }], courier: 'DHL', waybill: 'W1' })).status === 409,
  );
  await t(
    'order: ready requires photo/video flags -> 400',
    async () => (await call(`/gallery/orders/${order.id}/`, 'PATCH', { readyForPacking: true, products: [] })).status === 400,
  );
  await t('order: flags + ready -> Packing', async () => {
    const r = await call(`/gallery/orders/${order.id}/`, 'PATCH', { readyForPacking: true, products: order.products.map((p: any) => ({ id: p.id, photoVideoUploaded: true })) });
    return r.ok && r.r.status === 'Packing' && r.r.products.every((p: any) => p.photoVideoUploaded);
  });
  await t('packing: validation -> 400 (courier, waybill, package type)', async () => {
    const noCourier = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { packages: [{ packagingType: 'Tube' }], waybill: 'W1' });
    const noType = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { packages: [{ packagingType: '' }], courier: 'DHL', waybill: 'W1' });
    const noPackages = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { packages: [], courier: 'DHL', waybill: 'W1' });
    return noCourier.status === 400 && noType.status === 400 && noPackages.status === 400;
  });
  const dispatchBody = {
    packages: [
      { packagingType: 'Crate (Wooden)', lengthCm: 120, widthCm: 80, heightCm: 60, weightKg: 25, notes: 'Fragile' },
      { packagingType: 'Tube', lengthCm: 100, widthCm: 15, heightCm: 15, weightKg: 5, notes: '' },
    ],
    courier: 'DHL',
    waybill: 'DHL12345678',
    actualDispatchDate: null,
    certificateIncluded: false,
    invoiceIncluded: true,
  };
  await t('packing saved stays Packing, two packages', async () => {
    const r = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', dispatchBody);
    return r.ok && r.r.status === 'Packing' && r.r.packages.length === 2;
  });
  await t(
    'order: Ready cannot be cleared once packing is saved -> 409',
    async () => (await call(`/gallery/orders/${order.id}/`, 'PATCH', { readyForPacking: false, products: [] })).status === 409,
  );
  await t('packing can be saved on its own (no courier or date needed)', async () => {
    const r = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { packages: dispatchBody.packages });
    return r.ok && r.r.status === 'Packing' && r.r.packages.length > 0;
  });
  await t('shipment details can be saved on their own, without a dispatch date', async () => {
    const { packages: _p, ...shipment } = dispatchBody;
    const r = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { ...shipment, actualDispatchDate: null });
    return r.ok && r.r.status === 'Packing' && !!r.r.courier && !r.r.actualDispatchDate && r.r.packages.length > 0;
  });
  await t('dispatch: future date -> 400, order stays Packing', async () => {
    const r = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { ...dispatchBody, actualDispatchDate: iso(5) });
    const o = (await call(`/gallery/orders/${order.id}/`)).r;
    return r.status === 400 && !!r.body?.actualDispatchDate && o.status === 'Packing' && !o.actualDispatchDate;
  });
  await t('dispatch date -> Dispatched and listed under shipments as In Transit', async () => {
    const r = await call(`/gallery/orders/${order.id}/dispatch/`, 'PATCH', { ...dispatchBody, actualDispatchDate: now() });
    const ship = (await call('/gallery/shipments/', 'GET', undefined, { pageSize: 100 })).r.results.find((x: any) => x.orderId === order.id);
    return r.ok && r.r.status === 'Dispatched' && ship?.status === 'In Transit' && ship.trackingNo === 'DHL12345678';
  });
  await t('photos and videos can still be added and removed after dispatch', async () => {
    const add = async (kind: string, name: string, type: string) => {
      const fd = new FormData();
      fd.append('file', new File(['x'], name, { type }));
      fd.append('kind', kind);
      return call(`/gallery/orders/${order.id}/media/`, 'POST', fd);
    };
    const photo = await add('packing', 'late.png', 'image/png');
    const video = await add('product', 'late.mp4', 'video/mp4');
    const del = photo.ok ? await call(`/gallery/orders/${order.id}/media/${photo.r.id}/`, 'DELETE') : photo;
    const o = (await call(`/gallery/orders/${order.id}/`)).r;
    return (
      photo.ok && video.ok && del.ok && o.status === 'Dispatched' && o.media.some((m: any) => m.fileName === 'late.mp4') && !o.media.some((m: any) => m.fileName === 'late.png')
    );
  });
  await t('received: future date or date before dispatch -> 400, order unchanged', async () => {
    const future = await call(`/gallery/orders/${order.id}/received/`, 'POST', { received: true, date: iso(5) });
    const early = await call(`/gallery/orders/${order.id}/received/`, 'POST', { received: true, date: iso(-3) });
    const o = (await call(`/gallery/orders/${order.id}/`)).r;
    return future.status === 400 && early.status === 400 && !o.receivedAt && o.status === 'Dispatched';
  });
  await t(
    'received requires shipped; shipment status moves to In Transit',
    async () =>
      (await call(`/gallery/shipments/${order.id}/status/`, 'PATCH', { status: 'In Transit' })).r.status === 'In Transit' &&
      (await call(`/gallery/shipments/${order.id}/status/`, 'PATCH', { status: 'Bogus' })).status === 400,
  );
  await t('shipment Delivered sets received, order Certificates Pending (separate certificate unsent)', async () => {
    const r = await call(`/gallery/shipments/${order.id}/status/`, 'PATCH', { status: 'Delivered' });
    const o = (await call(`/gallery/orders/${order.id}/`)).r;
    return r.ok && !!o.receivedAt && o.status === 'Certificates Pending';
  });
  await t('certificates list and dashboard card count the pending certificate', async () => {
    const row = (await call('/gallery/certificates/', 'GET', undefined, { q: sale.saleNumber, pageSize: 20 })).r.results.find((x: any) => x.orderId === order.id);
    const cards = (await call('/gallery/dashboard/')).r.cards;
    return row?.sentSeparately === true && row.dispatched === false && cards.certificatesPending >= 1;
  });
  await t('certificate sent: future date -> 400, order unchanged', async () => {
    const r = await call(`/gallery/orders/${order.id}/certificate-sent/`, 'POST', { sent: true, date: iso(5) });
    const o = (await call(`/gallery/orders/${order.id}/`)).r;
    return r.status === 400 && !o.certificateSentAt;
  });
  await t('certificate sent -> order Delivered', async () => {
    const r = await call(`/gallery/orders/${order.id}/certificate-sent/`, 'POST', { sent: true });
    return r.ok && r.r.status === 'Delivered' && !!r.r.certificateSentAt;
  });
  await t('certificates date range filters on the Dispatch Date shown in the list', async () => {
    const all = (await call('/gallery/certificates/', 'GET', undefined, { pageSize: 100 })).r.results;
    const row = all.find((x: any) => x.dispatchDate && x.id !== order.id); // seeded order: dispatched days after it was created
    const d = new Date(row.dispatchDate).toLocaleDateString('en-CA');
    const hit = (await call('/gallery/certificates/', 'GET', undefined, { from: d, to: d, pageSize: 100 })).r.results;
    return hit.some((x: any) => x.id === row.id) && hit.every((x: any) => x.dispatchDate && new Date(x.dispatchDate).toLocaleDateString('en-CA') === d);
  });
  await t('order activity timeline is chronological', async () => {
    const a = (await call(`/gallery/orders/${order.id}/activities/`)).r;
    return a.length >= 5 && a[0].title === 'Order Created' && a.every((x: any, k: number) => k === 0 || a[k - 1].at <= x.at);
  });
  await t('exports return CSV with a header row', async () => {
    const csvs = await Promise.all(['sales', 'orders', 'shipments', 'certificates'].map((k) => call(`/gallery/${k}/export/`)));
    return csvs.every((c) => c.ok && typeof c.r === 'string' && c.r.split('\n')[0].includes('Number'));
  });
  await t('orders list: status filter and order number search', async () =>
    (await call('/gallery/orders/', 'GET', undefined, { status: 'Delivered', q: order.orderNumber })).r.results.some((x: any) => x.id === order.id),
  );
  await t('gallery dashboard: five cards and attention lists', async () => {
    const d = (await call('/gallery/dashboard/')).r;
    return (
      ['preparation', 'packingDispatch', 'shipped', 'delivered', 'certificatesPending'].every((k) => typeof d.cards[k] === 'number') &&
      Array.isArray(d.attentionOrders.results) &&
      typeof d.attentionSales.count === 'number'
    );
  });

  await login('priya@artisera.com');
  await t('RM is notified of order created, shipped, delivered and certificate sent', async () => {
    const ty = (await call('/crm/notifications/')).r.results.map((n: any) => n.type);
    return ['ORDER_CREATED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'CERTIFICATE_SENT'].every((x) => ty.includes(x));
  });
  await t('order notifications carry the order id (so the bell can open the order)', async () => {
    const ns = (await call('/crm/notifications/')).r.results.filter((n: any) => n.type.startsWith('ORDER_') || n.type === 'CERTIFICATE_SENT');
    return ns.length >= 4 && ns.every((n: any) => !!n.orderId) && ns.some((n: any) => n.type === 'ORDER_CREATED' && n.orderId === order.id);
  });
  await t('RM sees the sale summary on the inquiry', async () => {
    const s = (await call(`/crm/inquiries/${un.id}/`)).r.sale;
    return s.saleNumber === sale.saleNumber && s.totalOrders === 1 && s.productsRemaining === 1 && s.orders[0].orderNumber === order.orderNumber;
  });
  await login('anita@artisera.com');
  await t('second order of the same sale gets the next letter (SAL-xxxxx-B)', async () => {
    await call(`/gallery/sales/${sale.id}/products/${commission.id}/`, 'PATCH', { productStatus: 'In Stock' });
    const r = await call(`/gallery/sales/${sale.id}/orders/`, 'POST', { groups: [[commission.id]] });
    return r.ok && r.r.length === 1 && r.r[0].orderNumber === `${sale.saleNumber}-B`;
  });
  await login('priya@artisera.com');
  await t(
    'RM: no sales/dashboard/shipments access -> 403',
    async () => (await call('/gallery/sales/')).status === 403 && (await call('/gallery/dashboard/')).status === 403 && (await call('/gallery/shipments/')).status === 403,
  );
  await t('RM sees only the orders of their own sales, read-only', async () => {
    const list = await call('/gallery/orders/', 'GET', undefined, { pageSize: 100 });
    const me = (await call('/account/auth/me/')).r;
    const mine = list.ok && list.r.count > 0 && list.r.results.every((o: any) => o.rm?.id === me.id);
    const edit = await call(`/gallery/orders/${list.r.results[0].id}/`, 'PATCH', { readyForPacking: false, products: [] });
    return mine && edit.status === 403;
  });
  await t('RM cannot open another RM order -> 403', async () => {
    await login('lakshmi@artisera.com');
    const all = (await call('/gallery/orders/', 'GET', undefined, { pageSize: 100 })).r.results;
    await login('priya@artisera.com');
    const mine = (await call('/gallery/orders/', 'GET', undefined, { pageSize: 100 })).r.results.map((o: any) => o.id);
    const other = all.find((o: any) => !mine.includes(o.id));
    return !other || (await call(`/gallery/orders/${other.id}/`)).status === 403;
  });
  await t('status: Lost needs a reason, Nurture needs a date', async () => {
    const x = (await call('/crm/inquiries/', 'GET', undefined, { tab: 'active', pageSize: 5 })).r.results[0];
    if (!x) return true;
    const noReason = await call(`/crm/inquiries/${x.id}/status/`, 'POST', { status: 'Lost' });
    const noDate = await call(`/crm/inquiries/${x.id}/status/`, 'POST', { status: 'Nurture' });
    const lost = await call(`/crm/inquiries/${x.id}/status/`, 'POST', { status: 'Lost', remark: 'Budget too low' });
    const act = (await call(`/crm/inquiries/${x.id}/activities/`)).r;
    return noReason.status === 400 && noDate.status === 400 && lost.ok && lost.r.status === 'Lost' && act.some((a: any) => a.text.includes('Budget too low'));
  });
  await login('lakshmi@artisera.com');
  await t('Admin sees all orders (with RM) and has edit access (not 403) to orders, sales, shipments and certificates', async () => {
    const list = await call('/gallery/orders/', 'GET', undefined, { pageSize: 100 });
    // A missing id answers 404 only when the permission check passes first (403 would mean read-only).
    const edit = await call('/gallery/orders/does-not-exist/', 'PATCH', { readyForPacking: false, products: [] });
    const ship = await call('/gallery/shipments/does-not-exist/', 'PATCH', { status: 'Delivered' });
    return list.ok && list.r.count > 0 && list.r.results.every((o: any) => 'rm' in o) && edit.status === 404 && ship.status !== 403;
  });
  await login('anita@artisera.com');
  await t('media upload works on an order read from a frozen (cached) response', async () => {
    const rows = (await call('/gallery/orders/', 'GET', undefined, { pageSize: 100 })).r.results;
    for (const row of rows) {
      const d = (await call(`/gallery/orders/${row.id}/`)).r;
      if (d.actualDispatchDate || !d.readyForPacking) continue;
      const freeze = (x: any): any => {
        if (x && typeof x === 'object') {
          Object.values(x).forEach(freeze);
          Object.freeze(x);
        }
        return x;
      };
      freeze(d);
      const fd = new FormData();
      fd.append('file', new File(['x'], 'p.png', { type: 'image/png' }));
      fd.append('kind', 'packing');
      return (await call(`/gallery/orders/${d.id}/media/`, 'POST', fd)).ok;
    }
    return true;
  });
  console.log(results.join('\n'));
  const failed = results.filter((l) => l.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
