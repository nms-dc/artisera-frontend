import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from 'date-fns';
import { SOURCES } from '@/lib/constants';
import type { InquiryStatus, InquiryType, Permissions, Priority, Source } from '@/lib/types';
import type { RawActivity, RawArtist, RawCategory, RawCustomer, RawInquiry, RawLog, RawOrder, RawRole, RawSale, RawSaleProduct, RawSubcategory, RawUser } from './db';

let s = 42;
const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const iso = (d: Date) => d.toISOString();
const today = startOfDay(new Date());
const at = (day: number, h: number, m = 0) => iso(setMinutes(setHours(addDays(today, day), h), m));

const GALLERY = { view: true, create: true, edit: true };
const all = { view: true, create: true, edit: true, delete: true, assignRm: true };
export const roles: RawRole[] = [
  {
    id: 'ADMIN',
    name: 'Admin',
    description: 'Full system access. Manage users, masters and all inquiries.',
    status: 'Active',
    permissions: {
      inquiries: all,
      customers: all,
      masters: all,
      reports: { view: true },
      users: all,
      sales: all,
      orders: all,
      shipments: all,
      certificates: all,
    } as Permissions,
  },
  {
    id: 'RM',
    name: 'Relationship Manager (RM)',
    description: 'Manage assigned and personal inquiries, record interactions.',
    status: 'Active',
    permissions: {
      inquiries: { view: true, create: true },
      customers: { view: true, create: true },
      masters: { view: true },
      reports: { view: true },
      users: {},
      sales: {},
      orders: { view: true },
      shipments: {},
      certificates: {},
    } as Permissions,
  },
  {
    id: 'GALLERY_MANAGER',
    name: 'Gallery Manager',
    description: 'Prepares, packs and dispatches won sales and sends certificates.',
    status: 'Active',
    permissions: {
      inquiries: {},
      customers: {},
      masters: {},
      reports: {},
      users: {},
      sales: GALLERY,
      orders: GALLERY,
      shipments: GALLERY,
      certificates: GALLERY,
    } as Permissions,
  },
];

const u = (id: string, name: string, roleId: string, n: number, status: 'Active' | 'Inactive' = 'Active'): RawUser => ({
  id,
  name,
  email: `${id.replace('u-', '')}@artisera.com`,
  phone: `+91 98765 432${n}`,
  roleId,
  status,
});
export const users: RawUser[] = [
  u('u-aishvarya', 'Aishvarya', 'ADMIN', 18),
  u('u-lakshmi', 'Lakshmi Narayanan', 'ADMIN', 10),
  u('u-priya', 'Priya Sharma', 'RM', 11),
  u('u-varun', 'Varun Mehta', 'RM', 12),
  u('u-rohan', 'Rohan Desai', 'RM', 13),
  u('u-neha', 'Neha Kapoor', 'RM', 14),
  u('u-ananya', 'Ananya Iyer', 'RM', 15),
  u('u-anita', 'Anita Menon', 'GALLERY_MANAGER', 19),
  u('u-karan', 'Karan Shah', 'RM', 16, 'Inactive'),
  u('u-meera', 'Meera Nair', 'RM', 17),
];
const rms = users.filter((x) => x.roleId === 'RM' && x.status === 'Active');

