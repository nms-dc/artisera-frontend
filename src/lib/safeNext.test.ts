import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/orders/ord1')).toBe('/orders/ord1');
    expect(safeNext('/inquiries?tab=nurture')).toBe('/inquiries?tab=nurture');
  });
  it('rejects external, protocol-relative and login targets', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/login', '/login?next=/x', '', null, undefined]) {
      expect(safeNext(bad as string | null)).toBe('/dashboard');
    }
  });
});
