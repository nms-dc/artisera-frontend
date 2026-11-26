import { describe, expect, it } from 'vitest';
import { changedFields } from './diff';

describe('changedFields', () => {
  it('returns only the fields whose value changed', () => {
    expect(changedFields({ a: 'x', b: '2', c: '' }, { a: 'x', b: '1', c: '' })).toEqual({ b: '2' });
  });

  it('returns an empty object when nothing changed', () => {
    expect(changedFields({ a: 1 }, { a: 1 })).toEqual({});
  });

  it('keeps a field that was cleared', () => {
    expect(changedFields({ notes: '' }, { notes: 'old' })).toEqual({ notes: '' });
  });
});
