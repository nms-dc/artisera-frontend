export type Role = string;
export type InquiryStatus = 'Touchbase' | 'Touchbase Follow-up' | 'Active Conversations' | 'Nurture' | 'Won' | 'Lost';
export type Priority = 'Normal' | 'High';
export type CustomerType = 'Prospect' | 'Repeat Prospect' | 'Client' | 'Repeat Client';
export type CustomerTypeInput = 'Prospect' | 'Client';
export type Source = 'Website' | 'Email' | 'WhatsApp' | 'Phone / Walk-in' | 'Instagram' | 'Referral' | 'Exhibition' | 'Other';
export type InquiryType = 'Product Inquiry' | 'Custom Request' | 'Project Inquiry' | 'General / Other';
export type Method = 'Email' | 'WhatsApp' | 'Call';
export type ActiveStatus = 'Active' | 'Inactive';
export type MasterKind = 'categories' | 'subcategories' | 'artists';
export type MoveTo = 'Active Conversations' | 'Nurture' | 'Lost';

export type Paginated<T> = { count: number; page: number; pageSize: number; results: T[] };
export type Ref = { id: string; name: string };
export type UserSummary = { id: string; name: string };

export type CustomerSummary = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string | null;
  location?: string | null;
  state?: string | null;
  address1?: string | null;
  address2?: string | null;
  pin?: string | null;
  country?: string | null;
};
export type Customer = CustomerSummary & {
  altPhone?: string | null;
  address1?: string | null;
  address2?: string | null;
  pin?: string | null;
  country?: string | null;
  customerType: CustomerType;
  repeatProspect: boolean;
  customerSince: string | null;
  status: ActiveStatus;
  source: string;
  originalInquiry?: { id: string; code: string } | null;
  rm: UserSummary | null;
  notes?: string | null;
  createdAt: string;
  totalInquiries: number;
  openInquiries: number;
  wonInquiries: number;
  totalValue: number;
  lastActivityAt: string | null;
};
export type CustomerInput = Partial<
  Pick<Customer, 'name' | 'phone' | 'altPhone' | 'email' | 'location' | 'state' | 'address1' | 'address2' | 'pin' | 'country' | 'status' | 'source' | 'notes'>
> & { rmId?: string | null; customerType?: CustomerTypeInput };
export type CustomerSale = SaleSummary & { inquiry: { id: string; code: string } };

export type Category = { id: string; name: string; description: string; status: ActiveStatus };
export type Subcategory = { id: string; name: string; categoryId: string; categoryName: string; description: string; status: ActiveStatus };
export type Artist = { id: string; name: string; categoryId: string | null; categoryName: string | null; subcategoryId: string | null; subcategoryName: string | null };
export type MasterRecord = Category | Subcategory | Artist;
export type MasterOption = { id: string; name: string; categoryId?: string | null; subcategoryId?: string | null };

export type PermissionModule = 'inquiries' | 'customers' | 'masters' | 'reports' | 'users' | 'sales' | 'orders' | 'shipments' | 'certificates';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'assignRm';
export type Permissions = Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>;
export type User = { id: string; name: string; email: string; role: Role; permissions: Permissions; mustChangePassword?: boolean };
export type RoleRecord = { id: string; name: string; description: string; status: ActiveStatus; usersCount: number; permissions: Permissions };
export type RoleInput = Partial<Pick<RoleRecord, 'name' | 'description' | 'status' | 'permissions'>>;
export type UserRecord = { id: string; name: string; email: string; phone: string; roleId: string; roleName: string; status: ActiveStatus; notes?: string | null };
export type UserInput = Partial<Pick<UserRecord, 'name' | 'email' | 'phone' | 'roleId' | 'status' | 'notes'>>;

