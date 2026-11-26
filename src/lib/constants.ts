import type {
  CertificatePlan,
  CustomerType,
  CustomerTypeInput,
  Courier,
  InquiryStatus,
  InquiryType,
  OrderStatus,
  PackagingType,
  PaymentStatus,
  Priority,
  ProductStatus,
  ShipmentPriority,
  ShipmentStatus,
  Source,
} from './types';

export const SOURCES: Source[] = ['Website', 'Email', 'WhatsApp', 'Phone / Walk-in', 'Instagram', 'Referral', 'Exhibition', 'Other'];
export const INQUIRY_TYPES: InquiryType[] = ['Product Inquiry', 'Custom Request', 'Project Inquiry', 'General / Other'];
export const PRIORITIES: Priority[] = ['Normal', 'High'];
export const ASSIGN_PRIORITIES: Priority[] = PRIORITIES;
export const CUSTOMER_TYPES: CustomerType[] = ['Prospect', 'Repeat Prospect', 'Client', 'Repeat Client'];
export const CUSTOMER_TYPE_INPUTS: CustomerTypeInput[] = ['Prospect', 'Client'];
export const STATUSES: InquiryStatus[] = ['Touchbase', 'Touchbase Follow-up', 'Active Conversations', 'Nurture', 'Won', 'Lost'];

export const GALLERY_ROLE = 'GALLERY_MANAGER';
export const PRODUCT_STATUSES: ProductStatus[] = ['In Stock', 'With Artist', 'Commission'];
/** Product statuses that need a ready date before the sale or the status change can be saved. */
export const READY_DATE_STATUSES: ProductStatus[] = ['With Artist', 'Commission'];
export const requiresReadyDate = (status: ProductStatus) => READY_DATE_STATUSES.includes(status);
/** Shipment priorities that need a required shipment date. */
export const requiresShipmentDate = (priority: ShipmentPriority) => priority === 'Urgent' || priority === 'Specify Date';
export const CERTIFICATE_PLANS: { value: CertificatePlan; label: string; hint: string }[] = [
  { value: 'With Shipment', label: 'Will be sent with shipment', hint: 'Certificates for all products in this sale will be included with the shipment.' },
  { value: 'Send Separately', label: 'Will be sent separately later', hint: 'Certificates for all products in this sale will be sent separately after the shipment.' },
];
export const PAYMENT_STATUSES: PaymentStatus[] = ['Pending', 'Advance', 'Full Payment Received'];
export const SHIPMENT_PRIORITIES: ShipmentPriority[] = ['Normal', 'Urgent', 'Specify Date'];
export const ORDER_STATUSES: OrderStatus[] = ['Preparation', 'Packing', 'Dispatched', 'Delivered', 'Certificates Pending'];
export const SHIPMENT_STATUSES: ShipmentStatus[] = ['In Transit', 'Delivered'];
export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = { 'In Transit': 'Dispatched / In Transit', Delivered: 'Delivered (Customer Confirmed)' };
export const PACKAGING_TYPES: PackagingType[] = ['Crate (Wooden)', 'Cardboard Box', 'Tube', 'Pallet'];
export const COURIERS: Courier[] = ['DHL', 'FedEx', 'BlueDart', 'DTDC', 'Other'];
export const MEDIA_ACCEPT = 'image/jpeg,image/png,video/mp4';
export const MEDIA_MAX_BYTES = 100 * 1024 * 1024;

