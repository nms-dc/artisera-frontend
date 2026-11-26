'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { format } from 'date-fns';
import { fDateTime } from '@/lib/formatters';
import Iconify from '@/core/ui/Iconify';
import { FieldLabel } from '@/core/ui/common';
import { tokens } from '@/core/theme/palette';
import { useGetActivitiesQuery } from '../../api';
import type { Method } from '@/lib/types';
import { ActivityDetails } from '../shared';
import DateField from '@/core/ui/DateField';

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
export const hm = (d: Date) => format(d, 'HH:mm');
export const METHODS: { m: Method; icon: string; color: string }[] = [
  { m: 'WhatsApp', icon: 'mdi:whatsapp', color: '#25D366' },
  { m: 'Email', icon: 'mdi:email-outline', color: tokens.blue },
  { m: 'Call', icon: 'mdi:phone', color: tokens.blue },
];

export function MethodPicker({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <FieldLabel label="Communication Method" required>
      <Stack direction="row" spacing={1}>
        {METHODS.map((x) => (
          <Button
            key={x.m}
            fullWidth
            variant="outlined"
            onClick={() => onChange(x.m)}
            startIcon={<Iconify icon={x.icon} width={20} sx={{ color: x.color }} />}
            sx={{ bgcolor: value === x.m ? '#DDEBFF' : '#fff', borderColor: value === x.m ? tokens.blue : tokens.border, color: tokens.ink }}
          >
            {x.m}
          </Button>
        ))}
      </Stack>
    </FieldLabel>
  );
}

export function NotesField({
  value,
  onChange,
  label = 'Notes (Optional)',
  required,
  error,
  helper,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helper?: string;
}) {
  return (
    <FieldLabel label={label} required={required}>
      <TextField multiline minRows={3} value={value} error={error} helperText={helper} onChange={(e) => onChange(e.target.value.slice(0, 1000))} />
      <Typography variant="caption" sx={{ float: 'right' }} color="text.secondary">
        {value.length}/1000
      </Typography>
    </FieldLabel>
  );
}

export const HISTORY_ICON: Record<string, string> = { Call: 'mdi:phone', Email: 'mdi:email-outline', WhatsApp: 'mdi:whatsapp' };

export function HistoryPanel({ inquiryId, title }: { inquiryId: string; title: string }) {
  const { data = [] } = useGetActivitiesQuery(inquiryId);
  const items = data.filter((a) => ['Touchbase', 'Follow-up', 'Conversation'].includes(a.kind));
  return (
    <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: 2, bgcolor: '#fff', p: 1.5, maxHeight: 300, overflowY: 'auto' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Iconify icon="mdi:history" width={18} sx={{ color: tokens.ink }} />
        <Typography variant="subtitle2" sx={{ color: tokens.ink }}>
          {title}
        </Typography>
      </Stack>
      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No attempts yet.
        </Typography>
      )}
      <Stack spacing={1.25}>
        {items.map((a) => (
          <Stack key={a.id} direction="row" spacing={1.25}>
            <Iconify icon={HISTORY_ICON[a.method ?? ''] ?? 'mdi:message-outline'} width={18} sx={{ color: tokens.blue, mt: 0.25 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.ink }}>
                {fDateTime(a.at)}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                {a.method} | {a.by.name}
              </Typography>
              <ActivityDetails activity={a} />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export function DateTimeFields({
  label,
  date,
  time,
  onDate,
  onTime,
  hint,
  error,
  disabled,
  required = true,
}: {
  label: string;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  hint?: string;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <FieldLabel label={label} required={required}>
      <Stack direction="row" spacing={1}>
        <DateField disabled={disabled} error={error && !date} value={date} onChange={(e) => onDate(e.target.value)} />
        <TextField type="time" disabled={disabled} error={error && !time} value={time} onChange={(e) => onTime(e.target.value)} />
      </Stack>
      {hint && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
          {hint}
        </Typography>
      )}
    </FieldLabel>
  );
}

export const panelSx = { m: 1.5, border: '1px solid #C9DCFB', borderRadius: 2, bgcolor: '#F3F8FF', overflow: 'hidden' } as const;
export const headSx = { px: 2, py: 1.25, bgcolor: '#E7F0FF' } as const;

export const FOLLOW_UP_HOUR = '09:00';

export function FollowUpDateField({
  label,
  value,
  onChange,
  disabled,
  error,
  hint,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
  min?: string;
  max?: string;
}) {
  return (
    <FieldLabel label={label} required={!disabled}>
      <DateField disabled={disabled} error={error} value={value} inputProps={{ min: min ?? ymd(new Date()), max }} onChange={(e) => onChange(e.target.value)} />
      <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
        {hint}
      </Typography>
    </FieldLabel>
  );
}
