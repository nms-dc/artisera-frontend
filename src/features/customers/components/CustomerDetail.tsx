'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import { PageHeader, Panel, Pill, TabsUnderline, tableWrap, HighlightFrame } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { fDate, fINR, fNum, initials } from '@/lib/formatters';
import { useAuth } from '@/core/auth/useAuth';
import { useGetCustomerActivitiesQuery, useGetCustomerQuery, useGetCustomerSalesQuery } from '../api';
import { useGetInquiriesQuery } from '@/features/inquiries/api';
import { Timeline } from '@/features/inquiries/components/InquiryView';
import { errorMessage } from '@/core/api/errors';

const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack direction="row" sx={{ py: 0.6 }}>
    <Typography variant="body2" sx={{ width: 130 }}>
      {label}
    </Typography>
    <Box sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>{children}</Box>
  </Stack>
);

export default function CustomerDetail({ id }: { id: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: c, error } = useGetCustomerQuery(id);
  const { data: inqPage } = useGetInquiriesQuery({ customerId: id, pageSize: 50 });
  const { data: acts = [] } = useGetCustomerActivitiesQuery(id);
  const { data: sales = [], isFetching: salesLoading } = useGetCustomerSalesQuery(id);
  const [tab, setTab] = React.useState('overview');
  if (error) return <Typography color="error">{errorMessage(error)}</Typography>;
  if (!c) return <CircularProgress />;

  const mine = inqPage?.results ?? [];
  const interactions = acts.filter((a) => a.kind === 'Touchbase');
  const followups = acts.filter((a) => ['Follow-up', 'Snooze'].includes(a.kind));
  const orig = c.originalInquiry;

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Customers', href: '/customers' }, { label: c.code }]}
        title={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <span>Customer Details</span>
            <Pill label={c.status} />
          </Stack>
        }
        actions={
          can('customers', 'edit') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:pencil" width={18} />} onClick={() => router.push(`/customers/${id}/edit`)}>
              Edit Customer
            </Button>
          ) : undefined
        }
      />
      <Panel sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
          <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: '#FFD6E8', color: '#C2185B', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 700 }}>
            {initials(c.name)}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h5">{c.name}</Typography>
              <Box sx={{ px: 1.25, py: 0.3, bgcolor: '#E5E9F2', borderRadius: 1, fontSize: 12, fontWeight: 600 }}>{c.source}</Box>
            </Stack>
            <Box sx={{ my: 0.75 }}>
              <Pill label={c.customerType} />
            </Box>
            <Typography variant="body2">✆ {c.phone}</Typography>
            <Typography variant="body2">✉ {c.email ?? '—'}</Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Box sx={{ p: 2, minWidth: 160, bgcolor: '#EAF2FF', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: tokens.ink }}>
                Total Inquiries
              </Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: tokens.ink }}>{c.totalInquiries}</Typography>
              <Typography variant="caption">
                Open: <b style={{ color: '#D32F2F' }}>{c.openInquiries}</b> &nbsp; Won: <b style={{ color: '#1E8E3E' }}>{c.wonInquiries}</b>
              </Typography>
            </Box>
            <Box sx={{ p: 2, minWidth: 180, bgcolor: '#EAF2FF', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: tokens.ink }}>
                Total Value
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: tokens.ink }}>{fINR(c.totalValue)}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Panel>

      <TabsUnderline
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'inquiries', label: `Inquiries (${c.totalInquiries})` },
          { value: 'interactions', label: `Interactions (${interactions.length})` },
          { value: 'followups', label: `Follow-ups (${followups.length})` },
          { value: 'sales', label: `Previous Sales Records (${sales.length})` },
          { value: 'invoices', label: 'Invoices' },
        ]}
      />

      {tab === 'overview' && (
        <HighlightFrame match="customer">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel title="Customer Information" sx={{ height: '100%' }}>
                <Info label="Customer ID">{c.code}</Info>
                <Info label="Customer Type">
                  <Pill label={c.customerType} />
                </Info>
                <Info label="Status">
                  <Pill label={c.status} />
                </Info>
                <Info label="Customer Since">{c.customerSince ? fDate(c.customerSince) : '—'}</Info>
                <Info label="Source">{c.source}</Info>
                <Info label="Original Inquiry">
                  {orig ? (
                    <NextLink href={`/inquiries/${orig.id}`} style={{ color: tokens.blue }}>
                      {orig.code}
                    </NextLink>
                  ) : (
                    '—'
                  )}
                </Info>
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel title="Address">
                <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                  {c.address1 ?? '—'}
                  <br />
                  {c.address2}
                  {c.address2 && <br />}
                  {[c.location, c.state, c.pin].filter(Boolean).join(', ')}
                  <br />
                  {c.country}
                </Typography>
              </Panel>
              <Panel title="Notes (Internal)">
                <Typography variant="body2">{c.notes ?? 'No notes.'}</Typography>
              </Panel>
            </Grid>
          </Grid>
        </HighlightFrame>
      )}
      {tab === 'inquiries' && (
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Inquiry ID', 'Requirement', 'Value (₹)', 'Priority', 'Status', 'Created'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {mine.map((i) => (
                <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/inquiries/${i.id}`)}>
                  <TableCell sx={{ color: tokens.blue }}>{i.code}</TableCell>
                  <TableCell>{i.requirement}</TableCell>
                  <TableCell>{fNum(i.value)}</TableCell>
                  <TableCell>
                    <Pill label={i.priority} />
                  </TableCell>
                  <TableCell>
                    <Pill label={i.status} />
                  </TableCell>
                  <TableCell>{fDate(i.createdAt)}</TableCell>
                </TableRow>
              ))}
              {mine.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.muted }}>
                    No inquiries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}
      {tab === 'interactions' && (
        <Panel>
          <Timeline items={interactions} />
        </Panel>
      )}
      {tab === 'followups' && (
        <Panel>
          <Timeline items={followups} />
        </Panel>
      )}
      {tab === 'sales' && (
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Sale Number', 'Inquiry ID', 'Sale Date', 'Sale Value (₹)', 'Payment', 'Products', 'Orders'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: tokens.ink }}>{s.saleNumber}</TableCell>
                  <TableCell>
                    <NextLink href={`/inquiries/${s.inquiry.id}`} style={{ color: tokens.blue }}>
                      {s.inquiry.code}
                    </NextLink>
                  </TableCell>
                  <TableCell>{fDate(s.saleDate)}</TableCell>
                  <TableCell>{fNum(s.totalValue)}</TableCell>
                  <TableCell>
                    <Pill label={s.paymentStatus} />
                  </TableCell>
                  <TableCell>{s.totalProducts}</TableCell>
                  <TableCell>{s.totalOrders}</TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {salesLoading ? 'Loading…' : 'No previous sales for this customer.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}
      {tab === 'invoices' && (
        <Panel>
          <Stack alignItems="center" spacing={1} sx={{ py: 4, textAlign: 'center' }}>
            <Iconify icon="mdi:file-document-outline" width={40} sx={{ color: tokens.muted }} />
            <Typography variant="subtitle1">Invoices are planned for Phase 2</Typography>
            <Typography variant="body2" sx={{ maxWidth: 420 }}>
              Invoice records for this customer will be filled in automatically once invoicing is connected.
            </Typography>
          </Stack>
        </Panel>
      )}
    </Box>
  );
}
