'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { PageHeader, Pill, TabsUnderline, tableWrap, HighlightFrame } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { errorMessage } from '@/core/api/errors';
import { handleSubmitError } from '@/core/ui/forms';
import { useAuth } from '@/core/auth/useAuth';
import { tokens } from '@/core/theme/palette';
import { PRODUCT_STATUSES, requiresReadyDate } from '@/lib/constants';
import { dayOf, dayToDateTime } from '@/lib/dates';
import { fDate, fDateTime, fINR, fNum } from '@/lib/formatters';
import { useCreateOrdersMutation, useGetSaleQuery, useMarkSaleEmailReceivedMutation, useOverrideSaleEmailMutation, useUpdateSaleProductMutation } from '../api';
import SaleInstructions from './SaleInstructions';
import { CertificateTag, EntityLink, InfoCard, InfoLabel, InfoValue } from './shared';
import type { ProductStatus, SaleProduct } from '@/lib/types';
import DateField from '@/core/ui/DateField';

type RowProps = {
  saleId: string;
  product: SaleProduct;
  index: number;
  canEdit: boolean;
  /** Only In Stock products that are not yet in an order, and only once the RM email is confirmed. */
  selectable: boolean;
  /** Why the checkbox is disabled; shown on hover. */
  blockedReason: string | null;
  group: string | undefined;
  groupCount: number;
  onSelect: (checked: boolean) => void;
  onGroup: (group: string) => void;
};

function ProductRow({ saleId, product, index, canEdit, selectable, blockedReason, group, groupCount, onSelect, onGroup }: RowProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [update] = useUpdateSaleProductMutation();
  const [notes, setNotes] = React.useState(product.orderNotes ?? '');
  const locked = !canEdit || Boolean(product.orderId);
  // With Artist and Commission need a ready date. A status change that lacks one is held here until the date is picked,
  // then both are saved together. A date picked earlier is remembered, so switching the status away and back does not lose it.
  const [draftStatus, setDraftStatus] = React.useState<ProductStatus | null>(null);
  const rememberedDate = React.useRef(product.commissionReadyDate);
  if (product.commissionReadyDate) rememberedDate.current = product.commissionReadyDate;
  const shownStatus = draftStatus ?? product.productStatus;
  const needsDate = requiresReadyDate(shownStatus);
  const shownDate = draftStatus ? '' : product.commissionReadyDate ? dayOf(product.commissionReadyDate) : '';
  const dateMissing = needsDate && !shownDate;
  const save = async (changes: Parameters<typeof update>[0]['changes']) => {
    try {
      await update({ saleId, productId: product.id, changes }).unwrap();
      return true;
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
      return false;
    }
  };
  const changeStatus = (next: ProductStatus) => {
    if (requiresReadyDate(next) && !rememberedDate.current) {
      setDraftStatus(next);
      enqueueSnackbar(`Pick the Ready Date to save the ${next} status.`, { variant: 'warning' });
      return;
    }
    setDraftStatus(null);
    void save(requiresReadyDate(next) ? { productStatus: next, commissionReadyDate: rememberedDate.current } : { productStatus: next });
  };
  const changeDate = async (day: string) => {
    if (!day) {
      enqueueSnackbar('A ready date is required for With Artist and Commission products.', { variant: 'warning' });
      return;
    }
    const date = dayToDateTime(day);
    rememberedDate.current = date;
    if (await save(draftStatus ? { productStatus: draftStatus, commissionReadyDate: date } : { commissionReadyDate: date })) setDraftStatus(null);
  };

  return (
    <TableRow>
      <TableCell>{index + 1}</TableCell>
      <TableCell padding="checkbox">
        <Tooltip title={blockedReason ?? ''}>
          <span>
            <Checkbox disabled={!selectable} checked={group !== undefined} onChange={(e) => onSelect(e.target.checked)} inputProps={{ 'aria-label': `Select ${product.name}` }} />
          </span>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ fontWeight: 600, color: tokens.ink }}>{product.name}</TableCell>
      <TableCell>{product.artist?.name ?? '—'}</TableCell>
      <TableCell>{fNum(product.listedPrice)}</TableCell>
      <TableCell>{product.quantity}</TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        {locked ? (
          <Pill label={product.productStatus} />
        ) : (
          <TextField select size="small" value={shownStatus} onChange={(e) => changeStatus(e.target.value as ProductStatus)} SelectProps={{ native: true }}>
            {PRODUCT_STATUSES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </TextField>
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 90 }}>
        <TextField
          select
          size="small"
          disabled={group === undefined}
          value={group ?? '1'}
          onChange={(e) => onGroup(e.target.value)}
          SelectProps={{ native: true }}
          inputProps={{ 'aria-label': `Group for ${product.name}` }}
        >
          {Array.from({ length: Math.max(groupCount, 1) }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {i + 1}
            </option>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ minWidth: 170 }}>
        <DateField
          size="small"
          disabled={locked || !needsDate}
          required={needsDate}
          error={dateMissing}
          helperText={dateMissing ? `Required for ${shownStatus}` : undefined}
          value={shownDate}
          onChange={(e) => void changeDate(e.target.value)}
          inputProps={{ 'aria-label': 'Ready date' }}
        />
      </TableCell>
      <TableCell sx={{ minWidth: 200 }}>
        <TextField
          size="small"
          disabled={locked}
          value={notes}
          placeholder="E.g. Framing required..."
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (product.orderNotes ?? '') && save({ orderNotes: notes })}
        />
      </TableCell>
      <TableCell>
        {product.orderNumber ? <EntityLink href={`/orders/${product.orderId}`}>{product.orderNumber}</EntityLink> : <span style={{ color: tokens.muted }}>—</span>}
      </TableCell>
    </TableRow>
  );
}

