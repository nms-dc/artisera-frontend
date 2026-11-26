'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Pill } from '@/core/ui/common';
import { fDate } from '@/lib/formatters';
import type { SaleDetail } from '@/lib/types';
import { InfoCard, InfoLabel } from './shared';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 1.25 }}>
    <InfoLabel>{label}</InfoLabel>
    <Box sx={{ mt: 0.25 }}>{children}</Box>
  </Box>
);
const Text = ({ value }: { value: string | null }) => <Typography sx={{ whiteSpace: 'pre-wrap' }}>{value?.trim() || '—'}</Typography>;

/** The notes and special instructions captured when the inquiry was marked as Won. */
export default function SaleInstructions({ sale }: { sale: SaleDetail }) {
  const productNotes = sale.products.filter((p) => p.orderNotes?.trim());
  return (
    <InfoCard>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Notes & Special Instructions
      </Typography>
      <Grid container columnSpacing={3}>
        <Grid item xs={12} md={4}>
          <Field label="Shipment Priority">
            <Pill label={sale.shipmentPriority} />
            {sale.requiredShipmentDate && <Typography variant="body2">Required by {fDate(sale.requiredShipmentDate)}</Typography>}
          </Field>
          <Field label="Shipment Instructions">
            <Text value={sale.shipmentInstructions} />
          </Field>
        </Grid>
        <Grid item xs={12} md={4}>
          <Field label="Sale Notes">
            <Text value={sale.notes} />
          </Field>
          <Field label="Payment">
            <Pill label={sale.paymentStatus} />
            {sale.paymentNotes?.trim() && <Typography variant="body2">{sale.paymentNotes}</Typography>}
          </Field>
        </Grid>
        <Grid item xs={12} md={4}>
          <Field label="Product Order Notes">
            {productNotes.length === 0 ? (
              <Text value={null} />
            ) : (
              productNotes.map((p) => (
                <Typography key={p.id} variant="body2">
                  <strong>{p.name}:</strong> {p.orderNotes}
                </Typography>
              ))
            )}
          </Field>
        </Grid>
      </Grid>
    </InfoCard>
  );
}