export const PILL: Record<string, { bg: string; fg: string }> = {
  Touchbase: { bg: '#EADCFF', fg: '#6B3FC4' },
  'Touchbase Follow-up': { bg: '#E8DDFB', fg: '#5B34B0' },
  'Active Conversations': { bg: '#DDF5E3', fg: '#1E8E3E' },
  Nurture: { bg: '#E7EAF0', fg: '#4B5876' },
  Won: { bg: '#CFF0D8', fg: '#14732F' },
  Lost: { bg: '#FFE1E6', fg: '#C62828' },
  Active: { bg: '#DDF5E3', fg: '#1E8E3E' },
  Inactive: { bg: '#FFE1E6', fg: '#C62828' },
  Client: { bg: '#DDF5E3', fg: '#1E8E3E' },
  'Repeat Client': { bg: '#CFF0D8', fg: '#14732F' },
  Prospect: { bg: '#DCEBFF', fg: '#1565C0' },
  Admin: { bg: '#DCEBFF', fg: '#1565C0' },
  RM: { bg: '#EFE3FF', fg: '#6B3FC4' },
  Normal: { bg: '#E7EAF0', fg: '#4B5876' },
  High: { bg: '#FFE3E3', fg: '#C62828' },
  Urgent: { bg: '#C62828', fg: '#FFFFFF' },
  Website: { bg: '#DCEBFF', fg: '#1565C0' },
  Email: { bg: '#E8EEF9', fg: '#3B4F7A' },
  WhatsApp: { bg: '#DDF5E3', fg: '#1E8E3E' },
  'Phone / Walk-in': { bg: '#FFE9D6', fg: '#B25A00' },
  Instagram: { bg: '#FFE0F0', fg: '#C2185B' },
  Referral: { bg: '#EADCFF', fg: '#6B3FC4' },
  Exhibition: { bg: '#DDF5E3', fg: '#2E7D32' },
  Other: { bg: '#ECEFF4', fg: '#5B6B8C' },
  'Repeat Prospect': { bg: '#FFF1D6', fg: '#B26A00' },
  Override: { bg: '#FFF1D6', fg: '#B26A00' },
  New: { bg: '#DCEBFF', fg: '#1565C0' },
  'In Stock': { bg: '#DDF5E3', fg: '#1E8E3E' },
  'With Artist': { bg: '#FFF1D6', fg: '#B26A00' },
  Commission: { bg: '#EADCFF', fg: '#6B3FC4' },
  Pending: { bg: '#E7EAF0', fg: '#4B5876' },
  'Full Payment Received': { bg: '#DDF5E3', fg: '#1E8E3E' },
  Advance: { bg: '#FFF1D6', fg: '#B26A00' },
  Received: { bg: '#DDF5E3', fg: '#1E8E3E' },
  'Gallery Manager': { bg: '#FFE9D6', fg: '#B25A00' },
  Preparation: { bg: '#FFF1D6', fg: '#B26A00' },
  Packing: { bg: '#EADCFF', fg: '#6B3FC4' },
  Delivered: { bg: '#CFF0D8', fg: '#14732F' },
  'Certificates Pending': { bg: '#FFE1E6', fg: '#C62828' },
  Dispatched: { bg: '#DCEBFF', fg: '#1565C0' },
  'In Transit': { bg: '#FFF1D6', fg: '#B26A00' },
  'Order not created': { bg: '#FFE1E6', fg: '#C62828' },
  'Awaiting customer confirmation': { bg: '#FFF1D6', fg: '#B26A00' },
  'Details incomplete': { bg: '#FFF1D6', fg: '#B26A00' },
  'Certificate: With Shipment': { bg: '#DDF5E3', fg: '#1E8E3E' },
  'Certificate: Sent Separately': { bg: '#FFF1D6', fg: '#B26A00' },
  'Certificate: Pending': { bg: '#FFF1D6', fg: '#B26A00' },
  'Certificate: Sent': { bg: '#DDF5E3', fg: '#1E8E3E' },
  Yes: { bg: '#DDF5E3', fg: '#1E8E3E' },
  No: { bg: '#FFE1E6', fg: '#C62828' },
};

export const CHART = { blue: '#1665F5', purple: '#9B5CF6', green: '#34A853', orange: '#FF7A45', grey: '#A9B4C7', amber: '#F5A623', pink: '#F0587A' };
