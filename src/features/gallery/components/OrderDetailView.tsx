'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PageHeader, Pill, TabsUnderline, HighlightFrame } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { errorMessage } from '@/core/api/errors';
import { useAuth } from '@/core/auth/useAuth';
import { tokens } from '@/core/theme/palette';
import { fDate, fINR } from '@/lib/formatters';
import { useGetOrderQuery, useGetSaleQuery } from '../api';
import SaleInstructions from './SaleInstructions';
import { CertificateTag, InfoCard, InfoLabel, InfoValue } from './shared';
import { ActivityTab } from './order/ActivityTab';
import { PackingTab } from './order/PackingTab';
import { ShipmentTab } from './order/ShipmentTab';
import { usePackingForm } from './order/packingForm';
import { ProductsTab } from './order/ProductsTab';
import type { OrderDetail } from '@/lib/types';

function OrderTabs({ order, canEdit }: { order: OrderDetail; canEdit: boolean }) {
  const [tab, setTab] = React.useState('products');
  const packing = usePackingForm(order, canEdit);
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2, p: 2 }}>
      <TabsUnderline
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'products', label: `Products (${order.totalProducts})` },
          { value: 'packing', label: 'Packing' },
          { value: 'shipment', label: 'Shipment Details' },
          { value: 'activity', label: 'Activity' },
        ]}
      />
      {tab === 'products' && <ProductsTab order={order} canEdit={canEdit} />}
      {tab === 'packing' && <PackingTab order={order} ctl={packing} onContinue={() => setTab('shipment')} />}
      {tab === 'shipment' && <ShipmentTab order={order} ctl={packing} />}
      {tab === 'activity' && <ActivityTab order={order} canEdit={canEdit} />}
    </Box>
  );
}

export default function OrderDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: order, isLoading, error } = useGetOrderQuery(id);
  // The notes and special instructions live on the sale, so they are read from it (no extra backend field needed).
  const { data: sale } = useGetSaleQuery(order?.saleId ?? '', { skip: !order || !can('sales', 'view') });

  if (isLoading) return <CircularProgress />;
  if (error || !order) return <Alert severity="error">{errorMessage(error) ?? 'Order not found.'}</Alert>;
  const canEdit = can('orders', 'edit');
  const canOpenSale = can('sales', 'view');

  return (
    <Box>
      <PageHeader
        crumbs={
          canOpenSale
            ? [{ label: 'Sales', href: '/sales' }, { label: order.saleNumber, href: `/sales/${order.saleId}` }, { label: order.orderNumber }]
            : [{ label: 'Orders', href: '/orders' }, { label: order.orderNumber }]
        }
        title={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Iconify icon="mdi:truck-outline" width={34} sx={{ color: '#F59E0B' }} />
            <span>Order {order.orderNumber}</span>
            <Pill label={order.status} />
            <CertificateTag separately={order.certificateSeparately} sent={Boolean(order.certificateSentAt)} />
          </Stack>
        }
        actions={
          <Stack direction="row" spacing={1}>
            {order.certificateSeparately && !order.certificateSentAt && can('certificates', 'view') && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="mdi:certificate-outline" width={18} />}
                onClick={() => router.push(`/certificates?q=${encodeURIComponent(order.orderNumber)}`)}
              >
                Send Certificate
              </Button>
            )}
            <Button variant="outlined" startIcon={<Iconify icon="mdi:arrow-left" width={18} />} onClick={() => router.push(canOpenSale ? `/sales/${order.saleId}` : '/orders')}>
              {canOpenSale ? 'Back to Sale' : 'Back to Orders'}
            </Button>
          </Stack>
        }
      />
      <HighlightFrame match="order">
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={3}>
            <InfoCard>
              <InfoLabel>Inquiry ID</InfoLabel>
              <InfoValue>{order.inquiry.code}</InfoValue>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>Customer</InfoLabel>
                <InfoValue>{order.customer.name}</InfoValue>
              </Box>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>Relationship Manager</InfoLabel>
                <InfoValue>{order.rm?.name ?? '—'}</InfoValue>
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={3}>
            <InfoCard>
              <InfoLabel>Sale Number</InfoLabel>
              <InfoValue>{order.saleNumber}</InfoValue>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>Sale Date</InfoLabel>
                <Typography>{fDate(order.saleDate)}</Typography>
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={3}>
            <InfoCard tone="amber">
              <InfoLabel>Order Number</InfoLabel>
              <InfoValue size={20}>{order.orderNumber}</InfoValue>
              <Box sx={{ mt: 1 }}>
                <InfoLabel>Order Date</InfoLabel>
                <Typography>{fDate(order.orderDate)}</Typography>
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={3}>
            <InfoCard>
              <InfoLabel>Total Order Value</InfoLabel>
              <InfoValue size={24}>{fINR(order.orderValue)}</InfoValue>
              <Typography variant="body2">({order.totalProducts} products)</Typography>
            </InfoCard>
          </Grid>
        </Grid>
      </HighlightFrame>
      {sale && (
        <Box sx={{ mt: 1.5 }}>
          <SaleInstructions sale={sale} />
        </Box>
      )}
      <OrderTabs order={order} canEdit={canEdit} />
    </Box>
  );
}
