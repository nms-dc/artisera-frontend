'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { HighlightFrame, PageHeader, Pager, Pill, QueryState, tableWrap, usePageReset, usePaging } from '@/core/ui/common';
import { endpoints } from '@/core/api/endpoints';
import { useAuth } from '@/core/auth/useAuth';
import { handleSubmitError } from '@/core/ui/forms';
import { COURIERS, ORDER_STATUSES, SHIPMENT_STATUSES, SHIPMENT_STATUS_LABEL } from '@/lib/constants';
import { fDate, fDateTime, fNum } from '@/lib/formatters';
import { toOptions } from '@/lib/options';
import {
  useGetCertificatesQuery,
  useGetGalleryCustomersQuery,
  useGetOrdersQuery,
  useGetShipmentsQuery,
  useSetCertificateSentMutation,
  useUpdateShipmentStatusMutation,
} from '../api';
import { CertificateTag, EntityLink, ExportButton, FilterBar, YesNo, toParams, useListFilters } from './shared';
import type { Courier, OrderStatus, ShipmentStatus } from '@/lib/types';

function ListCard({ title, count, exportButton, children }: { title: string; count: number; exportButton: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #E1E7F2', borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6">
          {title} ({count})
        </Typography>
        {exportButton}
      </Box>
      {children}
    </Box>
  );
}

function useCustomerOptions() {
  const { data = [] } = useGetGalleryCustomersQuery();
  return data.map((c) => ({ value: c.id, label: c.name }));
}

