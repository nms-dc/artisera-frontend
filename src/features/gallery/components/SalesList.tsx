'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { LabeledSelect, PageHeader, Pager, Pill, QueryState, tableWrap, usePageReset, usePaging } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { endpoints } from '@/core/api/endpoints';
import { useAuth } from '@/core/auth/useAuth';
import { ORDER_STATUSES } from '@/lib/constants';
import { fDate, fNum } from '@/lib/formatters';
import { useGetGalleryCustomersQuery, useGetSalesQuery } from '../api';
import { CertificateTag, EntityLink, ExportButton, FilterBar, toParams, useListFilters } from './shared';
import type { OrderStatus, SaleListParams } from '@/lib/types';

function CreateOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data } = useGetSalesQuery({ pageSize: 100 }, { skip: !open });
  const [saleId, setSaleId] = React.useState('');
  const options = (data?.results ?? [])
    .filter((s) => s.productsRemaining > 0)
    .map((s) => ({ value: s.id, label: `${s.saleNumber} — ${s.customer.name} (${s.productsRemaining} remaining)` }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create Order
        </Typography>
        <LabeledSelect label="Select a won sale" value={saleId} onChange={setSaleId} options={options} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!saleId} onClick={() => router.push(`/sales/${saleId}`)}>
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const CERTIFICATE_OPTIONS = [
  { value: 'with-shipment', label: 'With shipment' },
  { value: 'pending', label: 'Separately — pending' },
  { value: 'sent', label: 'Separately — sent' },
];

export default function SalesList() {
  const { can } = useAuth();
  const controller = useListFilters();
  const { applied } = controller;
  const paging = usePaging(10);
  const [creating, setCreating] = React.useState(false);
  usePageReset(paging.setPage, JSON.stringify(applied));
  const { data: customers = [] } = useGetGalleryCustomersQuery();
  const params: SaleListParams = {
    ...toParams(applied),
    orderStatus: (applied.status || undefined) as SaleListParams['orderStatus'],
    certificateStatus: (applied.certificate || undefined) as SaleListParams['certificateStatus'],
  };
  const { data, isFetching, error } = useGetSalesQuery({ ...params, page: paging.page, pageSize: paging.size });
  const rows = data?.results ?? [];

  return (
    <Box>
      <PageHeader
        title="Sales (Won)"
        subtitle="View and manage all won sales, create orders, track progress and dispatch certificates."
        actions={
          can('orders', 'create') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" width={18} />} onClick={() => setCreating(true)}>
              Create Order
            </Button>
          ) : undefined
        }
      />
      <FilterBar
        filters={controller.draft}
        controller={controller}
        placeholder="Search by Sale No, Customer, Product, Artist..."
        specs={[
          { key: 'customerId', label: 'Customer', all: 'All Customers', options: customers.map((c) => ({ value: c.id, label: c.name })) },
          {
            key: 'status',
            label: 'Order Status',
            all: 'All Status',
            options: [{ value: 'none', label: 'No orders yet' }, ...ORDER_STATUSES.map((s: OrderStatus) => ({ value: s, label: s }))],
          },
          { key: 'certificate', label: 'Certificate Status', all: 'All', options: CERTIFICATE_OPTIONS },
        ]}
      />
      <Box sx={{ bgcolor: '#fff', border: '1px solid #E1E7F2', borderRadius: 2, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6">Won Sales ({data?.count ?? 0})</Typography>
          <ExportButton url={endpoints.sales.export} params={toParams(applied)} filename="won-sales.csv" />
        </Box>
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  '#',
                  'Sale Number',
                  'Inquiry ID',
                  'Customer',
                  'RM',
                  'Sale Date',
                  'Total Sale Value (₹)',
                  'Total Orders',
                  'RM Email',
                  'Total Products',
                  'Products Remaining',
                  'Certificate',
                ].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={12} emptyText="No sales found." />
              {rows.map((s, n) => (
                <TableRow key={s.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                  <TableCell>{(paging.page - 1) * paging.size + n + 1}</TableCell>
                  <TableCell>
                    <EntityLink href={`/sales/${s.id}`}>{s.saleNumber}</EntityLink>
                  </TableCell>
                  <TableCell>
                    <EntityLink href={`/inquiries/${s.inquiry.id}`}>{s.inquiry.code}</EntityLink>
                  </TableCell>
                  <TableCell>{s.customer.name}</TableCell>
                  <TableCell>{s.rm?.name ?? '—'}</TableCell>
                  <TableCell>{fDate(s.saleDate)}</TableCell>
                  <TableCell>{fNum(s.totalValue)}</TableCell>
                  <TableCell>{s.totalOrders}</TableCell>
                  <TableCell>
                    <Pill label={s.emailConfirmed ? 'Received' : 'Pending'} />
                  </TableCell>
                  <TableCell>{s.totalProducts}</TableCell>
                  <TableCell>{s.productsRemaining}</TableCell>
                  <TableCell>
                    <CertificateTag separately={s.certificateSeparately} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Pager paging={paging} total={data?.count ?? 0} noun="sales" />
      </Box>
      <CreateOrderDialog open={creating} onClose={() => setCreating(false)} />
    </Box>
  );
}
