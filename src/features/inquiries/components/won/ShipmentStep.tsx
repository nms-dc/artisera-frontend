import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FieldLabel, Panel } from '@/core/ui/common';
import { tokens } from '@/core/theme/palette';
import { CERTIFICATE_PLANS, PAYMENT_STATUSES, SHIPMENT_PRIORITIES, requiresShipmentDate } from '@/lib/constants';
import type { WonErrors, WonFormState } from './form';
import type { CertificatePlan, PaymentStatus, ShipmentPriority } from '@/lib/types';
import DateField from '@/core/ui/DateField';

type Props = { form: WonFormState; errors: WonErrors; update: (patch: Partial<WonFormState>) => void };

export function CertificatePlanSection({ form, update }: Pick<Props, 'form' | 'update'>) {
  return (
    <Panel title="4. Certificate Plan (for all products) *">
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        This applies to all products in this sale. The Gallery Manager will manage certificates as per this selection.
      </Typography>
      <RadioGroup row value={form.certificatePlan} onChange={(e) => update({ certificatePlan: e.target.value as CertificatePlan })}>
        {CERTIFICATE_PLANS.map((plan) => (
          <Box
            key={plan.value}
            sx={{ flex: 1, minWidth: 260, mr: 2, mb: 1, p: 1.5, borderRadius: 2, border: `1.5px solid ${form.certificatePlan === plan.value ? tokens.blue : tokens.border}` }}
          >
            <FormControlLabel value={plan.value} control={<Radio size="small" />} label={<Typography sx={{ fontWeight: 700, color: tokens.ink }}>{plan.label}</Typography>} />
            <Typography variant="body2" sx={{ ml: 4 }}>
              {plan.hint}
            </Typography>
          </Box>
        ))}
      </RadioGroup>
    </Panel>
  );
}

export function ShipmentSection({ form, errors, update }: Props) {
  const dateRequired = requiresShipmentDate(form.priority);
  return (
    <Panel title="5. Shipment (Customer instructions)">
      <Typography variant="body2" sx={{ mb: 2 }}>
        Record the customer&apos;s shipment requirements for this sale.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FieldLabel label="Shipment Priority" required>
            <RadioGroup row value={form.priority} onChange={(e) => update({ priority: e.target.value as ShipmentPriority })}>
              {SHIPMENT_PRIORITIES.map((x) => (
                <FormControlLabel key={x} value={x} control={<Radio size="small" />} label={x} />
              ))}
            </RadioGroup>
          </FieldLabel>
        </Grid>
        <Grid item xs={12} md={4}>
          <FieldLabel label="Required Shipment Date" required={dateRequired}>
            <DateField
              value={form.requiredDate}
              disabled={!dateRequired}
              error={Boolean(errors.requiredDate)}
              helperText={errors.requiredDate ?? (dateRequired ? undefined : 'Select "Urgent" or "Specify Date" to set one')}
              onChange={(e) => update({ requiredDate: e.target.value })}
            />
          </FieldLabel>
        </Grid>
        <Grid item xs={12} md={4}>
          <FieldLabel label="Special Shipment Instructions">
            <TextField
              multiline
              minRows={3}
              value={form.instructions}
              placeholder="E.g. Deliver after 5 PM, special packaging, fragile handling..."
              onChange={(e) => update({ instructions: e.target.value.slice(0, 1000) })}
            />
          </FieldLabel>
        </Grid>
      </Grid>
    </Panel>
  );
}

export function PaymentSection({ form, update }: Pick<Props, 'form' | 'update'>) {
  return (
    <Panel title="6. Payment">
      <Typography variant="body2" sx={{ mb: 2 }}>
        Record the payment status for this sale.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FieldLabel label="Payment Status" required>
            <RadioGroup value={form.payment} onChange={(e) => update({ payment: e.target.value as PaymentStatus })}>
              {PAYMENT_STATUSES.map((x) => (
                <FormControlLabel key={x} value={x} control={<Radio size="small" />} label={x} />
              ))}
            </RadioGroup>
          </FieldLabel>
        </Grid>
        <Grid item xs={12} md={8}>
          <Stack>
            <FieldLabel label="Payment Notes (optional)">
              <TextField
                multiline
                minRows={3}
                value={form.paymentNotes}
                placeholder="E.g. Advance amount, payment mode, expected date etc..."
                onChange={(e) => update({ paymentNotes: e.target.value.slice(0, 500) })}
              />
            </FieldLabel>
          </Stack>
        </Grid>
      </Grid>
    </Panel>
  );
}
