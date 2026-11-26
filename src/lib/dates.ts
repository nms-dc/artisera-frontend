import { format, parseISO } from 'date-fns';

/** Local calendar day as yyyy-MM-dd. */
export const dayOf = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');
export const todayDay = () => format(new Date(), 'yyyy-MM-dd');
export const isFutureDay = (iso: string) => dayOf(iso) > todayDay();

/**
 * ISO datetime for a day picked in a date field. Today maps to the current moment, so it is never in the future;
 * any other day maps to midday, which keeps the calendar day stable across time zones.
 */
export const dayToDateTime = (day: string) => (day === todayDay() ? new Date().toISOString() : new Date(`${day}T12:00`).toISOString());