export type Inquiry = {
  id: string;
  code: string;
  customer: CustomerSummary;
  inquiryType: InquiryType;
  requirement: string;
  quantity: number;
  value: number;
  category: Ref | null;
  subcategory: Ref | null;
  artist: Ref | null;
  source: Source;
  priority: Priority;
  status: InquiryStatus;
  rm: UserSummary | null;
  assignedOn: string | null;
  nextFollowUp: string | null;
  nextAction?: string | null;
  lastContact: string | null;
  closedAt: string | null;
  notes?: string | null;
  expectedTimeline?: string | null;
  repeatProspect: boolean;
  sale: SaleSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type InquiryInput = {
  customerId: string;
  inquiryType: InquiryType;
  source: Source;
  requirement: string;
  quantity: number;
  value: number;
  categoryId?: string | null;
  subcategoryId?: string | null;
  artistId?: string | null;
  rmId?: string | null;
  priority?: Priority;
  notes?: string;
  expectedTimeline?: string;
};

export type AdminTab = 'all' | 'unassigned' | 'assigned' | 'nurture';
export type BulkAction = { ids: string[] } & ({ action: 'reassign'; rmId: string } | { action: 'lost'; remark: string } | { action: 'snooze'; nextFollowUp: string });
export type BulkResult = { updated: number };
export type RmTab = 'today' | 'touchbase' | 'followup' | 'active' | 'won' | 'lost' | 'nurture';
export type InquiryListParams = {
  tab?: AdminTab | RmTab;
  q?: string;
  rmId?: string;
  customerId?: string;
  priority?: Priority;
  source?: Source;
  /** Value band: under ₹1 lakh, ₹1–5 lakh, above ₹5 lakh. */
  valueBand?: 'lt1' | '1to5' | 'gt5';
  status?: InquiryStatus;
  dateRange?: 'today' | '7' | '30';
  page?: number;
  pageSize?: number;
  ordering?: string;
};
export type InquiryCounts = Record<'all' | 'unassigned' | 'assigned' | 'today' | 'touchbase' | 'followup' | 'active' | 'nurture' | 'won' | 'lost', number>;

export type ActivityKind = 'Created' | 'Assigned' | 'Reassigned' | 'Touchbase' | 'Follow-up' | 'Conversation' | 'Snooze' | 'Status' | 'Edited';
export type Activity = {
  id: string;
  inquiryId: string;
  kind: ActivityKind;
  method?: Method | null;
  text: string;
  notes?: string | null;
  remark?: string | null;
  nextFollowUp?: string | null;
  by: UserSummary;
  at: string;
};

export type DashboardRange = '7' | '30' | '90' | 'all';
export type AdminDashboard = {
  kpis: {
    total: number;
    unassigned: number;
    active: number;
    activeConversations: number;
    wonCount: number;
    wonRevenue: number;
    pipelineCount: number;
    pipelineValue: number;
    lostCount: number;
  };
  bySource: { source: Source; count: number }[];
  byType: { type: InquiryType; count: number }[];
  trend: { weekStart: string; count: number }[];
  rmTable: {
    rm: UserSummary;
    touchbase: number;
    followUp: number;
    active: number;
    nurture: number;
    won: number;
    lost: number;
    total: number;
    wonValue: number;
    pipelineValue: number;
    revenue: number;
  }[];
};
export type RmDashboard = {
  kpis: {
    touchbase: { count: number; overdue: number };
    followUp: { count: number; overdue: number };
    active: { count: number; dueToday: number };
    nurture: number;
    won: { count: number; value: number };
    pipeline: { count: number; value: number };
    lost: { count: number; value: number };
  };
};
export type ReportFilters = { from?: string; to?: string; rmId?: string; categoryId?: string; subcategoryId?: string; status?: InquiryStatus };
export type InquirySummaryReport = {
  kpis: { total: number; touchbase: number; followUp: number; active: number; nurture: number; won: number; lost: number };
  byStatus: { status: InquiryStatus; count: number }[];
  byCategory: { category: string; count: number }[];
  byRm: { rm: string; count: number }[];
};

export type NotificationType =
  | 'UNASSIGNED_INQUIRY'
  | 'NEW_INQUIRY'
  | 'INQUIRY_ASSIGNED'
  | 'INQUIRY_REASSIGNED'
  | 'INQUIRY_UPDATED'
  | 'TOUCHBASE_RECORDED'
  | 'INTERACTION_RECORDED'
  | 'FOLLOWUP_SNOOZED'
  | 'STATUS_CHANGED'
  | 'CUSTOMER_CREATED'
  | 'FOLLOWUP_DUE'
  | 'FOLLOWUP_OVERDUE'
  | 'SALE_WON'
  | 'ORDER_CREATED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'CERTIFICATE_SENT'
  | 'SALE_EMAIL_SENT';
export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  inquiryId: string | null;
  customerId: string | null;
  saleId: string | null;
  orderId: string | null;
  tab: string | null;
  read: boolean;
  createdAt: string;
};
export type NotificationsResponse = { unreadCount: number; results: AppNotification[] };

export type ProductStatus = 'In Stock' | 'With Artist' | 'Commission';
export type CertificatePlan = 'With Shipment' | 'Send Separately';
export type PaymentStatus = 'Pending' | 'Advance' | 'Full Payment Received';
export type ShipmentPriority = 'Normal' | 'Urgent' | 'Specify Date';
export type OrderStatus = 'Preparation' | 'Packing' | 'Dispatched' | 'Delivered' | 'Certificates Pending';
/** Dispatched and In Transit are one state. Delivered means the customer confirmed receipt. */
export type ShipmentStatus = 'In Transit' | 'Delivered';
export type SalePendingWith = 'RM email not received' | 'Order not created' | 'Awaiting customer confirmation' | 'Details incomplete';
export type PackagingType = 'Crate (Wooden)' | 'Cardboard Box' | 'Tube' | 'Pallet';
export type Courier = 'DHL' | 'FedEx' | 'BlueDart' | 'DTDC' | 'Other';
export type MediaKind = 'product' | 'packing';

export type SaleProductInput = {
  name: string;
  artistId?: string | null;
  url?: string | null;
  listedPrice: number;
  quantity: number;
  productStatus: ProductStatus;
  commissionReadyDate?: string | null;
  orderNotes: string;
};
export type SaleInput = {
  totalValue: number;
  saleDate: string;
  notes: string;
  certificatePlan: CertificatePlan;
  products: SaleProductInput[];
  shipmentPriority: ShipmentPriority;
  requiredShipmentDate?: string | null;
  shipmentInstructions: string;
  paymentStatus: PaymentStatus;
  paymentNotes: string;
};

