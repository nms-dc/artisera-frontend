'use client';

import * as React from 'react';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import Iconify from '@/core/ui/Iconify';
import { handleSubmitError } from '@/core/ui/forms';
import { tokens } from '@/core/theme/palette';
import { todayDay } from '@/lib/dates';
import { useGetOrderActivitiesQuery, useSetCertificateSentMutation, useSetOrderReceivedMutation } from '../../api';
import { Timeline } from '../shared';
import type { OrderDetail } from '@/lib/types';
import DateField from '@/core/ui/DateField';

type MilestoneProps = {
  icon: string;
  tint: string;
  title: string;
  text: string;
  label: string;
  checked: boolean;
  date: string | null;
  disabled: boolean;
  /** Earliest date allowed (yyyy-MM-dd). */
  min?: string;
  /** Resolves true when the change was saved, false when it was rejected. */
  onChange: (checked: boolean, date: string) => Promise<boolean>;
};

function Milestone({ icon, tint, title, text, label, checked, date, disabled, min, onChange }: MilestoneProps) {
  const { enqueueSnackbar } = useSnackbar();
  const saved = date ? format(new Date(date), 'yyyy-MM-dd') : '';
  const [day, setDay] = React.useState(saved);
  React.useEffect(() => setDay(saved), [saved]);
  const stamp = (value: string) => (value ? new Date(`${value}T12:00`).toISOString() : '');
  const problem = (value: string) => {
    if (value > todayDay()) return `${label} date cannot be in the future.`;
    if (value && min && value < min) return `${label} date cannot be before the dispatch date.`;
    return null;
  };
  const submit = async (next: boolean, value: string) => {
    const issue = next ? problem(value) : null;
    if (issue) {
      enqueueSnackbar(issue, { variant: 'warning' });
      setDay(saved);
      return;
    }
    if (!(await onChange(next, stamp(value)))) setDay(saved);
  };
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, borderRadius: 2, bgcolor: tint }}>
      <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: tokens.blue, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Iconify icon={icon} width={22} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 700, color: tokens.ink }}>{title}</Typography>
        <Typography variant="body2">{text}</Typography>
      </Box>
      <Stack direction="row" alignItems="center">
        <Checkbox disabled={disabled} checked={checked} onChange={(e) => submit(e.target.checked, day)} inputProps={{ 'aria-label': label }} />
        <Typography>{label}</Typography>
      </Stack>
      <DateField
        size="small"
        disabled={disabled}
        value={day}
        onChange={(e) => {
          setDay(e.target.value);
          if (checked) submit(true, e.target.value);
        }}
        sx={{ width: 170 }}
        inputProps={{ 'aria-label': `${label} date`, max: todayDay(), min }}
      />
    </Stack>
  );
}

export function ActivityTab({ order, canEdit }: { order: OrderDetail; canEdit: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: activity = [] } = useGetOrderActivitiesQuery(order.id);
  const [setReceived] = useSetOrderReceivedMutation();
  const [setSent] = useSetCertificateSentMutation();
  const run = async (task: Promise<unknown>, success: string) => {
    try {
      await task;
      enqueueSnackbar(success, { variant: 'success' });
      return true;
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
      return false;
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Order Activity</Typography>
      <Timeline items={activity} />
      <Milestone
        icon="mdi:email-outline"
        tint="#EAF1FF"
        title="Order Received by Customer"
        text="Mark this when the customer confirms receipt of the order."
        label="Order Received"
        checked={Boolean(order.receivedAt)}
        date={order.receivedAt}
        disabled={!canEdit || !order.actualDispatchDate}
        min={order.actualDispatchDate ? format(new Date(order.actualDispatchDate), 'yyyy-MM-dd') : undefined}
        onChange={(received, date) =>
          run(setReceived({ id: order.id, received, date: date || undefined }).unwrap(), received ? 'Order marked as received.' : 'Order received status cleared.')
        }
      />
      {order.certificateSeparately && (
        <Milestone
          icon="mdi:file-document-outline"
          tint="#F1EBFF"
          title="Certificate Sent"
          text="Mark this when the certificate for this order has been sent separately (to be sent based on RM selection)."
          label="Certificate Sent"
          checked={Boolean(order.certificateSentAt)}
          date={order.certificateSentAt}
          disabled={!canEdit}
          onChange={(sent, date) =>
            run(setSent({ id: order.id, sent, date: date || undefined }).unwrap(), sent ? 'Certificate marked as sent.' : 'Certificate marked as not sent.')
          }
        />
      )}
    </Stack>
  );
}