export const categories: RawCategory[] = [
  { id: 'cat1', name: 'Modern Art', description: 'Contemporary and modern artworks', status: 'Active' },
  { id: 'cat2', name: 'Traditional Art', description: 'Classical and traditional styles', status: 'Active' },
  { id: 'cat3', name: 'Paintings', description: 'Canvas and paper artworks', status: 'Active' },
  { id: 'cat4', name: 'Sculptures', description: '3D artworks and installations', status: 'Active' },
  { id: 'cat5', name: 'Prints', description: 'Limited edition and open prints', status: 'Active' },
  { id: 'cat6', name: 'Contemporary', description: 'Current-day art practice', status: 'Active' },
];
export const subcategories: RawSubcategory[] = [
  { id: 'sub1', name: 'Abstract', categoryId: 'cat1', description: 'Abstract and non-representational art', status: 'Active' },
  { id: 'sub2', name: 'Landscape', categoryId: 'cat1', description: 'Landscape paintings', status: 'Active' },
  { id: 'sub3', name: 'Portraits', categoryId: 'cat1', description: 'Portrait artworks', status: 'Active' },
  { id: 'sub4', name: 'Figurative', categoryId: 'cat1', description: 'Figurative and realist works', status: 'Active' },
  { id: 'sub5', name: 'Minimalist', categoryId: 'cat1', description: 'Minimalist art and compositions', status: 'Active' },
  { id: 'sub6', name: 'Miniature', categoryId: 'cat2', description: 'Miniature painting traditions', status: 'Active' },
  { id: 'sub7', name: 'Canvas', categoryId: 'cat3', description: 'Canvas paintings', status: 'Active' },
  { id: 'sub8', name: 'Bronze', categoryId: 'cat4', description: 'Bronze sculptures', status: 'Active' },
  { id: 'sub9', name: 'Serigraph', categoryId: 'cat5', description: 'Serigraph prints', status: 'Active' },
  { id: 'sub10', name: 'Installation', categoryId: 'cat6', description: 'Installations', status: 'Active' },
];
export const artists: RawArtist[] = [
  { id: 'art1', name: 'M.F. Husain', categoryId: 'cat1', subcategoryId: 'sub1' },
  { id: 'art2', name: 'S.H. Raza', categoryId: 'cat1', subcategoryId: 'sub1' },
  { id: 'art3', name: 'Tyeb Mehta', categoryId: 'cat1', subcategoryId: 'sub1' },
  { id: 'art4', name: 'Anish Kapoor', categoryId: 'cat6', subcategoryId: 'sub10' },
  { id: 'art5', name: 'Damien Hirst', categoryId: 'cat6', subcategoryId: 'sub10' },
  { id: 'art6', name: 'Jamini Roy', categoryId: 'cat2', subcategoryId: 'sub6' },
];

const people: [string, string][] = [
  ['Rhea Kapoor', 'Mumbai'],
  ['Ananya Desai', 'Pune'],
  ['Karan Mehta', 'Bangalore'],
  ['Vikram Shah', 'Delhi'],
  ['Meera Joshi', 'Mumbai'],
  ['Arjun Verma', 'Bangalore'],
  ['Sanjay Iyer', 'Chennai'],
  ['Kavita Menon', 'Kochi'],
  ['Deepak Rao', 'Hyderabad'],
  ['Alka Nair', 'Bangalore'],
  ['Pooja Iyer', 'Chennai'],
  ['Abhishek Nair', 'Kochi'],
  ['Sandeep Rao', 'Hyderabad'],
  ['Rahul Mehta', 'Bangalore'],
];
const stateOf: Record<string, string> = {
  Mumbai: 'Maharashtra',
  Pune: 'Maharashtra',
  Bangalore: 'Karnataka',
  Delhi: 'Delhi',
  Chennai: 'Tamil Nadu',
  Kochi: 'Kerala',
  Hyderabad: 'Telangana',
};

