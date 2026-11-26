import { endOfDay, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { v4 as uuid } from './uuid';
import { dayOf, isFutureDay } from '@/lib/dates';
import { artists, customers, inquiries, logs, orders, saleProducts, sales } from './seed';
import { adminIds, can, fail, galleryIds, has, isAdmin, match, need, needFields, notify, nowIso, paginate, sortBy, summary } from './helpers';
import type { RawInquiry, RawOrder, RawSale, RawSaleProduct } from './db';
import {
  CERTIFICATE_PLANS,
  COURIERS,
  MEDIA_MAX_BYTES,
  PACKAGING_TYPES,
  PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
  requiresReadyDate,
  requiresShipmentDate,
} from '@/lib/constants';
import type {
  AttentionSale,
  CertificateRow,
  GalleryDashboard,
  LogEntry,
  OrderDetail,
  OrderPackage,
  OrderRow,
  OrderStatus,
  Sale,
  SaleDetail,
  SalePendingWith,
  SaleProduct,
  SaleSummary,
  ShipmentRow,
  User,
} from '@/lib/types';

export const NOT_HANDLED = Symbol('not-handled');

type Params = Record<string, string | undefined>;
const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T => list.includes(value as T);

const saleOf = (id: string) => sales.find((s) => s.id === id);
const inquiryOf = (s: RawSale) => inquiries.find((i) => i.id === s.inquiryId)!;
const customerOf = (s: RawSale) => customers.find((c) => c.id === s.customerId)!;
const productsOf = (saleId: string) => saleProducts.filter((p) => p.saleId === saleId);
const ordersOf = (saleId: string) => orders.filter((o) => o.saleId === saleId);
const saleNumber = (s: RawSale) => `SAL-${String(s.number).padStart(5, '0')}`;
// An order that holds every product of the sale uses the plain sale number. When a sale is split into several orders they are lettered in creation order: first A, then B, and so on.
const orderNumber = (o: RawOrder) => (o.suffix ? `${saleNumber(saleOf(o.saleId)!)}-${o.suffix}` : saleNumber(saleOf(o.saleId)!));
const separately = (s: RawSale) => s.certificatePlan === 'Send Separately';
const orderProducts = (o: RawOrder) => saleProducts.filter((p) => p.orderId === o.id);
const orderValue = (o: RawOrder) => orderProducts(o).reduce((sum, p) => sum + p.listedPrice * p.quantity, 0);

const suffixFor = (index: number) => {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};

export function orderStatus(o: RawOrder): OrderStatus {
  const sale = saleOf(o.saleId)!;
  let base: OrderStatus = 'Preparation';
  if (o.receivedAt) base = 'Delivered';
  else if (o.actualDispatchDate) base = 'Dispatched';
  else if (o.readyForPacking) base = 'Packing';
  return base === 'Delivered' && separately(sale) && !o.certificateSentAt ? 'Certificates Pending' : base;
}

const certificateDispatched = (o: RawOrder) => (separately(saleOf(o.saleId)!) ? Boolean(o.certificateSentAt) : Boolean(o.actualDispatchDate) && o.certificateIncluded);
// The date shown in the Certificates list's Dispatch Date column. The date-range filter must use the same one.
const certificateDate = (o: RawOrder) => (separately(saleOf(o.saleId)!) ? o.certificateSentAt : o.actualDispatchDate);
const certificatePending = (o: RawOrder) => separately(saleOf(o.saleId)!) && !o.certificateSentAt;

function pendingWith(s: RawSale): SalePendingWith | null {
  const open = productsOf(s.id).filter((p) => !p.orderId);
  if (open.length === 0) return null;
  if (!s.rmNotifiedAt) return 'RM email not received';
  if (open.some((p) => p.productStatus === 'In Stock')) return 'Order not created';
  if (open.some((p) => requiresReadyDate(p.productStatus) && !p.commissionReadyDate)) return 'Details incomplete';
  return s.paymentStatus === 'Pending' ? 'Awaiting customer confirmation' : null;
}

export function serSaleSummary(s: RawSale): SaleSummary {
  const products = productsOf(s.id);
  const os = ordersOf(s.id);
  return {
    id: s.id,
    saleNumber: saleNumber(s),
    saleDate: s.saleDate,
    totalValue: s.totalValue,
    paymentStatus: s.paymentStatus,
    totalOrders: os.length,
    totalProducts: products.length,
    productsRemaining: products.filter((p) => !p.orderId).length,
    orders: os.map((o) => ({ id: o.id, orderNumber: orderNumber(o), status: orderStatus(o) })),
    emailStatus: s.rmNotifiedAt ? 'Received' : s.rmEmailSentAt ? 'Sent' : 'Pending',
    emailSentAt: s.rmEmailSentAt ?? null,
  };
}

function serSale(s: RawSale): Sale {
  const c = customerOf(s);
  const inq = inquiryOf(s);
  const sum = serSaleSummary(s);
  return {
    id: s.id,
    saleNumber: sum.saleNumber,
    inquiry: { id: inq.id, code: inq.code },
    customer: { id: c.id, code: c.code, name: c.name, phone: c.phone, email: c.email ?? null, location: c.location ?? null, state: c.state ?? null },
    rm: summary(s.rmId),
    emailConfirmed: Boolean(s.rmNotifiedAt),
    saleDate: s.saleDate,
    totalValue: s.totalValue,
    totalOrders: sum.totalOrders,
    totalProducts: sum.totalProducts,
    productsRemaining: sum.productsRemaining,
    certificatePlan: s.certificatePlan,
    certificateSeparately: separately(s),
    paymentStatus: s.paymentStatus,
    pendingWith: pendingWith(s),
  };
}

function serProduct(p: RawSaleProduct): SaleProduct {
  const artist = artists.find((a) => a.id === p.artistId);
  const order = orders.find((o) => o.id === p.orderId);
  return {
    id: p.id,
    name: p.name,
    artist: artist ? { id: artist.id, name: artist.name } : null,
    url: p.url,
    imageUrl: p.imageUrl,
    listedPrice: p.listedPrice,
    quantity: p.quantity,
    productStatus: p.productStatus,
    commissionReadyDate: p.commissionReadyDate,
    orderNotes: p.orderNotes,
    orderId: p.orderId,
    orderNumber: order ? orderNumber(order) : null,
  };
}

function serOrderRow(o: RawOrder): OrderRow {
  const s = saleOf(o.saleId)!;
  const c = customerOf(s);
  return {
    id: o.id,
    orderNumber: orderNumber(o),
    saleId: s.id,
    saleNumber: saleNumber(s),
    customer: { id: c.id, name: c.name },
    rm: summary(s.rmId),
    orderDate: o.createdAt,
    totalProducts: orderProducts(o).length,
    orderValue: orderValue(o),
    status: orderStatus(o),
    certificateSeparately: separately(s),
  };
}

function serOrder(o: RawOrder): OrderDetail {
  const s = saleOf(o.saleId)!;
  const inq = inquiryOf(s);
  return {
    ...serOrderRow(o),
    inquiry: { id: inq.id, code: inq.code },
    saleDate: s.saleDate,
    products: orderProducts(o).map((p) => ({ ...serProduct(p), photoVideoUploaded: p.photoVideoUploaded })),
    readyForPacking: o.readyForPacking,
    packages: o.packages.map((x) => ({ ...x })),
    media: o.media.map((x) => ({ ...x })),
    courier: o.courier,
    waybill: o.waybill,
    actualDispatchDate: o.actualDispatchDate,
    certificateIncluded: o.certificateIncluded,
    invoiceIncluded: o.invoiceIncluded,
    shipmentStatus: o.shipmentStatus,
    receivedAt: o.receivedAt,
    certificateSentAt: o.certificateSentAt,
  };
}

function serShipment(o: RawOrder): ShipmentRow {
  const row = serOrderRow(o);
  return {
    id: o.id,
    orderId: o.id,
    orderNumber: row.orderNumber,
    saleId: row.saleId,
    saleNumber: row.saleNumber,
    customerName: row.customer.name,
    rmName: row.rm?.name ?? null,
    courier: o.courier,
    trackingNo: o.waybill,
    dispatchDate: o.actualDispatchDate,
    status: o.shipmentStatus ?? 'In Transit',
    statusUpdatedAt: o.shipmentStatusAt,
  };
}

function serCertificate(o: RawOrder): CertificateRow {
  const row = serOrderRow(o);
  const sep = separately(saleOf(o.saleId)!);
  return {
    id: o.id,
    orderId: o.id,
    orderNumber: row.orderNumber,
    saleId: row.saleId,
    saleNumber: row.saleNumber,
    customerName: row.customer.name,
    rmName: row.rm?.name ?? null,
    dispatchDate: certificateDate(o),
    sentSeparately: sep,
    dispatched: certificateDispatched(o),
    sentAt: o.certificateSentAt,
  };
}

const toLog = (l: (typeof logs)[number]): LogEntry => ({ id: l.id, title: l.title, text: l.text, by: summary(l.byId) ?? { id: l.byId, name: 'System' }, at: l.at });
const addLog = (scope: 'sale' | 'order', refId: string, title: string, text: string, byId: string) => logs.push({ id: uuid(), scope, refId, title, text, byId, at: nowIso() });

const inRange = (iso: string, params: Params) => {
  const at = parseISO(iso);
  if (params.from && isBefore(at, startOfDay(parseISO(params.from)))) return false;
  if (params.to && isAfter(at, endOfDay(parseISO(params.to)))) return false;
  return true;
};

const csv = (head: string[], rows: (string | number | null)[][]) => [head, ...rows].map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
const day = (iso: string | null) => (iso ? format(parseISO(iso), 'yyyy-MM-dd') : '');

export function createSaleFromInquiry(inq: RawInquiry, actor: User, data: Record<string, any>): RawSale {
  needFields(data, ['totalValue', 'saleDate', 'certificatePlan', 'shipmentPriority', 'paymentStatus']);
  const errors: Record<string, string[]> = {};
  if (!(Number(data.totalValue) > 0)) errors.totalValue = ['Must be greater than 0.'];
  if (!CERTIFICATE_PLANS.some((x) => x.value === data.certificatePlan)) errors.certificatePlan = ['Invalid certificate plan.'];
  if (!oneOf(SHIPMENT_PRIORITIES, data.shipmentPriority)) errors.shipmentPriority = ['Invalid shipment priority.'];
  if (requiresShipmentDate(data.shipmentPriority) && !data.requiredShipmentDate) errors.requiredShipmentDate = ['Select the required shipment date.'];
  if (!oneOf(PAYMENT_STATUSES, data.paymentStatus)) errors.paymentStatus = ['Invalid payment status.'];
  const list: Record<string, any>[] = Array.isArray(data.products) ? data.products : [];
  if (!list.length) errors.products = ['Add at least one product.'];
  list.forEach((p, n) => {
    if (!String(p.name ?? '').trim()) errors[`products.${n}.name`] = ['This field is required.'];
    if (!(Number(p.listedPrice) > 0)) errors[`products.${n}.listedPrice`] = ['Must be greater than 0.'];
    if (!(Number(p.quantity) >= 1)) errors[`products.${n}.quantity`] = ['Must be at least 1.'];
    if (!oneOf(PRODUCT_STATUSES, p.productStatus)) errors[`products.${n}.productStatus`] = ['Invalid product status.'];
    if (requiresReadyDate(p.productStatus) && !p.commissionReadyDate)
      errors[`products.${n}.commissionReadyDate`] = ['Ready date is required for With Artist and Commission products.'];
  });
  if (Object.keys(errors).length) fail(400, errors);

  const at = nowIso();
  const sale: RawSale = {
    id: uuid(),
    number: sales.reduce((max, s) => Math.max(max, s.number), 0) + 1,
    inquiryId: inq.id,
    customerId: inq.customerId,
    rmId: inq.rmId,
    saleDate: data.saleDate,
    totalValue: Number(data.totalValue),
    notes: data.notes || null,
    certificatePlan: data.certificatePlan,
    shipmentPriority: data.shipmentPriority,
    requiredShipmentDate: requiresShipmentDate(data.shipmentPriority) ? data.requiredShipmentDate : null,
    shipmentInstructions: data.shipmentInstructions || null,
    paymentStatus: data.paymentStatus,
    paymentNotes: data.paymentNotes || null,
    rmNotifiedAt: null, // every new sale starts as RM email Pending until the Gallery Manager marks it Received
    createdAt: at,
  };
  sales.unshift(sale);
  list.forEach((p) =>
    saleProducts.push({
      id: uuid(),
      saleId: sale.id,
      name: String(p.name).trim(),
      artistId: p.artistId || null,
      url: p.url || null,
      imageUrl: null,
      listedPrice: Number(p.listedPrice),
      quantity: Number(p.quantity),
      productStatus: p.productStatus,
      commissionReadyDate: requiresReadyDate(p.productStatus) ? p.commissionReadyDate : null,
      orderNotes: p.orderNotes || null,
      orderId: null,
      photoVideoUploaded: false,
    }),
  );
  addLog('sale', sale.id, 'Sale Created', `Sale ${saleNumber(sale)} created from ${inq.code} with ${list.length} product(s).`, actor.id);
  notify(galleryIds(), actor.id, 'SALE_WON', 'New won sale', `${saleNumber(sale)} (${customerOf(sale).name}) was marked Won by ${actor.name}.`, { saleId: sale.id });
  return sale;
}

const getSale = (id: string) => saleOf(id) ?? fail(404, 'Sale not found.');
const getOrder = (id: string) => orders.find((o) => o.id === id) ?? fail(404, 'Order not found.');
const notifyOrder = (o: RawOrder, actor: User, type: 'ORDER_CREATED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'CERTIFICATE_SENT', title: string, text: string) => {
  const s = saleOf(o.saleId)!;
  notify([s.rmId, ...adminIds()], actor.id, type, title, `${orderNumber(o)}: ${text}`, { inquiryId: s.inquiryId, orderId: o.id });
};

function saleMatches(s: RawSale, params: Params) {
  const c = customerOf(s);
  const text = has(params.q, saleNumber(s), inquiryOf(s).code, c.name) || productsOf(s.id).some((p) => has(params.q, p.name, artists.find((a) => a.id === p.artistId)?.name));
  if (!text || !inRange(s.saleDate, params) || (params.customerId && s.customerId !== params.customerId)) return false;
  const os = ordersOf(s.id);
  if (params.orderStatus === 'none' && os.length) return false;
  if (params.orderStatus && params.orderStatus !== 'none' && !os.some((o) => orderStatus(o) === params.orderStatus)) return false;
  if (params.certificateStatus === 'with-shipment' && separately(s)) return false;
  if (params.certificateStatus === 'pending' && !(separately(s) && (os.length === 0 || os.some((o) => !o.certificateSentAt)))) return false;
  if (params.certificateStatus === 'sent' && !(separately(s) && os.length > 0 && os.every((o) => o.certificateSentAt))) return false;
  return true;
}

const filteredSales = (params: Params) =>
  sortBy(
    sales.filter((s) => saleMatches(s, params)),
    (s) => s.number,
    -1,
  );
const sees = (u: User, s: RawSale) => isAdmin(u) || can(u, 'sales', 'view') || s.rmId === u.id;
const visibleOrder = (u: User, o: RawOrder) => {
  if (!sees(u, saleOf(o.saleId)!)) fail(403, 'You can only view orders for your own sales.');
  return o;
};

const filteredOrders = (u: User, params: Params) =>
  sortBy(
    orders.filter((o) => {
      const s = saleOf(o.saleId)!;
      return (
        sees(u, s) &&
        inRange(o.createdAt, params) &&
        (!params.status || orderStatus(o) === params.status) &&
        (!params.customerId || s.customerId === params.customerId) &&
        has(params.q, orderNumber(o), saleNumber(s), customerOf(s).name, ...orderProducts(o).map((p) => p.name))
      );
    }),
    (o) => o.createdAt,
    -1,
  );
const filteredShipments = (params: Params) =>
  sortBy(
    orders.filter((o) => {
      const s = saleOf(o.saleId)!;
      return (
        Boolean(o.actualDispatchDate) &&
        inRange(o.actualDispatchDate!, params) &&
        (!params.courier || o.courier === params.courier) &&
        (!params.status || (o.shipmentStatus ?? 'In Transit') === params.status) &&
        has(params.q, orderNumber(o), saleNumber(s), customerOf(s).name, o.courier, o.waybill)
      );
    }),
    (o) => o.actualDispatchDate ?? '',
    -1,
  );
const filteredCertificates = (params: Params) =>
  sortBy(
    orders.filter((o) => {
      const s = saleOf(o.saleId)!;
      const shownOn = certificateDate(o);
      const dateOk = !(params.from || params.to) || (shownOn !== null && inRange(shownOn, params));
      return dateOk && (!params.customerId || s.customerId === params.customerId) && has(params.q, orderNumber(o), saleNumber(s), customerOf(s).name);
    }),
    (o) => o.createdAt,
    -1,
  );

function validatePackages(list: unknown): OrderPackage[] {
  const packages = Array.isArray(list) ? (list as OrderPackage[]) : [];
  if (!packages.length) fail(400, { packages: ['Add at least one package.'] });
  return packages.map((p, n) => {
    if (!oneOf(PACKAGING_TYPES, p.packagingType)) fail(400, { [`packages.${n}.packagingType`]: ['Select the packaging type.'] });
    (['lengthCm', 'widthCm', 'heightCm', 'weightKg'] as const).forEach((k) => {
      if (p[k] !== null && p[k] !== undefined && !(Number(p[k]) > 0)) fail(400, { [`packages.${n}.${k}`]: ['Must be greater than 0.'] });
    });
    return {
      id: p.id ?? uuid(),
      packagingType: p.packagingType,
      lengthCm: p.lengthCm === null || p.lengthCm === undefined ? null : Number(p.lengthCm),
      widthCm: p.widthCm === null || p.widthCm === undefined ? null : Number(p.widthCm),
      heightCm: p.heightCm === null || p.heightCm === undefined ? null : Number(p.heightCm),
      weightKg: p.weightKg === null || p.weightKg === undefined ? null : Number(p.weightKg),
      notes: String(p.notes ?? '').slice(0, 200),
    };
  });
}

export async function galleryRoutes(u: User, m: string, url: string, data: any, params: Params): Promise<unknown> {
  let p: Record<string, string> | null;

  if (match(url, '/gallery/customers') && m === 'GET') {
    need(u, 'orders', 'view');
    const ids = new Set(sales.filter((s) => sees(u, s)).map((s) => s.customerId));
    return customers.filter((c) => ids.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
  }

  if (match(url, '/gallery/dashboard') && m === 'GET') {
    need(u, 'sales', 'view');
    const inScope = orders.filter((o) => inRange(o.createdAt, params));
    const count = (status: OrderStatus) => inScope.filter((o) => orderStatus(o) === status).length;
    const attentionOrders = sortBy(
      orders.filter((o) => orderStatus(o) !== 'Delivered'),
      (o) => o.createdAt,
      -1,
    );
    const attentionSales = sortBy(
      sales.filter((s) => pendingWith(s)),
      (s) => s.saleDate,
      -1,
    );
    const res: GalleryDashboard = {
      cards: {
        preparation: count('Preparation'),
        packingDispatch: count('Packing'),
        shipped: count('Dispatched'),
        delivered: count('Delivered'),
        certificatesPending: inScope.filter(certificatePending).length,
      },
      attentionOrders: { count: attentionOrders.length, results: attentionOrders.slice(0, 5).map(serOrderRow) },
      attentionSales: {
        count: attentionSales.length,
        results: attentionSales.slice(0, 5).map<AttentionSale>((s) => ({
          id: s.id,
          saleNumber: saleNumber(s),
          customerName: customerOf(s).name,
          saleDate: s.saleDate,
          totalValue: s.totalValue,
          emailConfirmed: Boolean(s.rmNotifiedAt),
          pendingWith: pendingWith(s)!,
        })),
      },
    };
    return res;
  }

  if (match(url, '/gallery/sales/export') && m === 'GET') {
    need(u, 'sales', 'view');
    return csv(
      ['Sale Number', 'Customer', 'Sale Date', 'Total Sale Value', 'Total Orders', 'Total Products', 'Products Remaining', 'Certificate Sent Separately'],
      filteredSales(params)
        .map(serSale)
        .map((s) => [s.saleNumber, s.customer.name, day(s.saleDate), s.totalValue, s.totalOrders, s.totalProducts, s.productsRemaining, s.certificateSeparately ? 'Yes' : 'No']),
    );
  }
  if (match(url, '/gallery/sales') && m === 'GET') {
    need(u, 'sales', 'view');
    return paginate(filteredSales(params).map(serSale), params);
  }
  if ((p = match(url, '/gallery/sales/:id')) && m === 'GET') {
    need(u, 'sales', 'view');
    const s = getSale(p.id);
    const detail: SaleDetail = {
      ...serSale(s),
      rmNotification: {
        status: s.rmNotifiedAt ? 'Received' : s.rmEmailSentAt ? 'Sent' : 'Pending',
        at: s.rmNotifiedAt,
        sentAt: s.rmEmailSentAt ?? null,
        overridden: Boolean(s.emailOverridden),
      },
      notes: s.notes,
      shipmentPriority: s.shipmentPriority,
      requiredShipmentDate: s.requiredShipmentDate,
      shipmentInstructions: s.shipmentInstructions,
      paymentNotes: s.paymentNotes,
      products: productsOf(s.id).map(serProduct),
      orders: sortBy(ordersOf(s.id), (o) => o.suffix).map(serOrderRow),
    };
    return detail;
  }
  if ((p = match(url, '/gallery/sales/:id/products/:productId')) && m === 'PATCH') {
    need(u, 'sales', 'edit');
    const s = getSale(p.id);
    const product = productsOf(s.id).find((x) => x.id === p!.productId) ?? fail(404, 'Product not found.');
    if (product.orderId) fail(409, 'This product is already part of an order.');
    if (data.productStatus !== undefined && !oneOf(PRODUCT_STATUSES, data.productStatus)) fail(400, { productStatus: ['Invalid product status.'] });
    const nextStatus = data.productStatus !== undefined ? data.productStatus : product.productStatus;
    const nextDate = !requiresReadyDate(nextStatus) ? null : data.commissionReadyDate !== undefined ? data.commissionReadyDate || null : product.commissionReadyDate;
    if (requiresReadyDate(nextStatus) && !nextDate) fail(400, { commissionReadyDate: ['Ready date is required for With Artist and Commission products.'] });
    product.productStatus = nextStatus;
    product.commissionReadyDate = nextDate;
    if (data.orderNotes !== undefined) product.orderNotes = String(data.orderNotes).slice(0, 300) || null;
    addLog('sale', s.id, 'Product Updated', `${product.name}: ${product.productStatus}.`, u.id);
    return serProduct(product);
  }
  if ((p = match(url, '/gallery/sales/:id/email-override')) && m === 'POST') {
    need(u, 'sales', 'edit');
    const s = getSale(p.id);
    if (s.rmNotifiedAt) fail(409, 'The RM email is already marked as Received for this sale.');
    // Override: the Gallery Manager goes ahead even though the RM never sent the email.
    s.rmNotifiedAt = nowIso();
    s.emailOverridden = true;
    addLog('sale', s.id, 'RM Email Override', 'Gallery Manager proceeded without the RM email (override).', u.id);
    return { id: s.id, emailConfirmed: true };
  }
  if ((p = match(url, '/gallery/sales/:id/email-received')) && m === 'POST') {
    need(u, 'sales', 'edit');
    const s = getSale(p.id);
    if (s.rmNotifiedAt) fail(409, 'The RM email is already marked as Received for this sale.');
    s.rmNotifiedAt = nowIso();
    s.emailOverridden = false;
    addLog('sale', s.id, 'RM Email Received', 'Gallery Manager marked the RM email as Received.', u.id);
    return { id: s.id, emailConfirmed: true };
  }
  if ((p = match(url, '/gallery/sales/:id/email-sent')) && m === 'POST') {
    // The RM who owns the sale (or an admin) tells the Gallery Manager the email has been sent.
    const s = getSale(p.id);
    if (s.rmId !== u.id && !isAdmin(u)) fail(403, 'You do not have permission to do this.');
    if (s.rmNotifiedAt) fail(409, 'The Gallery Manager has already received this sale.');
    if (s.rmEmailSentAt) fail(409, 'The email is already marked as sent.');
    s.rmEmailSentAt = nowIso();
    addLog('sale', s.id, 'RM Email Sent', `${u.name} marked the email to the Gallery Manager as sent.`, u.id);
    notify(galleryIds(), u.id, 'SALE_EMAIL_SENT', 'RM email sent', `${saleNumber(s)} (${customerOf(s).name}): ${u.name} marked the email as sent.`, { saleId: s.id });
    return { id: s.id };
  }
  if ((p = match(url, '/gallery/sales/:id/orders')) && m === 'POST') {
    need(u, 'orders', 'create');
    const s = getSale(p.id);
    if (!s.rmNotifiedAt) fail(409, 'Orders can be created only after the RM email is marked as Received.');
    // Each group becomes one order. `productIds` is accepted as a single group.
    const groups: string[][] = Array.isArray(data?.groups) ? data.groups : Array.isArray(data?.productIds) ? [data.productIds] : [];
    if (!groups.length || groups.some((g) => !Array.isArray(g) || g.length === 0)) fail(400, { groups: ['Select at least one product for every group.'] });
    const flat = groups.flat();
    if (new Set(flat).size !== flat.length) fail(400, { groups: ['A product can belong to only one group.'] });
    const chosenGroups = groups.map((g) => g.map((id) => productsOf(s.id).find((x) => x.id === id) ?? fail(400, { groups: ['A selected product does not belong to this sale.'] })));
    chosenGroups.flat().forEach((x) => {
      if (x.productStatus !== 'In Stock') fail(409, `${x.name} is not In Stock.`);
      if (x.orderId) fail(409, `${x.name} is already part of an order.`);
    });
    const existing = ordersOf(s.id);
    const created = chosenGroups.map((chosen, i) => {
      const plain = existing.length === 0 && chosenGroups.length === 1 && chosen.length === productsOf(s.id).length;
      const order: RawOrder = {
        id: uuid(),
        saleId: s.id,
        suffix: plain ? '' : suffixFor(existing.length + i),
        readyForPacking: false,
        packages: [],
        media: [],
        courier: null,
        waybill: null,
        actualDispatchDate: null,
        certificateIncluded: !separately(s),
        invoiceIncluded: true,
        shipmentStatus: null,
        shipmentStatusAt: null,
        receivedAt: null,
        certificateSentAt: null,
        createdAt: nowIso(),
      };
      orders.push(order);
      chosen.forEach((x) => {
        x.orderId = order.id;
        x.photoVideoUploaded = false;
      });
      addLog('order', order.id, 'Order Created', `Order ${orderNumber(order)} created with ${chosen.length} product(s).`, u.id);
      addLog('sale', s.id, 'Order Created', `Order ${orderNumber(order)} created.`, u.id);
      notifyOrder(order, u, 'ORDER_CREATED', 'Order created', `created with ${chosen.length} product(s).`);
      return order;
    });
    return created.map(serOrder);
  }

  if (match(url, '/gallery/orders/export') && m === 'GET') {
    need(u, 'orders', 'view');
    return csv(
      ['Order Number', 'Sale Number', 'Customer', 'Relationship Manager', 'Order Date', 'Total Products', 'Order Value', 'Status'],
      filteredOrders(u, params)
        .map(serOrderRow)
        .map((o) => [o.orderNumber, o.saleNumber, o.customer.name, o.rm?.name ?? '', day(o.orderDate), o.totalProducts, o.orderValue, o.status]),
    );
  }
  if (match(url, '/gallery/orders') && m === 'GET') {
    need(u, 'orders', 'view');
    return paginate(filteredOrders(u, params).map(serOrderRow), params);
  }
  if ((p = match(url, '/gallery/orders/:id')) && m === 'GET') {
    need(u, 'orders', 'view');
    return serOrder(visibleOrder(u, getOrder(p.id)));
  }
  if ((p = match(url, '/gallery/orders/:id')) && m === 'PATCH') {
    need(u, 'orders', 'edit');
    const o = getOrder(p.id);
    if (o.readyForPacking) fail(409, 'This order is ready for packing and can no longer be modified.');
    const flags: { id: string; photoVideoUploaded: boolean }[] = Array.isArray(data?.products) ? data.products : [];
    flags.forEach((f) => {
      const product = orderProducts(o).find((x) => x.id === f.id);
      if (product) product.photoVideoUploaded = Boolean(f.photoVideoUploaded);
    });
    const ready = Boolean(data?.readyForPacking);
    if (ready && !orderProducts(o).every((x) => x.photoVideoUploaded))
      fail(400, { readyForPacking: ['Upload photos or videos and tick Photo/Video Uploaded for every product before marking the order ready.'] });
    o.readyForPacking = ready;
    addLog('order', o.id, ready ? 'Ready for Packing' : 'Order Saved', ready ? 'Marked ready for packing.' : 'Order details saved.', u.id);
    return serOrder(o);
  }
  if ((p = match(url, '/gallery/orders/:id/activities')) && m === 'GET') {
    need(u, 'orders', 'view');
    visibleOrder(u, getOrder(p.id));
    return sortBy(
      logs.filter((l) => l.scope === 'order' && l.refId === p!.id),
      (l) => l.at,
    ).map(toLog);
  }
  if ((p = match(url, '/gallery/orders/:id/media')) && m === 'POST') {
    need(u, 'orders', 'edit');
    const o = getOrder(p.id);
    const file = data instanceof FormData ? (data.get('file') as File | null) : null;
    const kind = data instanceof FormData ? String(data.get('kind') ?? 'product') : 'product';
    if (!file) fail(400, { file: ['This field is required.'] });
    if (!['image/jpeg', 'image/png', 'video/mp4'].includes(file.type)) fail(400, { file: ['Only JPG, PNG or MP4 files are allowed.'] });
    if (file.size > MEDIA_MAX_BYTES) fail(400, { file: ['File must be 100 MB or smaller.'] });
    if (kind !== 'product' && kind !== 'packing') fail(400, { kind: ['Invalid media kind.'] });
    // The normal flow is strict (see PATCH /orders/:id), but photos and videos can still be added later, even after packing or dispatch.
    const media = {
      id: uuid(),
      kind,
      type: file.type.startsWith('video') ? 'video' : 'image',
      fileName: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      uploadedAt: nowIso(),
    } as const;
    o.media.push({ ...media });
    addLog('order', o.id, 'Media Uploaded', `${file.name} uploaded (${kind}).`, u.id);
    return media;
  }
  if ((p = match(url, '/gallery/orders/:id/media/:mediaId')) && m === 'DELETE') {
    need(u, 'orders', 'edit');
    const o = getOrder(p.id);
    const gone = o.media.find((x) => x.id === p!.mediaId) ?? fail(404, 'File not found.');
    o.media = o.media.filter((x) => x.id !== p!.mediaId);
    addLog('order', o.id, 'Media Removed', `${gone.fileName} removed (${gone.kind}).`, u.id);
    return {};
  }
  if ((p = match(url, '/gallery/orders/:id/dispatch')) && m === 'PATCH') {
    need(u, 'orders', 'edit');
    const o = getOrder(p.id);
    if (!o.readyForPacking) fail(409, 'Mark the order Ready for Packing first.');
    // Packing and shipment are saved separately: a request may carry only `packages` (Save Packing)
    // or only the shipment fields (Save Shipment Details). A full payload still works for both at once.
    const hasPackages = data?.packages !== undefined;
    const hasShipment = ['courier', 'waybill', 'actualDispatchDate', 'certificateIncluded', 'invoiceIncluded'].some((k) => data?.[k] !== undefined);
    if (!hasPackages && !hasShipment) fail(400, 'Nothing to save.');
    const errors: Record<string, string[]> = {};
    if (hasShipment) {
      if (!oneOf(COURIERS, data?.courier)) errors.courier = ['Select the courier.'];
      if (data?.actualDispatchDate && isFutureDay(data.actualDispatchDate)) errors.actualDispatchDate = ['Dispatch date cannot be in the future.'];
    }
    if (Object.keys(errors).length) fail(400, errors);
    const packages = hasPackages ? validatePackages(data.packages) : o.packages;
    if (hasShipment && data.actualDispatchDate && !packages.length) fail(400, { actualDispatchDate: ['Save the packing details before dispatching.'] });
    const wasShipped = Boolean(o.actualDispatchDate);
    if (hasPackages) {
      o.packages = packages;
      addLog('order', o.id, 'Packing Details Saved', 'Packaging details updated.', u.id);
    }
    if (hasShipment) {
      o.courier = data.courier;
      o.waybill = String(data.waybill ?? '').trim() || null;
      o.certificateIncluded = Boolean(data.certificateIncluded);
      o.invoiceIncluded = Boolean(data.invoiceIncluded);
      // The API takes a date only (yyyy-MM-dd). Once dispatched, the date can be corrected but not removed.
      if (wasShipped && !data.actualDispatchDate) fail(400, { actualDispatchDate: ['The dispatch date cannot be removed once the order is dispatched.'] });
      o.actualDispatchDate = data.actualDispatchDate || null;
      o.shipmentStatus = o.actualDispatchDate ? (o.shipmentStatus ?? 'In Transit') : null;
      if (o.actualDispatchDate && !wasShipped) o.shipmentStatusAt = nowIso();
      addLog('order', o.id, 'Shipment Details Saved', 'Shipment details updated.', u.id);
      if (o.actualDispatchDate) addLog('order', o.id, 'Dispatch Details Saved', 'Actual dispatch date set.', u.id);
      if (o.actualDispatchDate && !wasShipped) notifyOrder(o, u, 'ORDER_SHIPPED', 'Order dispatched', `dispatched via ${o.courier}${o.waybill ? ` (${o.waybill})` : ''}.`);
    }
    return serOrder(o);
  }
  if ((p = match(url, '/gallery/orders/:id/received')) && m === 'POST') {
    need(u, 'orders', 'edit');
    const o = getOrder(p.id);
    if (!o.actualDispatchDate) fail(409, 'The order has not been dispatched yet.');
    if (data?.received && data.date) {
      if (isFutureDay(data.date)) fail(400, { date: ['Received date cannot be in the future.'] });
      if (dayOf(data.date) < dayOf(o.actualDispatchDate)) fail(400, { date: ['Received date cannot be before the dispatch date.'] });
    }
    if (data?.received) {
      o.receivedAt = data.date || nowIso();
      o.shipmentStatus = 'Delivered';
      o.shipmentStatusAt = nowIso();
      addLog('order', o.id, 'Order Received', 'Customer confirmed receipt.', u.id);
      notifyOrder(o, u, 'ORDER_DELIVERED', 'Order delivered', 'was received by the customer.');
    } else {
      o.receivedAt = null;
      o.shipmentStatus = 'In Transit';
      addLog('order', o.id, 'Receipt Cleared', 'Order marked as not received.', u.id);
    }
    return serOrder(o);
  }
  if ((p = match(url, '/gallery/orders/:id/certificate-sent')) && m === 'POST') {
    need(u, 'certificates', 'edit');
    const o = getOrder(p.id);
    if (!separately(saleOf(o.saleId)!)) fail(409, 'This certificate is sent with the shipment.');
    if (data?.sent && data.date && isFutureDay(data.date)) fail(400, { date: ['Certificate sent date cannot be in the future.'] });
    if (data?.sent) {
      o.certificateSentAt = data.date || nowIso();
      addLog('order', o.id, 'Certificate Sent', 'Certificate sent separately.', u.id);
      notifyOrder(o, u, 'CERTIFICATE_SENT', 'Certificate sent', 'certificate was sent separately.');
    } else {
      o.certificateSentAt = null;
      addLog('order', o.id, 'Certificate Cleared', 'Certificate marked as not sent.', u.id);
    }
    return serOrder(o);
  }

  if (match(url, '/gallery/shipments/export') && m === 'GET') {
    need(u, 'shipments', 'view');
    return csv(
      ['Order Number', 'Sale Number', 'Customer', 'Courier', 'Tracking No', 'Dispatch Date', 'Status'],
      filteredShipments(params)
        .map(serShipment)
        .map((s) => [s.orderNumber, s.saleNumber, s.customerName, s.courier, s.trackingNo, day(s.dispatchDate), s.status]),
    );
  }
  if (match(url, '/gallery/shipments') && m === 'GET') {
    need(u, 'shipments', 'view');
    return paginate(filteredShipments(params).map(serShipment), params);
  }
  if ((p = match(url, '/gallery/shipments/:id/status')) && m === 'PATCH') {
    need(u, 'shipments', 'edit');
    const o = getOrder(p.id);
    if (!o.actualDispatchDate) fail(409, 'The order has not been dispatched yet.');
    if (!oneOf(SHIPMENT_STATUSES, data?.status)) fail(400, { status: ['Invalid shipment status.'] });
    o.shipmentStatus = data.status;
    o.shipmentStatusAt = nowIso();
    if (data.status === 'Delivered' && !o.receivedAt) {
      o.receivedAt = nowIso();
      notifyOrder(o, u, 'ORDER_DELIVERED', 'Order delivered', 'was delivered.');
    }
    if (data.status !== 'Delivered') o.receivedAt = null;
    addLog('order', o.id, 'Shipment Updated', `Shipment status: ${data.status}.`, u.id);
    return serShipment(o);
  }

  if (match(url, '/gallery/certificates/export') && m === 'GET') {
    need(u, 'certificates', 'view');
    return csv(
      ['Order Number', 'Sale Number', 'Customer', 'Dispatch Date', 'Sent Separately', 'Certificate Dispatched'],
      filteredCertificates(params)
        .map(serCertificate)
        .map((c) => [c.orderNumber, c.saleNumber, c.customerName, day(c.dispatchDate), c.sentSeparately ? 'Yes' : 'No', c.dispatched ? 'Yes' : 'No']),
    );
  }
  if (match(url, '/gallery/certificates') && m === 'GET') {
    need(u, 'certificates', 'view');
    return paginate(filteredCertificates(params).map(serCertificate), params);
  }

  return NOT_HANDLED;
}
