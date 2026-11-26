import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayToDateTime, todayDay } from './dates';

afterEach(() => vi.useRealTimers());

describe('dayToDateTime', () => {
  it('maps today to the current moment so it is never in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T06:30:00'));
    expect(new Date(dayToDateTime(todayDay())).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('maps any other day to midday of that day', () => {
    const iso = dayToDateTime('2026-11-01');
    expect(new Date(iso).getHours()).toBe(12);
    expect(new Date(iso).getDate()).toBe(1);
  });
});
