'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Iconify from '@/core/ui/Iconify';
import { PACKAGING_TYPES } from '@/lib/constants';
import { MediaGrid } from './MediaGrid';
import { PackingSaveBar } from './packingForm';
import type { PackingCtl } from './packingForm';
import type { OrderDetail, PackagingType } from '@/lib/types';

const toNumber = (v: string) => (v === '' ? null : Number(v));

export function PackingTab({ order, ctl, onContinue }: { order: OrderDetail; ctl: PackingCtl; onContinue: () => void }) {
  const { form, setPackage, addPackage, removePackage, packingAttempted: attempted, locked } = ctl;

  // Dimensions are stored in cm. The inch view only converts what is shown and typed.
  const [unit, setUnit] = React.useState<'cm' | 'in'>('cm');
  const toView = (cm: number | null | undefined) => (cm == null ? '' : unit === 'in' ? Math.round((cm / 2.54) * 10) / 10 : cm);
  const numberCell = (index: number, key: 'lengthCm' | 'widthCm' | 'heightCm' | 'weightKg') => {
    const isDim = key !== 'weightKg';
    return (
      <TextField
        size="small"
        type="number"
        disabled={locked}
        value={isDim ? toView(form.packages[index][key]) : (form.packages[index][key] ?? '')}
        onChange={(e) => {
          const n = toNumber(e.target.value);
          setPackage(index, { [key]: isDim && unit === 'in' && n != null ? Math.round(n * 2.54 * 100) / 100 : n });
        }}
        inputProps={{ min: 0, step: key === 'weightKg' ? 0.1 : 1 }}
        sx={{ width: 90 }}
      />
    );
  };

  return (
    <Stack spacing={2.5}>
      {!order.readyForPacking && <Alert severity="info">Mark the order as Ready for Packing on the Products tab before entering packing details.</Alert>}

      <Box>
        <Typography variant="h6">
          1. Packaging Details{' '}
          <Typography component="span" variant="body2">
            (One or more packages can be added)
          </Typography>
        </Typography>
        <TextField
          select
          size="small"
          label="Dimension unit"
          value={unit}
          disabled={locked}
          onChange={(e) => setUnit(e.target.value as 'cm' | 'in')}
          SelectProps={{ native: true }}
          sx={{ my: 1, width: 150 }}
        >
          <option value="cm">Centimetres (cm)</option>
          <option value="in">Inches (in)</option>
        </TextField>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['#', 'Packaging Type *', `Length (${unit})`, `Width (${unit})`, `Height (${unit})`, 'Weight (kg)', 'Notes (optional)', ''].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {form.packages.map((pack, i) => (
              <TableRow key={pack.id ?? i}>
                <TableCell>{i + 1}</TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <TextField
                    select
                    size="small"
                    disabled={locked}
                    value={pack.packagingType}
                    error={attempted && !pack.packagingType}
                    onChange={(e) => setPackage(i, { packagingType: e.target.value as PackagingType })}
                    SelectProps={{ native: true }}
                  >
                    <option value="">— Select —</option>
                    {PACKAGING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>{numberCell(i, 'lengthCm')}</TableCell>
                <TableCell>{numberCell(i, 'widthCm')}</TableCell>
                <TableCell>{numberCell(i, 'heightCm')}</TableCell>
                <TableCell>{numberCell(i, 'weightKg')}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <TextField
                    size="small"
                    disabled={locked}
                    value={pack.notes}
                    placeholder="E.g. Fragile, Handle with care"
                    onChange={(e) => setPackage(i, { notes: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="error" aria-label="Remove package" disabled={locked || form.packages.length === 1} onClick={() => removePackage(i)}>
                    <Iconify icon="mdi:trash-can-outline" width={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button sx={{ mt: 1 }} variant="outlined" disabled={locked} startIcon={<Iconify icon="mdi:plus" width={18} />} onClick={addPackage}>
          Add Another Package
        </Button>
      </Box>

      <Box>
        <Typography variant="h6">2. Packing Photos / Videos *</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Upload at least one photo or video of the packed items and packaging. It is required before the packing can be saved and the order shipped.
        </Typography>
        <MediaGrid orderId={order.id} kind="packing" media={order.media} locked={!ctl.canEdit} />
      </Box>

      <PackingSaveBar ctl={ctl} onContinue={onContinue} />
    </Stack>
  );
}