export type SaleSummary = {
  id: string;
  saleNumber: string;
  saleDate: string;
  totalValue: number;
  paymentStatus: PaymentStatus;
  totalOrders: number;
  totalProducts: number;
  productsRemaining: number;
  orders: { id: string; orderNumber: string; status: OrderStatus }[];
  /** RM email to the Gallery Manager: Pending (RM has not sent it), Sent (RM marked it sent) or Received (Gallery Manager confirmed or overrode). */
  emailStatus: 'Pending' | 'Sent' | 'Received';
  emailSentAt: string | null;
};

export type RmNotification = { status: 'Received' | 'Sent' | 'Pending' | 'Failed'; at: string | null; sentAt: string | null; overridden: boolean };

export type Sale = {
  id: string;
  emailConfirmed: boolean;
  saleNumber: string;
  inquiry: { id: string; code: string };
  customer: CustomerSummary;
  rm: UserSummary | null;
  saleDate: string;
  totalValue: number;
  totalOrders: number;
  totalProducts: number;
  productsRemaining: number;
  certificatePlan: CertificatePlan;
  certificateSeparately: boolean;
  paymentStatus: PaymentStatus;
  pendingWith: SalePendingWith | null;
};

export type SaleProduct = {
  id: string;
  name: string;
  artist: Ref | null;
  url: string | null;
  imageUrl: string | null;
  listedPrice: number;
  quantity: number;
  productStatus: ProductStatus;
  commissionReadyDate: string | null;
  orderNotes: string | null;
  orderId: string | null;
  orderNumber: string | null;
};

export type OrderRow = {
  id: string;
  orderNumber: string;
  saleId: string;
  saleNumber: string;
  customer: { id: string; name: string };
  rm: UserSummary | null;
  orderDate: string;
  totalProducts: number;
  orderValue: number;
  status: OrderStatus;
  certificateSeparately: boolean;
};

export type SaleDetail = Sale & {
  rmNotification: RmNotification;
  notes: string | null;
  shipmentPriority: ShipmentPriority;
  requiredShipmentDate: string | null;
  shipmentInstructions: string | null;
  paymentNotes: string | null;
  products: SaleProduct[];
  orders: OrderRow[];
};

export type OrderProduct = SaleProduct & { photoVideoUploaded: boolean };
export type OrderPackage = {
  id?: string;
  packagingType: PackagingType | '';
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
  notes: string;
};
export type OrderMedia = { id: string; kind: MediaKind; type: 'image' | 'video'; fileName: string; url: string; size: number; uploadedAt: string };

export type OrderDetail = OrderRow & {
  inquiry: { id: string; code: string };
  saleDate: string;
  products: OrderProduct[];
  readyForPacking: boolean;
  packages: OrderPackage[];
  media: OrderMedia[];
  courier: Courier | null;
  waybill: string | null;
  actualDispatchDate: string | null;
  certificateIncluded: boolean;
  invoiceIncluded: boolean;
  shipmentStatus: ShipmentStatus | null;
  receivedAt: string | null;
  certificateSentAt: string | null;
};

export type OrderProductsPatch = { readyForPacking: boolean; products: { id: string; photoVideoUploaded: boolean }[] };
export type DispatchInput = {
  packages: OrderPackage[];
  courier: Courier | '';
  waybill?: string;
  actualDispatchDate: string | null;
  certificateIncluded: boolean;
  invoiceIncluded: boolean;
};
export type SaleProductPatch = { productStatus?: ProductStatus; commissionReadyDate?: string | null; orderNotes?: string };

export type ShipmentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  rmName: string | null;
  courier: Courier | null;
  trackingNo: string | null;
  dispatchDate: string | null;
  status: ShipmentStatus;
  statusUpdatedAt: string | null;
};
export type CertificateRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  rmName: string | null;
  dispatchDate: string | null;
  sentSeparately: boolean;
  dispatched: boolean;
  sentAt: string | null;
};

export type DateRangeParams = { from?: string; to?: string };
export type GalleryListParams = DateRangeParams & { customerId?: string; q?: string; page?: number; pageSize?: number };
export type SaleListParams = GalleryListParams & { orderStatus?: OrderStatus | 'none'; certificateStatus?: 'pending' | 'sent' | 'with-shipment' };
export type OrderListParams = GalleryListParams & { status?: OrderStatus };
export type ShipmentListParams = GalleryListParams & { courier?: Courier; status?: ShipmentStatus };

export type AttentionSale = { id: string; saleNumber: string; customerName: string; saleDate: string; totalValue: number; emailConfirmed: boolean; pendingWith: SalePendingWith };
export type GalleryDashboard = {
  cards: { preparation: number; packingDispatch: number; shipped: number; delivered: number; certificatesPending: number };
  attentionOrders: { count: number; results: OrderRow[] };
  attentionSales: { count: number; results: AttentionSale[] };
};
export type LogEntry = { id: string; title: string; text: string; by: UserSummary; at: string };
