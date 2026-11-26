import type {
  ActiveStatus,
  ActivityKind,
  CertificatePlan,
  Courier,
  InquiryStatus,
  InquiryType,
  Method,
  OrderMedia,
  OrderPackage,
  PaymentStatus,
  Permissions,
  Priority,
  ProductStatus,
  ShipmentPriority,
  ShipmentStatus,
  Source,
} from '@/lib/types';

export type RawRole = { id: string; name: string; description: string; status: ActiveStatus; permissions: Permissions };
export type RawUser = { id: string; name: string; email: string; phone: string; roleId: string; status: ActiveStatus; notes?: string };
export type RawCustomer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  location?: string;
  state?: string;
  address1?: string;
  address2?: string;
  pin?: string;
  country?: string;
  customerType: 'Prospect' | 'Client';
  customerSince: string | null;
  status: ActiveStatus;
  source: string;
  originalInquiryId?: string | null;
  rmId: string | null;
  notes?: string;
  createdAt: string;
};
export type RawInquiry = {
  id: string;
  code: string;
  customerId: string;
  inquiryType: InquiryType;
  requirement: string;
  quantity: number;
  value: number;
  categoryId: string | null;
  subcategoryId?: string | null;
  artistId?: string | null;
  source: Source;
  priority: Priority;
  status: InquiryStatus;
  rmId: string | null;
  assignedOn: string | null;
  nextFollowUp: string | null;
  nextAction?: string;
  lastContact: string | null;
  closedAt: string | null;
  notes?: string;
  expectedTimeline?: string;
  createdAt: string;
  updatedAt: string;
};
export type RawActivity = { id: string; inquiryId: string; kind: ActivityKind; method?: Method | null; text: string; nextFollowUp?: string | null; byId: string; at: string };
export type RawCategory = { id: string; name: string; description: string; status: ActiveStatus };
export type RawSubcategory = { id: string; name: string; categoryId: string; description: string; status: ActiveStatus };
export type RawArtist = { id: string; name: string; categoryId: string | null; subcategoryId: string | null };

export type RawSale = {
  id: string;
  number: number;
  inquiryId: string;
  customerId: string;
  rmId: string | null;
  saleDate: string;
  totalValue: number;
  notes: string | null;
  certificatePlan: CertificatePlan;
  shipmentPriority: ShipmentPriority;
  requiredShipmentDate: string | null;
  shipmentInstructions: string | null;
  paymentStatus: PaymentStatus;
  paymentNotes: string | null;
  rmNotifiedAt: string | null;
  emailOverridden?: boolean;
  /** When the RM marked their email to the Gallery Manager as sent. */
  rmEmailSentAt?: string | null;
  createdAt: string;
};
export type RawSaleProduct = {
  id: string;
  saleId: string;
  name: string;
  artistId: string | null;
  url: string | null;
  imageUrl: string | null;
  listedPrice: number;
  quantity: number;
  productStatus: ProductStatus;
  commissionReadyDate: string | null;
  orderNotes: string | null;
  orderId: string | null;
  photoVideoUploaded: boolean;
};
export type RawOrder = {
  id: string;
  saleId: string;
  suffix: string;
  readyForPacking: boolean;
  packages: OrderPackage[];
  media: OrderMedia[];
  courier: Courier | null;
  waybill: string | null;
  actualDispatchDate: string | null;
  certificateIncluded: boolean;
  invoiceIncluded: boolean;
  shipmentStatus: ShipmentStatus | null;
  shipmentStatusAt: string | null;
  receivedAt: string | null;
  certificateSentAt: string | null;
  createdAt: string;
};
export type RawLog = { id: string; scope: 'sale' | 'order'; refId: string; title: string; text: string; byId: string; at: string };
