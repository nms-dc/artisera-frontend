import { format, parseISO } from 'date-fns';

export const DATE_FORMAT = 'dd-MMM-yyyy';
export const fDate = (iso?: string | null) => (iso ? format(parseISO(iso), DATE_FORMAT) : '—');
export const fTime = (iso?: string | null) => (iso ? format(parseISO(iso), 'hh:mm a') : '');
export const fDateTime = (iso?: string | null) => (iso ? format(parseISO(iso), `${DATE_FORMAT} hh:mm a`) : '—');
export const fDay = (iso: string) => format(parseISO(iso), 'dd');
export const fMon = (iso: string) => format(parseISO(iso), 'MMM');
export const fNum = (n?: number) => (n === undefined || n === null ? '—' : new Intl.NumberFormat('en-IN').format(n));
export const fINR = (n?: number) => (n === undefined || n === null ? '—' : `₹ ${fNum(n)}`);
export const fLakh = (n: number) => `₹ ${(n / 100000).toFixed(1)}L`;
export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const fMoney = (n?: number | null) => (n ? fINR(n) : 'Price on inquiry');
export const toDateInput = (iso?: string | null) => (iso ? format(parseISO(iso), 'yyyy-MM-dd') : '');
export const toTimeInput = (iso?: string | null) => (iso ? format(parseISO(iso), 'HH:mm') : '');