export const customers: RawCustomer[] = people.map(([name, location], i) => ({
  id: `c${i + 1}`,
  code: `CUST-${String(i + 1).padStart(4, '0')}`,
  name,
  phone: `+91 98${String(100 + i * 7).padStart(3, '0')} ${String(30000 + i * 1111).slice(0, 5)}`,
  email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@example.com`,
  location,
  state: stateOf[location],
  address1: i === 0 ? '123, Ocean View Apartments' : undefined,
  address2: i === 0 ? 'Bandra West' : undefined,
  pin: i === 0 ? '400050' : undefined,
  country: 'India',
  customerType: 'Prospect',
  customerSince: null,
  status: 'Active',
  source: i % 2 ? 'Other' : 'Converted from Inquiry',
  rmId: rms[i % rms.length].id,
  notes: i === 0 ? 'Long term collector. Interested in modern and contemporary art.' : undefined,
  createdAt: iso(subDays(today, 60 - i * 3)),
}));

const reqs = [
  'Large wall painting for living room',
  'Share artist portfolio',
  'Call to discuss requirements',
  'Follow up on approval',
  'Check internal status',
  'Custom size artwork',
  'Art for office lobby',
  'Set of 3 paintings',
  'Frame options',
  'Artist recommendation',
  'Send quotation',
  'Villa project artwork',
  'Curate art options',
  'Confirm site visit schedule',
  'Share revised artwork options',
  'Dining room artwork',
];
const nextActions = ['Call customer', 'Follow up call', 'Send options', 'Share catalogue', 'Final attempt', 'Share revised options', 'Discuss final options'];
const types: InquiryType[] = ['Product Inquiry', 'Product Inquiry', 'Product Inquiry', 'Custom Request', 'Project Inquiry', 'General / Other'];
const mix: InquiryStatus[] = [
  'Touchbase',
  'Touchbase',
  'Touchbase',
  'Touchbase',
  'Touchbase Follow-up',
  'Touchbase Follow-up',
  'Touchbase Follow-up',
  'Active Conversations',
  'Active Conversations',
  'Active Conversations',
  'Nurture',
  'Won',
  'Lost',
];

export const inquiries: RawInquiry[] = [];
export const activities: RawActivity[] = [];
let aid = 1;
const act = (a: Omit<RawActivity, 'id'>) => activities.push({ id: `a${aid++}`, ...a });

for (let i = 0; i < 52; i++) {
  const n = 125 - i;
  const status = mix[i % mix.length];
  const rm = status === 'Touchbase' && i % 8 < 5 ? null : rms[i % rms.length];
  const created = subDays(addHours(today, 10), i < 12 ? i : i * 1.4);
  const cat = pick(categories);
  const subs = subcategories.filter((x) => x.categoryId === cat.id);
  const sub = subs.length ? pick(subs) : subcategories[0];
  const priority: Priority = pick(['High', 'Normal', 'Normal', 'High', 'Normal', 'Normal']);
  let nextFollowUp: string | null = null;
  let lastContact: string | null = null;
  let closedAt: string | null = null;
  if (status === 'Touchbase Follow-up' || status === 'Active Conversations') {
    nextFollowUp = at(i % 7 < 3 ? 0 : (i % 6) - 1, 9 + (i % 8), i % 2 ? 30 : 0);
    lastContact = iso(addDays(created, 2));
  } else if (status === 'Nurture') {
    lastContact = iso(addDays(created, 3));
    nextFollowUp = at((i % 5) - 1, 10 + (i % 6));
  } else if (status === 'Won' || status === 'Lost') {
    lastContact = iso(subDays(today, 3 + (i % 9)));
    closedAt = iso(subDays(today, i % 20));
  }
  const inq: RawInquiry = {
    id: `i${n}`,
    code: `INQ-${String(n).padStart(5, '0')}`,
    customerId: customers[i % customers.length].id,
    inquiryType: pick(types),
    requirement: reqs[i % reqs.length],
    quantity: 1 + (i % 3),
    value: (2 + Math.floor(rnd() * 7)) * 100000 + (i % 2) * 50000,
    categoryId: cat.id,
    subcategoryId: sub.id,
    artistId: i % 3 === 0 ? pick(artists).id : null,
    source: SOURCES[(i * 3 + (i % 4)) % SOURCES.length] as Source,
    priority,
    status,
    rmId: rm ? rm.id : null,
    assignedOn: rm ? iso(addHours(created, 2)) : null,
    nextFollowUp,
    nextAction: nextActions[i % nextActions.length],
    lastContact,
    closedAt,
    notes: i % 4 === 0 ? 'Interested in large canvas paintings. Wants to see options within budget.' : undefined,
    createdAt: iso(created),
    updatedAt: iso(created),
  };
  inquiries.push(inq);
  act({ inquiryId: inq.id, kind: 'Created', text: `Inquiry created from ${inq.source}.`, byId: 'u-lakshmi', at: inq.createdAt });
  if (rm) act({ inquiryId: inq.id, kind: 'Assigned', text: `Assigned to ${rm.name} (${priority}).`, byId: 'u-lakshmi', at: inq.assignedOn! });
  if (rm && status !== 'Touchbase') {
    act({
      inquiryId: inq.id,
      kind: 'Touchbase',
      method: 'Call',
      text: 'Spoke to understand detailed requirements. Interested in modern art pieces.',
      nextFollowUp: iso(addHours(created, 50)),
      byId: rm.id,
      at: iso(addHours(created, 5)),
    });
    if (status !== 'Won' && status !== 'Lost')
      act({
        inquiryId: inq.id,
        kind: 'Follow-up',
        method: 'Email',
        text: 'Shared catalogue links and pricing options.',
        nextFollowUp: nextFollowUp,
        byId: rm.id,
        at: iso(addHours(created, 29)),
      });
    if (status === 'Active Conversations' || status === 'Won' || status === 'Lost')
      act({
        inquiryId: inq.id,
        kind: 'Conversation',
        method: 'WhatsApp',
        text: 'Customer responded. Discussed size options and shared additional works.',
        nextFollowUp,
        byId: rm.id,
        at: iso(addHours(created, 53)),
      });
    if (status === 'Nurture' || status === 'Won' || status === 'Lost')
      act({ inquiryId: inq.id, kind: 'Status', text: `Moved to ${status}.`, byId: rm.id, at: iso(addHours(created, 80)) });
  }
}
customers.forEach((c) => {
  const mine = inquiries.filter((i) => i.customerId === c.id).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  c.originalInquiryId = mine[0]?.id ?? null;
  const won = mine.find((i) => i.status === 'Won');
  if (won) {
    c.customerType = 'Client';
    c.customerSince = won.closedAt;
  }
});

export const sales: RawSale[] = [];
export const saleProducts: RawSaleProduct[] = [];
export const orders: RawOrder[] = [];
export const logs: RawLog[] = [];

const PRODUCT_POOL = [
  { name: 'Abstract Landscape', price: 250000 },
  { name: 'Cityscape Series', price: 180000 },
  { name: 'Minimal Form', price: 370000 },
  { name: 'Untitled - Modern Canvas', price: 120000 },
  { name: 'Set of 3 Prints', price: 50000 },
  { name: 'Bronze Figurine', price: 210000 },
];
const STATUS_CYCLE: RawSaleProduct['productStatus'][] = ['In Stock', 'In Stock', 'With Artist', 'Commission'];

let productSeq = 1;
let orderSeq = 1;
let logSeq = 1;
const addLog = (scope: RawLog['scope'], refId: string, title: string, text: string, byId: string, atIso: string) =>
  logs.push({ id: `l${logSeq++}`, scope, refId, title, text, byId, at: atIso });

inquiries
  .filter((i) => i.status === 'Won')
  .forEach((inq, k) => {
    const saleId = `sale${k + 1}`;
    const saleAt = inq.closedAt ?? iso(today);
    const separately = k % 2 === 0;
    sales.push({
      id: saleId,
      number: 35 + k,
      inquiryId: inq.id,
      customerId: inq.customerId,
      rmId: inq.rmId,
      saleDate: saleAt,
      totalValue: inq.value,
      notes: null,
      certificatePlan: separately ? 'Send Separately' : 'With Shipment',
      shipmentPriority: 'Normal',
      requiredShipmentDate: null,
      shipmentInstructions: k % 2 ? 'Deliver after 5 PM. Fragile handling.' : null,
      paymentStatus: (['Pending', 'Advance', 'Full Payment Received'] as const)[k % 3],
      paymentNotes: null,
      // A few sales are still waiting for the RM's email, so the confirmation and override flow can be exercised.
      rmNotifiedAt: k === 3 ? null : saleAt,
      createdAt: saleAt,
    });
    addLog('sale', saleId, 'Sale Created', `Sale created from ${inq.code}.`, inq.rmId ?? 'u-lakshmi', saleAt);
    const count = 2 + (k % 2);
    const mine: RawSaleProduct[] = [];
    for (let n = 0; n < count; n++) {
      const pool = PRODUCT_POOL[(k + n) % PRODUCT_POOL.length];
      const status = STATUS_CYCLE[(k + n) % STATUS_CYCLE.length];
      const product: RawSaleProduct = {
        id: `sp${productSeq++}`,
        saleId,
        name: pool.name,
        artistId: artists[(k + n) % artists.length].id,
        url: null,
        imageUrl: null,
        listedPrice: pool.price,
        quantity: 1,
        productStatus: status,
        commissionReadyDate: status !== 'Commission' ? null : iso(addDays(today, 30 + n * 10)),
        orderNotes: null,
        orderId: null,
        photoVideoUploaded: false,
      };
      mine.push(product);
      saleProducts.push(product);
    }
    const stock = mine.filter((p) => p.productStatus === 'In Stock');
    if (k % 3 === 2 || stock.length === 0) return;
    const orderId = `ord${orderSeq}`;
    const createdAt = iso(addDays(new Date(saleAt), 1));
    const packed = k % 3 === 1;
    stock.forEach((p) => {
      p.orderId = orderId;
      p.photoVideoUploaded = true;
    });
    orders.push({
      id: orderId,
      saleId,
      suffix: 'A',
      readyForPacking: true,
      packages: packed ? [{ id: `pk${orderSeq}`, packagingType: 'Crate (Wooden)', lengthCm: 120, widthCm: 80, heightCm: 60, weightKg: 25, notes: 'Fragile' }] : [],
      media: [],
      courier: packed ? 'DHL' : null,
      waybill: packed ? `DHL${12345600 + orderSeq}` : null,
      actualDispatchDate: packed && k % 2 === 1 ? iso(addDays(new Date(createdAt), 2)) : null,
      certificateIncluded: !separately,
      invoiceIncluded: true,
      shipmentStatus: packed && k % 2 === 1 ? 'In Transit' : null,
      shipmentStatusAt: packed && k % 2 === 1 ? createdAt : null,
      receivedAt: null,
      certificateSentAt: null,
      createdAt,
    });
    orderSeq += 1;
    addLog('order', orderId, 'Order Created', `Order created with ${stock.length} product(s).`, 'u-anita', createdAt);
  });