export function OrdersList() {
  const initialStatus = useSearchParams().get('status') ?? '';
  const controller = useListFilters({ status: initialStatus });
  const { applied } = controller;
  const paging = usePaging(10);
  usePageReset(paging.setPage, JSON.stringify(applied));
  const customers = useCustomerOptions();
  const { data, isFetching, error } = useGetOrdersQuery({
    ...toParams(applied),
    status: (applied.status || undefined) as OrderStatus | undefined,
    page: paging.page,
    pageSize: paging.size,
  });
  const rows = data?.results ?? [];

  return (
    <Box>
      <PageHeader title="Orders" subtitle="View and manage orders created from won sales. Track packing, shipment and certificates." />
      <FilterBar
        filters={controller.draft}
        controller={controller}
        placeholder="Search by Order No, Sale No, Customer, Product, Artist..."
        specs={[
          { key: 'status', label: 'Order Status', all: 'All Status', options: toOptions(ORDER_STATUSES) },
          { key: 'customerId', label: 'Customer', all: 'All Customers', options: customers },
        ]}
      />
      <HighlightFrame match="list" scroll={false}>
        <ListCard
          title="Orders"
          count={data?.count ?? 0}
          exportButton={<ExportButton url={endpoints.orders.export} params={{ ...toParams(applied), status: applied.status || undefined }} filename="orders.csv" />}
        >
          <Box sx={tableWrap}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Order Number', 'Sale Number', 'Customer', 'Relationship Manager', 'Order Date', 'Total Products', 'Order Value (₹)', 'Status', 'Certificate'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={10} emptyText="No orders found." />
                {rows.map((o, n) => (
                  <TableRow key={o.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                    <TableCell>{(paging.page - 1) * paging.size + n + 1}</TableCell>
                    <TableCell>
                      <EntityLink href={`/orders/${o.id}`}>{o.orderNumber}</EntityLink>
                    </TableCell>
                    <TableCell>{o.saleNumber}</TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell>{o.rm?.name ?? '—'}</TableCell>
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
          <Pager paging={paging} total={data?.count ?? 0} noun="orders" />
        </ListCard>
      </HighlightFrame>
    </Box>
  );
}

export function ShipmentsList() {
  const { can } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const controller = useListFilters();
  const { applied } = controller;
  const paging = usePaging(10);
  usePageReset(paging.setPage, JSON.stringify(applied));
  const [updateStatus] = useUpdateShipmentStatusMutation();
  const { data, isFetching, error } = useGetShipmentsQuery({
    ...toParams(applied),
    courier: (applied.courier || undefined) as Courier | undefined,
    status: (applied.status || undefined) as ShipmentStatus | undefined,
    page: paging.page,
    pageSize: paging.size,
  });
  const rows = data?.results ?? [];
  const change = async (id: string, status: ShipmentStatus) => {
    try {
      await updateStatus({ id, status }).unwrap();
      enqueueSnackbar(`Shipment status updated to ${SHIPMENT_STATUS_LABEL[status]}.`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader title="Shipments" subtitle="Track shipment details for all orders." />
      <FilterBar
        filters={controller.draft}
        controller={controller}
        placeholder="Search by Order No, Sale No, Customer, Courier, Tracking No..."
        specs={[
          { key: 'courier', label: 'Courier / Logistics', all: 'All', options: toOptions(COURIERS) },
          { key: 'status', label: 'Shipment Status', all: 'All', options: SHIPMENT_STATUSES.map((x) => ({ value: x, label: SHIPMENT_STATUS_LABEL[x] })) },
        ]}
      />
      <ListCard
        title="Shipments"
        count={data?.count ?? 0}
        exportButton={
          <ExportButton
            url={endpoints.shipments.export}
            params={{ ...toParams(applied), courier: applied.courier || undefined, status: applied.status || undefined }}
            filename="shipments.csv"
          />
        }
      >
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Order Number', 'Sale Number', 'Customer', 'RM', 'Courier / Logistics', 'Tracking No.', 'Dispatch Date', 'Status', 'Status Updated'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={9} emptyText="No shipments found." />
              {rows.map((s, n) => (
                <TableRow key={s.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                  <TableCell>{(paging.page - 1) * paging.size + n + 1}</TableCell>
                  <TableCell>
                    <EntityLink href={`/orders/${s.orderId}`}>{s.orderNumber}</EntityLink>
                  </TableCell>
                  <TableCell>{s.saleNumber}</TableCell>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell>{s.rmName ?? '—'}</TableCell>
                  <TableCell>{s.courier ?? '—'}</TableCell>
                  <TableCell>{s.trackingNo ?? '—'}</TableCell>
                  <TableCell>{fDate(s.dispatchDate)}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    {can('shipments', 'edit') ? (
                      <TextField
                        select
                        size="small"
                        value={s.status}
                        onChange={(e) => change(s.id, e.target.value as ShipmentStatus)}
                        SelectProps={{ native: true }}
                        inputProps={{ 'aria-label': `Status of ${s.orderNumber}` }}
                      >
                        {SHIPMENT_STATUSES.map((x) => (
                          <option key={x} value={x}>
                            {SHIPMENT_STATUS_LABEL[x]}
                          </option>
                        ))}
                      </TextField>
                    ) : (
                      <Pill label={SHIPMENT_STATUS_LABEL[s.status]} kind={s.status} />
                    )}
                  </TableCell>
                  <TableCell>{fDateTime(s.statusUpdatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Pager paging={paging} total={data?.count ?? 0} noun="shipments" />
      </ListCard>
    </Box>
  );
}

export function CertificatesList() {
  const { can } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  // Opened from an order's "Send Certificate" button with ?q=<order number>, so the order is already filtered.
  const controller = useListFilters({ q: useSearchParams().get('q') ?? '' });
  const { applied } = controller;
  const paging = usePaging(10);
  usePageReset(paging.setPage, JSON.stringify(applied));
  const customers = useCustomerOptions();
  const [setSent] = useSetCertificateSentMutation();
  const { data, isFetching, error } = useGetCertificatesQuery({ ...toParams(applied), page: paging.page, pageSize: paging.size });
  const rows = data?.results ?? [];
  const change = async (id: string, sent: boolean) => {
    try {
      await setSent({ id, sent }).unwrap();
      enqueueSnackbar(sent ? 'Certificate marked as sent.' : 'Certificate marked as not sent.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader title="Certificates" subtitle="Manage and track certificates for dispatched orders." />
      <FilterBar
        filters={controller.draft}
        controller={controller}
        placeholder="Search by Order No, Sale No, Customer..."
        specs={[{ key: 'customerId', label: 'Customer', all: 'All', options: customers }]}
      />
      <HighlightFrame match="list" scroll={false}>
        <ListCard
          title="Certificates"
          count={data?.count ?? 0}
          exportButton={<ExportButton url={endpoints.certificates.export} params={toParams(applied)} filename="certificates.csv" />}
        >
          <Box sx={tableWrap}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Order Number', 'Sale Number', 'Customer', 'RM', 'Dispatch Date', 'Sent Separately?', 'Certificate Dispatched'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={8} emptyText="No certificates found." />
                {rows.map((c, n) => (
                  <TableRow key={c.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                    <TableCell>{(paging.page - 1) * paging.size + n + 1}</TableCell>
                    <TableCell>
                      <EntityLink href={`/orders/${c.orderId}`}>{c.orderNumber}</EntityLink>
                    </TableCell>
                    <TableCell>{c.saleNumber}</TableCell>
                    <TableCell>{c.customerName}</TableCell>
                    <TableCell>{c.rmName ?? '—'}</TableCell>
                    <TableCell>{fDate(c.dispatchDate)}</TableCell>
                    <TableCell>
                      <YesNo value={c.sentSeparately} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      {c.sentSeparately && can('certificates', 'edit') ? (
                        <TextField
                          select
                          size="small"
                          value={c.dispatched ? 'yes' : 'no'}
                          onChange={(e) => change(c.id, e.target.value === 'yes')}
                          SelectProps={{ native: true }}
                          inputProps={{ 'aria-label': `Certificate dispatched for ${c.orderNumber}` }}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </TextField>
                      ) : (
                        <YesNo value={c.dispatched} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Pager paging={paging} total={data?.count ?? 0} noun="certificates" />
        </ListCard>
      </HighlightFrame>
    </Box>
  );
}
