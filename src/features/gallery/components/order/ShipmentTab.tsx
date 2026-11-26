'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FieldLabel, LabeledSelect } from '@/core/ui/common';
import { tokens } from '@/core/theme/palette';
import { COURIERS } from '@/lib/constants';
import { todayDay } from '@/lib/dates';
import { toOptions } from '@/lib/options';
import { ShipmentSaveBar } from './packingForm';
import type { PackingCtl } from './packingForm';
import type { OrderDetail } from '@/lib/types';
import DateField from '@/core/ui/DateField';

export function ShipmentTab({ order, ctl }: { order: OrderDetail; ctl: PackingCtl }) {
  const { form, update, shipmentAttempted: attempted, locked, futureDispatch } = ctl;
  return (
    <Stack spacing={2.5}>
      {!order.readyForPacking && <Alert severity="info">Mark the order as Ready for Packing on the Products tab before entering shipment details.</Alert>}
      {order.readyForPacking && !order.actualDispatchDate && order.packages.length === 0 && (
        <Alert severity="info">Packing is not saved yet. You can enter shipment details now, but save the Packing tab before marking the order Dispatched.</Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Box sx={{ p: 2, border: `1px solid ${tokens.border}`, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Shipment Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <LabeledSelect
                  label="Courier / Logistics"
                  required
                  disabled={locked}
                  error={attempted && ctl.courierMissing}
                  value={form.courier}
                  onChange={(courier) => update({ courier })}
                  options={toOptions(COURIERS)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FieldLabel label="Waybill / Tracking No. (optional)">
                  <TextField disabled={locked} value={form.waybill} onChange={(e) => update({ waybill: e.target.value })} />
                </FieldLabel>
              </Grid>
              <Grid item xs={12} md={4}>
                <FieldLabel label="Actual Dispatch Date">
                  <DateField
                    disabled={locked}
                    value={form.dispatchDate}
                    error={attempted && futureDispatch}
                    helperText={attempted && futureDispatch ? 'Cannot be in the future.' : undefined}
                    inputProps={{ max: todayDay() }}
                    onChange={(e) => update({ dispatchDate: e.target.value })}
                  />
                </FieldLabel>
              </Grid>
            </Grid>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: `1px solid ${tokens.border}`, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Documents & Dispatch
            </Typography>
            <Stack>
              <FormControlLabel
                control={<Checkbox disabled={locked} checked={form.certificateIncluded} onChange={(e) => update({ certificateIncluded: e.target.checked })} />}
                label="Certificate Included"
              />
              <FormControlLabel
                control={<Checkbox disabled={locked} checked={form.invoiceIncluded} onChange={(e) => update({ invoiceIncluded: e.target.checked })} />}
                label="Invoice Included"
              />
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <ShipmentSaveBar ctl={ctl} />
    </Stack>
  );
}
