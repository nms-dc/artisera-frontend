'use client';

import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { tokens } from '@/core/theme/palette';
import { RepeatTag } from '@/core/ui/common';
import type { Activity, CustomerSummary } from '@/lib/types';

export function CustomerCell({ c, link, repeat }: { c?: CustomerSummary | null; link?: boolean; repeat?: boolean }) {
  return (
    <Box sx={{ lineHeight: 1.35 }}>
      {link && c ? (
        <NextLink href={`/customers/${c.id}`} style={{ color: tokens.blue, fontWeight: 700, textDecoration: 'none' }}>
          {c.name}
        </NextLink>
      ) : (
        <b style={{ color: tokens.ink }}>{c?.name ?? '—'}</b>
      )}
      <br />
      <span style={{ fontSize: 12 }}>{c?.phone}</span>
      {repeat && (
        <Box sx={{ mt: 0.25 }}>
          <RepeatTag />
        </Box>
      )}
    </Box>
  );
}

export function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time || '09:00'}`).toISOString();
}

const wrapSx = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;

/**
 * Body of a history entry. Always shows `text`; shows `notes` / `remark` on their own labelled lines
 * when the API sends them as separate fields and they are not already part of `text`.
 */
export function ActivityDetails({ activity }: { activity: Activity }) {
  const extras = [
    { label: 'Notes', value: activity.notes?.trim() },
    { label: 'Remark', value: activity.remark?.trim() },
  ].filter((x): x is { label: string; value: string } => Boolean(x.value) && !activity.text.includes(x.value as string));
  return (
    <>
      <Typography variant="body2" sx={wrapSx}>
        {activity.text}
      </Typography>
      {extras.map((x) => (
        <Typography key={x.label} variant="body2" sx={wrapSx}>
          <b>{x.label}:</b> {x.value}
        </Typography>
      ))}
    </>
  );
}
