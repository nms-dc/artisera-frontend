'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { format, subDays } from 'date-fns';
import { LabeledSelect } from '@/core/ui/common';
import { STATUSES } from '@/lib/constants';
import { useAuth } from '@/core/auth/useAuth';
import { useRms } from '@/features/users/api';
import { useCategoryOptions, useSubcategoryOptions } from '@/features/masters/api';
import type { InquiryStatus, ReportFilters as Filters } from '@/lib/types';
import DateField from '@/core/ui/DateField';

export const defaultFilters = (): Filters => ({ from: format(subDays(new Date(), 90), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') });

export default function ReportFilters({ onApply, extra }: { onApply: (f: Filters) => void; extra?: React.ReactNode }) {
  const { user } = useAuth();
  const [f, setF] = React.useState<Filters>(defaultFilters());
  const rms = useRms();
  const cats = useCategoryOptions();
  const subs = useSubcategoryOptions(f.categoryId);
  const set = (k: keyof Filters) => (v: string) => setF((p) => ({ ...p, [k]: v || undefined, ...(k === 'categoryId' ? { subcategoryId: undefined } : {}) }));
  const all = (label: string, xs: { value: string; label: string }[]) => [{ value: '', label }, ...xs];

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Date Range
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <DateField value={f.from ?? ''} onChange={(e) => set('from')(e.target.value)} sx={{ width: 150 }} />
          <span>–</span>
          <DateField value={f.to ?? ''} onChange={(e) => set('to')(e.target.value)} sx={{ width: 150 }} />
        </Stack>
      </Box>
      {user?.role === 'ADMIN' && (
        <Box sx={{ width: 170 }}>
          <LabeledSelect
            label="Relationship Manager"
            value={f.rmId ?? ''}
            onChange={set('rmId')}
            options={all(
              'All',
              rms.map((u) => ({ value: u.id, label: u.name })),
            )}
          />
        </Box>
      )}
      <Box sx={{ width: 150 }}>
        <LabeledSelect
          label="Category"
          value={f.categoryId ?? ''}
          onChange={set('categoryId')}
          options={all(
            'All',
            cats.map((c) => ({ value: c.id, label: c.name })),
          )}
        />
      </Box>
      <Box sx={{ width: 150 }}>
        <LabeledSelect
          label="Subcategory"
          value={f.subcategoryId ?? ''}
          onChange={set('subcategoryId')}
          options={all(
            'All',
            subs.map((c) => ({ value: c.id, label: c.name })),
          )}
        />
      </Box>
      <Box sx={{ width: 140 }}>
        <LabeledSelect
          label="Status"
          value={f.status ?? ''}
          onChange={(v) => setF((p) => ({ ...p, status: (v || undefined) as InquiryStatus | undefined }))}
          options={all(
            'All',
            STATUSES.map((s) => ({ value: s, label: s })),
          )}
        />
      </Box>
      <Box sx={{ flex: 1 }} />
      <Button variant="contained" onClick={() => onApply(f)}>
        Apply
      </Button>
      <Button
        variant="outlined"
        onClick={() => {
          const d = defaultFilters();
          setF(d);
          onApply(d);
        }}
      >
        Reset
      </Button>
      {extra}
    </Stack>
  );
}
