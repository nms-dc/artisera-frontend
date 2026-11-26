'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '@/core/ui/ConfirmDialog';
import Iconify from '@/core/ui/Iconify';
import { handleSubmitError } from '@/core/ui/forms';
import { tokens } from '@/core/theme/palette';
import { fNum } from '@/lib/formatters';
import { useSaveOrderProductsMutation } from '../../api';
import { MediaGrid } from './MediaGrid';
import type { OrderDetail } from '@/lib/types';

export function ProductsTab({ order, canEdit }: { order: OrderDetail; canEdit: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const [save, { isLoading }] = useSaveOrderProductsMutation();
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [ready, setReady] = React.useState(order.readyForPacking);
  const [confirming, setConfirming] = React.useState(false);
  const locked = !canEdit || order.readyForPacking;
  // Uploading a photo refetches the order. Ticks that are not saved yet must survive that refetch.
  const dirty = React.useRef(false);

  React.useEffect(() => {
    if (dirty.current) return;
    setFlags(Object.fromEntries(order.products.map((p) => [p.id, p.photoVideoUploaded])));
    setReady(order.readyForPacking);
  }, [order]);

  const submit = async () => {
    setConfirming(false);
    if (ready && !order.readyForPacking && order.products.some((p) => !flags[p.id])) {
      enqueueSnackbar('Upload photos or videos and tick "Photo/Video Uploaded" for every product before marking the order Ready for Packing.', { variant: 'error' });
      return;
    }
    try {
      await save({ id: order.id, changes: { readyForPacking: ready, products: order.products.map((p) => ({ id: p.id, photoVideoUploaded: Boolean(flags[p.id]) })) } }).unwrap();
      dirty.current = false;
      enqueueSnackbar('Order saved', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ p: 2, border: `1px solid ${tokens.border}`, borderRadius: 2 }}>
        <Typography variant="h6">Upload Pictures / Videos for this Order</Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Add photos and/or videos of the products, packing or any other relevant details for this order. Tick &quot;Photo/Video Uploaded&quot; for each product before moving on;
          you can still add or remove files later, even after packing or dispatch. These files will be visible to the RM and other relevant users.
        </Typography>
        <MediaGrid orderId={order.id} kind="product" media={order.media} locked={!canEdit} />
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            {['#', 'Product', 'Artist', 'Listed Price (₹)', 'Qty', 'Order Notes', 'Photo/Video Uploaded'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {order.products.map((p, n) => (
            <TableRow key={p.id}>
              <TableCell>{n + 1}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.artist?.name ?? '—'}</TableCell>
              <TableCell>{fNum(p.listedPrice)}</TableCell>
              <TableCell>{p.quantity}</TableCell>
              <TableCell sx={{ maxWidth: 240 }}>{p.orderNotes?.trim() || '—'}</TableCell>
              <TableCell>
                <Checkbox
                  disabled={locked}
                  checked={Boolean(flags[p.id])}
                  onChange={(e) => {
                    dirty.current = true;
                    setFlags((f) => ({ ...f, [p.id]: e.target.checked }));
                  }}
                  inputProps={{ 'aria-label': `Photo or video uploaded for ${p.name}` }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, bgcolor: '#F3F8FF', borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify icon="mdi:package-variant-closed" width={30} />
          <Box>
            <Typography sx={{ fontWeight: 700, color: tokens.ink }}>Order Ready for Packing</Typography>
            <Typography variant="body2">Tick this checkbox once all products in this order are ready for packing.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center">
          <Checkbox
            disabled={locked}
            checked={ready}
            onChange={(e) => {
              dirty.current = true;
              setReady(e.target.checked);
            }}
            inputProps={{ 'aria-label': 'Ready for packing' }}
          />
          <Typography>Ready for Packing</Typography>
        </Stack>
      </Stack>
      {order.readyForPacking && <Alert severity="info">This order is ready for packing, so products and files can no longer be changed.</Alert>}
      {!locked && (
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" size="large" disabled={isLoading} onClick={() => (ready && !order.readyForPacking ? setConfirming(true) : submit())}>
            Save Order
          </Button>
        </Stack>
      )}
      <ConfirmDialog
        open={confirming}
        title="Mark order ready for packing?"
        message="Once confirmed, you cannot add more products or modify this order."
        confirmLabel="Confirm"
        busy={isLoading}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </Stack>
  );
}