export default function SaleDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: sale, isLoading, error } = useGetSaleQuery(id);
  const [tab, setTab] = React.useState('products');
  const { enqueueSnackbar } = useSnackbar();
  const [override, { isLoading: overriding }] = useOverrideSaleEmailMutation();
  const [markReceived, { isLoading: marking }] = useMarkSaleEmailReceivedMutation();
  // 'received': the RM email really arrived. 'override': it did not, but the Gallery Manager goes ahead anyway.
  const [emailAction, setEmailAction] = React.useState<'received' | 'override' | null>(null);
  const [createOrders, { isLoading: creating }] = useCreateOrdersMutation();
  // product id -> group number, present only for ticked products
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const runEmailAction = async () => {
    try {
      if (emailAction === 'override') await override(id).unwrap();
      else await markReceived(id).unwrap();
      enqueueSnackbar(emailAction === 'override' ? 'Overridden. You can now create orders.' : 'RM email marked as Received', { variant: 'success' });
      setEmailAction(null);
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  if (isLoading) return <CircularProgress />;
  if (error || !sale) return <Alert severity="error">{errorMessage(error) ?? 'Sale not found.'}</Alert>;

  const emailOk = sale.rmNotification.status === 'Received';
  const isSelectable = (p: SaleProduct) => can('orders', 'create') && emailOk && !p.orderId && p.productStatus === 'In Stock';
  const blockedReason = (p: SaleProduct) => {
    if (isSelectable(p)) return null;
    if (p.orderId) return `Already in order ${p.orderNumber ?? ''}`.trim();
    if (!emailOk) return 'RM email not received yet';
    if (p.productStatus !== 'In Stock') return 'Only In Stock products can be added to an order';
    return null;
  };
  const orderable = sale.products.filter(isSelectable).length;
  const pickedIds = Object.keys(picked).filter((id) => sale.products.some((p) => p.id === id && isSelectable(p)));

  const submitOrders = async () => {
    // One order per group, in group order. Products in the same group travel together.
    const groups = Array.from(new Set(pickedIds.map((id) => picked[id])))
      .sort((a, b) => Number(a) - Number(b))
      .map((g) => pickedIds.filter((id) => picked[id] === g));
    try {
      const created = await createOrders({ saleId: sale.id, groups }).unwrap();
      enqueueSnackbar(`Created ${created.map((o) => o.orderNumber).join(', ')}`, { variant: 'success' });
      setPicked({});
      setTab('orders');
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };
  const canEdit = can('sales', 'edit');

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Sales', href: '/sales' }, { label: sale.saleNumber }]}
        title={`Won Sale - ${sale.saleNumber}`}
        actions={
          <Button variant="outlined" startIcon={<Iconify icon="mdi:arrow-left" width={18} />} onClick={() => router.push('/sales')}>
            Back to List
          </Button>
        }
      />
      <HighlightFrame match="sale-card">
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={3.5}>
            <InfoCard>
              <InfoLabel>Inquiry ID</InfoLabel>
              <InfoValue>{sale.inquiry.code}</InfoValue>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>Customer</InfoLabel>
                <InfoValue>{sale.customer.name}</InfoValue>
              </Box>
              <Stack spacing={0.25} sx={{ mt: 0.5, fontSize: 13 }}>
                <span>{sale.customer.email ?? '—'}</span>
                <span>{sale.customer.phone}</span>
              </Stack>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <InfoCard>
              <InfoLabel>Sale Number</InfoLabel>
              <InfoValue size={20}>{sale.saleNumber}</InfoValue>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>Sale Date</InfoLabel>
                <Typography sx={{ color: tokens.ink }}>{fDate(sale.saleDate)}</Typography>
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <InfoCard tone="amber">
              <InfoLabel>Total Sale Value</InfoLabel>
              <InfoValue size={24}>{fINR(sale.totalValue)}</InfoValue>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={3.5}>
            <InfoCard>
              <InfoLabel>RM</InfoLabel>
              <InfoValue>{sale.rm?.name ?? '—'}</InfoValue>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>RM Email Notification</InfoLabel>
                <Pill label={sale.rmNotification.status} />
              </Box>
              {sale.rmNotification.status !== 'Received' && can('sales', 'edit') && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" disabled={overriding || marking} onClick={() => setEmailAction('received')}>
                    Mark as Received
                  </Button>
                  <Button size="small" variant="outlined" color="warning" disabled={overriding || marking} onClick={() => setEmailAction('override')}>
                    Override
                  </Button>
                </Stack>
              )}
              {sale.rmNotification.status === 'Sent' && sale.rmNotification.sentAt && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  RM marked it sent on {fDateTime(sale.rmNotification.sentAt)}
                </Typography>
              )}
              {sale.rmNotification.at && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {sale.rmNotification.overridden ? 'Overridden' : 'Received'} on {fDateTime(sale.rmNotification.at)}
                </Typography>
              )}
            </InfoCard>
          </Grid>
        </Grid>
      </HighlightFrame>

      <Box sx={{ mb: 1.5 }}>
        <SaleInstructions sale={sale} />
      </Box>
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2, p: 2 }}>
        <TabsUnderline
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'products', label: `Products Sold (${sale.products.length})` },
            { value: 'orders', label: `Orders (${sale.orders.length})` },
          ]}
        />

        {tab === 'products' && (
          <>
            {!emailOk && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                The RM email is Pending. Orders can be created only after it is marked as Received. Use &quot;Mark as Received&quot; above once the RM has informed you.
              </Alert>
            )}
            <Box sx={tableWrap}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {[
                      '#',
                      'Select',
                      'Product',
                      'Artist',
                      'Listed Price (₹)',
                      'Qty',
                      'Current Status',
                      'Group',
                      'Ready Date (With Artist / Commission) *',
                      'Order Notes (optional)',
                      'Order',
                    ].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sale.products.map((p, n) => (
                    <ProductRow
                      key={p.id}
                      saleId={sale.id}
                      product={p}
                      index={n}
                      canEdit={canEdit}
                      selectable={isSelectable(p)}
                      blockedReason={blockedReason(p)}
                      group={isSelectable(p) ? picked[p.id] : undefined}
                      groupCount={orderable}
                      onSelect={(checked) =>
                        setPicked((cur) => {
                          const next = { ...cur };
                          if (checked) next[p.id] = '1';
                          else delete next[p.id];
                          return next;
                        })
                      }
                      onGroup={(g) => setPicked((cur) => ({ ...cur, [p.id]: g }))}
                    />
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between" spacing={2} sx={{ mt: 2, p: 2, bgcolor: '#EEF5FF', borderRadius: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Iconify icon="mdi:information" width={26} sx={{ color: tokens.blue }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: tokens.blue }}>Create Orders by selecting In Stock products and assigning a Group.</Typography>
                  <Typography variant="body2">• The checkbox is available only for products with status &quot;In Stock&quot;.</Typography>
                  <Typography variant="body2">
                    • Each Group creates a separate Order (for example {sale.saleNumber}-A, {sale.saleNumber}-B). If only one group is used on the first order, the Order Number is{' '}
                    {sale.saleNumber}.
                  </Typography>
                </Box>
              </Stack>
              {can('orders', 'create') && (
                <Box sx={{ textAlign: 'center' }}>
                  <Button variant="contained" size="large" disabled={pickedIds.length === 0 || creating} onClick={submitOrders}>
                    Create Order(s)
                  </Button>
                  <Typography variant="caption" display="block">
                    Only selected In Stock products will be included
                  </Typography>
                </Box>
              )}
            </Stack>
          </>
        )}

        {tab === 'orders' && (
          <Box sx={tableWrap}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Orders for this Sale ({sale.orders.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Order Number', 'Order Date', 'Products', 'Order Value (₹)', 'Status', 'Certificate'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: tokens.muted }}>
                      No orders created yet.
                    </TableCell>
                  </TableRow>
                )}
                {sale.orders.map((o, n) => (
                  <TableRow key={o.id}>
                    <TableCell>{n + 1}</TableCell>
                    <TableCell>
                      <EntityLink href={`/orders/${o.id}`}>{o.orderNumber}</EntityLink>
                    </TableCell>
                    <TableCell>{fDate(o.orderDate)}</TableCell>
                    <TableCell>{o.totalProducts}</TableCell>
                    <TableCell>{fNum(o.orderValue)}</TableCell>
                    <TableCell>
                      <Pill label={o.status} />
                    </TableCell>
                    <TableCell>
                      <CertificateTag separately={o.certificateSeparately} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
      <Dialog open={emailAction !== null} onClose={() => setEmailAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{emailAction === 'override' ? 'Override and continue without the RM email?' : 'Mark RM email as Received?'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {emailAction === 'override'
              ? 'Use this when the RM has not sent the email. You can still create and process orders for this sale. The override is recorded in the sale history.'
              : 'Confirm that the RM has informed you about this sale. This is recorded in the sale history and unlocks order creation.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setEmailAction(null)}>
            Cancel
          </Button>
          <Button variant="contained" color={emailAction === 'override' ? 'warning' : 'primary'} disabled={overriding || marking} onClick={runEmailAction}>
            {emailAction === 'override' ? 'Override' : 'Mark as Received'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
