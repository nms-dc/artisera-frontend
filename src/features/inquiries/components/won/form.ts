import { format } from 'date-fns';
import { requiresReadyDate, requiresShipmentDate } from '@/lib/constants';
import type { CertificatePlan, InquiryStatus, PaymentStatus, ProductStatus, SaleInput, ShipmentPriority } from '@/lib/types';

export type ProductRowState = {
  key: number;
  name: string;
  artistId: string;
  url: string;
  listedPrice: string;
  quantity: string;
  productStatus: ProductStatus;
  commissionReadyDate: string;
};

export type WonFormState = {
  totalValue: string;
  saleDate: string;
  notes: string;
  certificatePlan: CertificatePlan;
  rows: ProductRowState[];
  priority: ShipmentPriority;
  requiredDate: string;
  instructions: string;
  payment: PaymentStatus;
  paymentNotes: string;
};

export type WonErrors = Record<string, string>;

export const STEPS = ['Sale Details', 'Products', 'Additional Details', 'Review & Save'] as const;

export const emptyRow = (key: number): ProductRowState => ({
  key,
  name: '',
  artistId: '',
  url: '',
  listedPrice: '',
  quantity: '1',
  productStatus: 'In Stock',
  commissionReadyDate: '',
});

export const initialWonForm = (totalValue = '', today = new Date()): WonFormState => ({
  totalValue,
  saleDate: format(today, 'yyyy-MM-dd'),
  notes: '',
  certificatePlan: 'With Shipment',
  rows: [emptyRow(1)],
  priority: 'Normal',
  requiredDate: '',
  instructions: '',
  payment: 'Pending',
  paymentNotes: '',
});

const isUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const atNoon = (date: string) => new Date(`${date}T12:00`).toISOString();

export const productsTotal = (rows: ProductRowState[]) => rows.reduce((sum, r) => sum + (Number(r.listedPrice) || 0) * (Number(r.quantity) || 0), 0);

export function validateStep(step: number, form: WonFormState): WonErrors {
  const errors: WonErrors = {};
  if (step === 0) {
    if (!(Number(form.totalValue) > 0)) errors.totalValue = 'Enter the final sale value';
    if (!form.saleDate) errors.saleDate = 'Select the sale date';
  }
  if (step === 1) {
    form.rows.forEach((r) => {
      if (!r.name.trim()) errors[`name-${r.key}`] = 'Required';
      if (!(Number(r.listedPrice) > 0)) errors[`price-${r.key}`] = 'Required';
      if (!(Number(r.quantity) >= 1)) errors[`qty-${r.key}`] = 'Min 1';
      if (r.url && !isUrl(r.url)) errors[`url-${r.key}`] = 'Invalid URL';
      if (requiresReadyDate(r.productStatus) && !r.commissionReadyDate) errors[`date-${r.key}`] = `Required for ${r.productStatus}`;
    });
  }
  if (step === 2 && requiresShipmentDate(form.priority) && !form.requiredDate) errors.requiredDate = 'Select the required shipment date';
  return errors;
}

export const validateAll = (form: WonFormState): WonErrors => ({ ...validateStep(0, form), ...validateStep(1, form), ...validateStep(2, form) });

export function buildSaleInput(form: WonFormState): SaleInput {
  return {
    totalValue: Number(form.totalValue),
    saleDate: atNoon(form.saleDate),
    notes: form.notes.trim(),
    certificatePlan: form.certificatePlan,
    products: form.rows.map((r) => ({
      name: r.name.trim(),
      artistId: r.artistId || null,
      url: r.url.trim() || null,
      listedPrice: Number(r.listedPrice),
      quantity: Number(r.quantity),
      productStatus: r.productStatus,
      commissionReadyDate: requiresReadyDate(r.productStatus) && r.commissionReadyDate ? atNoon(r.commissionReadyDate) : null,
      orderNotes: '',
    })),
    shipmentPriority: form.priority,
    requiredShipmentDate: requiresShipmentDate(form.priority) ? atNoon(form.requiredDate) : null,
    shipmentInstructions: form.instructions.trim(),
    paymentStatus: form.payment,
    paymentNotes: form.paymentNotes.trim(),
  };
}

export function wonBlockedReason(status: InquiryStatus, isAdmin: boolean): string {
  if (status === 'Won' || status === 'Lost') return `This inquiry is already ${status}.`;
  if (!isAdmin && status !== 'Active Conversations') return 'Only inquiries in Active Conversations can be marked as Won.';
  return '';
}
