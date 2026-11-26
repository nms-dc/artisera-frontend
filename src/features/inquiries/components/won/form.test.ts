import { describe, expect, it } from 'vitest';
import { buildSaleInput, emptyRow, initialWonForm, productsTotal, validateAll, validateStep, wonBlockedReason } from './form';
import type { WonFormState } from './form';

const validForm = (): WonFormState => ({
  ...initialWonForm('780000', new Date('2026-10-30T10:00:00')),
  rows: [
    { ...emptyRow(1), name: ' Abstract Landscape ', artistId: 'a1', listedPrice: '500000', quantity: '1' },
    { ...emptyRow(2), name: 'Prints', listedPrice: '70000', quantity: '4', productStatus: 'Commission', commissionReadyDate: '2026-12-15' },
  ],
});

describe('validateStep', () => {
  it('requires a positive sale value and a date', () => {
    const form = { ...validForm(), totalValue: '0', saleDate: '' };
    expect(validateStep(0, form)).toEqual({ totalValue: 'Enter the final sale value', saleDate: 'Select the sale date' });
  });

  it('flags each invalid product field by row key', () => {
    const form = { ...validForm(), rows: [{ ...emptyRow(7), url: 'not a url', quantity: '0' }] };
    expect(validateStep(1, form)).toEqual({
      'name-7': 'Required',
      'price-7': 'Required',
      'qty-7': 'Min 1',
      'url-7': 'Invalid URL',
    });
  });

  it('accepts http and https product URLs', () => {
    const form = { ...validForm(), rows: [{ ...validForm().rows[0], url: 'https://artisera.com/p/1' }] };
    expect(validateStep(1, form)).toEqual({});
  });

  it('requires a shipment date for Urgent and Specify Date only', () => {
    expect(validateStep(2, { ...validForm(), priority: 'Normal' })).toEqual({});
    expect(validateStep(2, { ...validForm(), priority: 'Urgent' })).toEqual({ requiredDate: 'Select the required shipment date' });
    expect(validateStep(2, { ...validForm(), priority: 'Specify Date' })).toEqual({ requiredDate: 'Select the required shipment date' });
  });

  it('passes a complete form', () => {
    expect(validateAll(validForm())).toEqual({});
  });
});

describe('buildSaleInput', () => {
  it('trims text, converts numbers and always sends the text keys', () => {
    const sale = buildSaleInput(validForm());
    expect(sale.totalValue).toBe(780000);
    expect(sale.notes).toBe('');
    expect(sale.shipmentInstructions).toBe('');
    expect(sale.paymentNotes).toBe('');
    expect(sale.products.every((p) => p.orderNotes === '')).toBe(true);
    expect(sale.requiredShipmentDate).toBeNull();
    expect(sale.products[0]).toMatchObject({ name: 'Abstract Landscape', artistId: 'a1', url: null, listedPrice: 500000, quantity: 1 });
    expect(sale.certificatePlan).toBe('With Shipment');
    expect(sale.products[0].commissionReadyDate).toBeNull();
    expect(sale.products[1]).toMatchObject({ artistId: null, productStatus: 'Commission', quantity: 4 });
    expect(sale.products[1].commissionReadyDate).toMatch(/^2026-12-15T/);
  });

  it('treats the ready date as N/A for In Stock and mandatory for With Artist and Commission', () => {
    const form = validForm();
    form.rows[1] = { ...form.rows[1], productStatus: 'In Stock' };
    expect(buildSaleInput(form).products[1].commissionReadyDate).toBeNull();
    expect(validateStep(1, form)).toEqual({});
    form.rows[1] = { ...form.rows[1], productStatus: 'With Artist', commissionReadyDate: '' };
    expect(validateStep(1, form)).toEqual({ 'date-2': 'Required for With Artist' });
    form.rows[1] = { ...form.rows[1], productStatus: 'Commission', commissionReadyDate: '' };
    expect(validateStep(1, form)).toEqual({ 'date-2': 'Required for Commission' });
  });

  it('keeps a picked ready date when the status is switched away and back', () => {
    const form = validForm();
    form.rows[1] = { ...form.rows[1], productStatus: 'In Stock' };
    expect(form.rows[1].commissionReadyDate).toBe('2026-12-15');
    form.rows[1] = { ...form.rows[1], productStatus: 'Commission' };
    expect(buildSaleInput(form).products[1].commissionReadyDate).toMatch(/^2026-12-15T/);
  });

  it('sends a shipment date for Urgent and Specify Date only', () => {
    expect(buildSaleInput({ ...validForm(), priority: 'Specify Date', requiredDate: '2026-11-05' }).requiredShipmentDate).toMatch(/^2026-11-05T/);
    expect(buildSaleInput({ ...validForm(), priority: 'Urgent', requiredDate: '2026-11-05' }).requiredShipmentDate).toMatch(/^2026-11-05T/);
    expect(buildSaleInput({ ...validForm(), priority: 'Normal', requiredDate: '2026-11-05' }).requiredShipmentDate).toBeNull();
  });
});

describe('productsTotal', () => {
  it('multiplies price by quantity and ignores blanks', () => {
    expect(productsTotal(validForm().rows)).toBe(780000);
    expect(productsTotal([emptyRow(1)])).toBe(0);
  });
});

describe('wonBlockedReason', () => {
  it('blocks closed inquiries for everyone', () => {
    expect(wonBlockedReason('Won', true)).toBe('This inquiry is already Won.');
    expect(wonBlockedReason('Lost', false)).toBe('This inquiry is already Lost.');
  });

  it('lets only Admin mark Won from other open statuses', () => {
    expect(wonBlockedReason('Nurture', false)).toBe('Only inquiries in Active Conversations can be marked as Won.');
    expect(wonBlockedReason('Nurture', true)).toBe('');
    expect(wonBlockedReason('Active Conversations', false)).toBe('');
  });
});
