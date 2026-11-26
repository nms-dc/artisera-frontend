'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { PageHeader, Pill } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { errorMessage } from '@/core/api/errors';
import { tokens } from '@/core/theme/palette';
import { fDate, fNum } from '@/lib/formatters';
import { useGetGalleryDashboardQuery } from '../api';
import { CertificateTag, EntityLink } from './shared';
import type { OrderStatus } from '@/lib/types';
import DateField from '@/core/ui/DateField';

type CardSpec = { label: string; sub?: string; value: number; icon: string; color: string; bg: string; href: string };

function StatCard({ spec, onOpen }: { spec: CardSpec; onOpen: (href: string) => void }) {
  // The whole card is the link (same as the RM and Admin dashboards). A `_` timestamp makes the list flash on every click.
  const go = () => onOpen(`${spec.href}${spec.href.includes('?') ? '&' : '?'}highlight=list&_=${Date.now()}`);
  return (
    <Box
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go()}
      sx={{
        p: 1.75,
        borderRadius: 2,
        bgcolor: spec.bg,
        height: '100%',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(16,40,90,.12)' },
        '&:focus-visible': { outline: `2px solid ${tokens.blue}` },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Iconify icon={spec.icon} width={34} sx={{ color: spec.color }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.ink, lineHeight: 1.2 }}>
            {spec.label}
          </Typography>
          {spec.sub && <Typography variant="caption">{spec.sub}</Typography>}
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: tokens.ink, lineHeight: 1.2 }}>{spec.value}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

const ordersHref = (status: OrderStatus) => `/orders?status=${encodeURIComponent(status)}`;

export default function GalleryDashboard() {
  const router = useRouter();
  const [range, setRange] = React.useState({ from: '', to: '' });
  const { data, error } = useGetGalleryDashboardQuery({ from: range.from || undefined, to: range.to || undefined });

  if (error) return <Alert severity="error">Could not load the dashboard: {errorMessage(error)}</Alert>;
  const c = data?.cards;
  const cards: CardSpec[] = [
    { label: 'Preparation', value: c?.preparation ?? 0, icon: 'mdi:clock-outline', color: '#F59E0B', bg: '#FFF6E0', href: ordersHref('Preparation') },
    { label: 'Packing', value: c?.packingDispatch ?? 0, icon: 'mdi:package-variant', color: '#7C4DFF', bg: '#F0E8FF', href: ordersHref('Packing') },
    { label: 'Dispatched', value: c?.shipped ?? 0, icon: 'mdi:truck-outline', color: '#1665F5', bg: '#E8F1FF', href: ordersHref('Dispatched') },
    { label: 'Delivered', value: c?.delivered ?? 0, icon: 'mdi:check-circle', color: '#1E8E3E', bg: '#E4F7EA', href: ordersHref('Delivered') },
    {
      label: 'Certificates',
      sub: '(To be sent separately)',
      value: c?.certificatesPending ?? 0,
      icon: 'mdi:file-certificate-outline',
      color: '#D32F2F',
      bg: '#FFE9EC',
      href: '/certificates',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Gallery Manager Dashboard"
        subtitle="Manage packing, shipping and certificate dispatch."
        actions={
          <Stack direction="row" spacing={0.75} alignItems="center">
            <DateField value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} sx={{ width: 150 }} inputProps={{ 'aria-label': 'From date' }} />
            <span>–</span>
            <DateField value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} sx={{ width: 150 }} inputProps={{ 'aria-label': 'To date' }} />
          </Stack>
        }
      />
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {cards.map((spec) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={spec.label}>
            <StatCard spec={spec} onOpen={router.push} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2, mb: 2.5, overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Orders Requiring Your Attention ({data?.attentionOrders.count ?? 0})
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['#', 'Order Number', 'Sale Number', 'Customer', 'Order Date', 'Value (₹)', 'Current Status', 'Certificate'].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.attentionOrders.results ?? []).map((o, n) => (
              <TableRow key={o.id}>
                <TableCell>{n + 1}</TableCell>
                <TableCell>
                  <EntityLink href={`/orders/${o.id}`}>{o.orderNumber}</EntityLink>
                </TableCell>
                <TableCell>{o.saleNumber}</TableCell>
                <TableCell>{o.customer.name}</TableCell>
                <TableCell>{fDate(o.orderDate)}</TableCell>
                <TableCell>{fNum(o.orderValue)}</TableCell>
                <TableCell>
                  <Pill label={o.status} />
                </TableCell>
                <TableCell>
                  <CertificateTag separately={o.certificateSeparately} />
                </TableCell>
              </TableRow>
            ))}
            {data && data.attentionOrders.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: tokens.muted }}>
                  No orders need attention.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2, overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Sales (Won) Requiring Your Attention ({data?.attentionSales.count ?? 0})
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['#', 'Sale Number', 'Customer', 'Sale Date', 'Value (₹)', 'RM Email', 'Pending With'].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.attentionSales.results ?? []).map((s, n) => (
              <TableRow key={s.id}>
                <TableCell>{n + 1}</TableCell>
                <TableCell>
                  <EntityLink href={`/sales/${s.id}`}>{s.saleNumber}</EntityLink>
                </TableCell>
                <TableCell>{s.customerName}</TableCell>
                <TableCell>{fDate(s.saleDate)}</TableCell>
                <TableCell>{fNum(s.totalValue)}</TableCell>
                <TableCell>
                  <Pill label={s.emailConfirmed ? 'Received' : 'Pending'} />
                </TableCell>
                <TableCell>
                  <Pill label={s.pendingWith} />
                </TableCell>
              </TableRow>
            ))}
            {data && data.attentionSales.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: tokens.muted }}>
                  No sales need attention.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
