import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { FieldLabel, Panel, Pill } from '@/core/ui/common';
import { tokens } from '@/core/theme/palette';
import { fDate, fNum } from '@/lib/formatters';
import { Info } from './parts';
import type { WonErrors, WonFormState } from './form';
import type { Inquiry } from '@/lib/types';
import DateField from '@/core/ui/DateField';
import AmountField from '@/core/ui/AmountField';

type Props = { inquiry: Inquiry; form: WonFormState; errors: WonErrors; update: (patch: Partial<WonFormState>) => void };

export function SaleStep({ inquiry, form, errors, update }: Props) {
  return (
    <Stack spacing={2}>
      <Panel title="1. Inquiry & Customer Details (from Inquiry)">
        <Grid container columnSpacing={4}>
          <Grid item xs={12} md={4}>
            <Info label="Inquiry ID">{inquiry.code}</Info>
            <Info label="Customer">{inquiry.customer.name}</Info>
            <Info label="Email">{inquiry.customer.email ?? '—'}</Info>
            <Info label="Phone">{inquiry.customer.phone}</Info>
          </Grid>
          <Grid item xs={12} md={5}>
            <Info label="Requirement">{inquiry.requirement}</Info>
            <Info label="Category">
              {inquiry.category?.name ?? 'Not specified'}
              {inquiry.subcategory ? ` / ${inquiry.subcategory.name}` : ''}
            </Info>
            <Info label="Artist">{inquiry.artist?.name ?? 'Not specified'}</Info>
          </Grid>
          <Grid item xs={12} md={3}>
            <Info label="Value (₹)">{fNum(inquiry.value)}</Info>
            <Info label="Status">
              <Pill label={inquiry.status} />
            </Info>
            <Info label="Assigned to">{inquiry.rm?.name ?? '—'}</Info>
            <Info label="Created">{fDate(inquiry.createdAt)}</Info>
          </Grid>
        </Grid>
      </Panel>
      <Panel title="2. Sale Details">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FieldLabel label="Total Value of Sale (₹)" required>
              <AmountField
                value={form.totalValue}
                error={Boolean(errors.totalValue)}
                helperText={errors.totalValue ?? 'Pre-filled from inquiry. Confirm or update the final agreed value.'}
                onChange={(e) => update({ totalValue: e.target.value })}
                InputProps={{ startAdornment: <Box sx={{ mr: 1, color: tokens.muted }}>₹</Box> }}
              />
            </FieldLabel>
          </Grid>
          <Grid item xs={12} md={3}>
            <FieldLabel label="Sale Date" required>
              <DateField value={form.saleDate} error={Boolean(errors.saleDate)} helperText={errors.saleDate} onChange={(e) => update({ saleDate: e.target.value })} />
            </FieldLabel>
          </Grid>
          <Grid item xs={12} md={5}>
            <FieldLabel label="Sale Notes (Optional)">
              <TextField
                multiline
                minRows={3}
                value={form.notes}
                placeholder="Any additional notes about the sale..."
                onChange={(e) => update({ notes: e.target.value.slice(0, 1000) })}
              />
            </FieldLabel>
          </Grid>
        </Grid>
      </Panel>
    </Stack>
  );
}
