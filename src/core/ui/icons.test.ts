import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && !f.endsWith('icons.generated.ts') && !f.endsWith('.test.ts') ? [p] : [];
  });

describe('bundled icons', () => {
  it('contains every mdi icon used in src (run `npm run icons` if this fails)', () => {
    const generated = readFileSync('src/core/ui/icons.generated.ts', 'utf8');
    const used = new Set<string>();
    for (const file of walk('src')) for (const m of readFileSync(file, 'utf8').matchAll(/mdi:([a-z0-9-]+)/g)) used.add(m[1]);
    const missing = [...used].filter((n) => !generated.includes(`"${n}"`));
    expect(missing).toEqual([]);
  });
});
