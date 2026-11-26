'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { PageHeader, Panel, Pill, RepeatTag, TabsUnderline, HighlightFrame } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from 'notistack';
import { handleSubmitError } from '@/core/ui/forms';
import { useMarkSaleEmailSentMutation } from '@/features/gallery/api';
import { fDate, fDateTime, fNum, fTime } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { useGetActivitiesQuery, useGetInquiryQuery } from '../api';
import type { Activity } from '@/lib/types';
import { ActivityDetails } from './shared';
import { errorMessage } from '@/core/api/errors';

const ICON: Record<string, { icon: string; bg: string }> = {
  Call: { icon: 'mdi:phone', bg: '#1FB589' },
  Email: { icon: 'mdi:email', bg: '#1665F5' },
  WhatsApp: { icon: 'mdi:whatsapp', bg: '#1E8E3E' },
  Created: { icon: 'mdi:file-document-outline', bg: '#0B2545' },
  Assigned: { icon: 'mdi:account-check', bg: '#7C4DFF' },
  Reassigned: { icon: 'mdi:account-switch', bg: '#F59E0B' },
  Snooze: { icon: 'mdi:clock-outline', bg: '#F59E0B' },
  Status: { icon: 'mdi:flag-outline', bg: '#5B6B8C' },
  Edited: { icon: 'mdi:pencil', bg: '#5B6B8C' },
};

function title(a: Activity) {
  const withMethod = (label: string) => (a.method ? `${label} (${a.method})` : label);
  switch (a.kind) {
    case 'Touchbase':
      return withMethod('Touchbase');
    case 'Follow-up':
      return withMethod('Touchbase Follow-up');
    case 'Conversation':
      return withMethod('Conversation');
    case 'Created':
      return 'Inquiry Created';
    case 'Assigned':
      return 'RM Assigned';
    case 'Reassigned':
      return 'RM Reassigned';
    case 'Snooze':
      return 'Follow-up Snoozed';
    case 'Status':
      return 'Status Updated';
    default:
      return 'Inquiry Edited';
  }
}

export function Timeline({ items }: { items: Activity[] }) {
  if (!items.length)
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
        No history yet.
      </Typography>
    );
  const groups: Record<string, Activity[]> = {};
  items.forEach((a) => {
    const k = format(parseISO(a.at), 'dd-MMM-yyyy');
    (groups[k] ||= []).push(a);
  });
  return (
    <Box>
      {Object.entries(groups).map(([day, list]) => (
        <Box key={day} sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, color: tokens.ink, mb: 1 }}>{day}</Typography>
          <Stack spacing={1.25} sx={{ borderLeft: `2px solid ${tokens.border}`, ml: 0.75, pl: 2.5 }}>
            {list.map((a) => {
              const st = ICON[a.method ?? a.kind] ?? ICON.Status;
              return (
                <Stack key={a.id} direction="row" spacing={1.5} sx={{ bgcolor: '#F3F8FF', borderRadius: 2, p: 1.5, border: `1px solid ${tokens.border}` }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: st.bg, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Iconify icon={st.icon} width={20} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, color: tokens.ink, fontSize: 13 }}>{title(a)}</Typography>
                      <Typography variant="caption">{fTime(a.at)}</Typography>
                      <Box sx={{ px: 1, py: 0.2, bgcolor: '#E2EBFA', borderRadius: 0.75, fontSize: 11, fontWeight: 600, color: tokens.ink }}>By {a.by?.name ?? '—'}</Box>
                    </Stack>
                    <ActivityDetails activity={a} />
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack direction="row" spacing={2} sx={{ py: 0.6 }}>
    <Typography variant="body2" sx={{ width: 110, flexShrink: 0 }}>
      {label}
    </Typography>
    <Box sx={{ fontSize: 13, color: tokens.ink, fontWeight: 600 }}>{children}</Box>
  </Stack>
);

export default function InquiryView({ id }: { id: string }) {
  const router = useRouter();
  const highlightSale = useSearchParams().get('highlight') === 'sale';
  const { can, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [markEmailSent, { isLoading: markingSent }] = useMarkSaleEmailSentMutation();
  const { data: inq, isLoading, error } = useGetInquiryQuery(id);
  const { data: acts = [] } = useGetActivitiesQuery(id);
  const [tab, setTab] = React.useState('interaction');

  React.useEffect(() => {
    if (highlightSale && inq?.sale) document.getElementById('sale-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightSale, inq?.sale]);

  if (isLoading) return <CircularProgress />;
  if (error || !inq) return <Typography color="error">{errorMessage(error) ?? 'Inquiry not found.'}</Typography>;
  const c = inq.customer;
  const interaction = acts.filter((a) => ['Touchbase', 'Follow-up', 'Conversation', 'Created'].includes(a.kind));
  const followups = acts.filter((a) => ['Follow-up', 'Snooze'].includes(a.kind));
  const shown = tab === 'interaction' ? interaction : tab === 'followup' ? followups : acts;

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Inquiries', href: '/inquiries' }, { label: inq.code }]}
        title="Inquiry Details & Full History"
        actions={
          can('inquiries', 'edit') ? (
            <Button variant="outlined" startIcon={<Iconify icon="mdi:pencil" width={18} />} onClick={() => router.push(`/inquiries/${id}/edit`)}>
              Edit Inquiry
            </Button>
          ) : undefined
        }
      />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="h5">{inq.code}</Typography>
        <Pill label={inq.status} />
        {inq.sale && <Pill label={`Sale ${inq.sale.saleNumber}`} />}
        {inq.repeatProspect && <RepeatTag />}
      </Stack>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Created on {fDateTime(inq.createdAt)} &nbsp;|&nbsp; Last Updated on {fDateTime(inq.updatedAt)}
      </Typography>

      <HighlightFrame match="inquiry">
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Panel
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="mdi:account-outline" width={22} sx={{ color: tokens.blue }} />
                  <span>Customer Information</span>
                </Stack>
              }
              sx={{ height: '100%' }}
            >
              <Row label="Name">{c.name}</Row>
              <Row label="Phone">{c.phone}</Row>
              <Row label="Email">{c.email ?? '—'}</Row>
              <Row label="Location">{[c.location, c.state].filter(Boolean).join(', ') || '—'}</Row>
              {[c.address1, c.address2, c.pin, c.country].some(Boolean) && <Row label="Address">{[c.address1, c.address2, c.pin, c.country].filter(Boolean).join(', ')}</Row>}
            </Panel>
          </Grid>
          <Grid item xs={12} md={7}>
            <Panel
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="mdi:file-document-outline" width={22} sx={{ color: tokens.blue }} />
                  <span>Inquiry Information</span>
                </Stack>
              }
              sx={{ height: '100%' }}
            >
              <Grid container columnSpacing={3}>
                <Grid item xs={12} sm={6}>
                  <Row label="Requirement">{inq.requirement}</Row>
                  <Row label="Value (₹)">{fNum(inq.value)}</Row>
                  <Row label="Source">
                    <Pill label={inq.source} />
                  </Row>
                  <Row label="Next Follow-up">{fDate(inq.nextFollowUp)}</Row>
                  <Row label="Notes">
                    <Box component="span" sx={{ fontWeight: 400, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {inq.notes?.trim() || '—'}
                    </Box>
                  </Row>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Row label="Category">{inq.category?.name ?? 'Not specified'}</Row>
                  <Row label="Subcategory">{inq.subcategory?.name ?? 'Not specified'}</Row>
                  <Row label="Artist">{inq.artist?.name ?? 'Not specified'}</Row>
                  <Row label="Assigned RM">{inq.rm ? inq.rm.name : <span style={{ color: '#D32F2F' }}>Unassigned</span>}</Row>
                  <Row label="Priority">
                    <Pill label={inq.priority} />
                  </Row>
                  <Row label="Current Status">
                    <Pill label={inq.status} />
                  </Row>
                </Grid>
              </Grid>
            </Panel>
          </Grid>
        </Grid>
      </HighlightFrame>

      {inq.sale && (
        <Box id="sale-panel">
          <Panel
            title={
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="mdi:trophy-outline" width={22} sx={{ color: '#1E8E3E' }} />
                <span>Sale & Fulfilment</span>
              </Stack>
            }
            action={
              can('sales', 'view') ? (
                <Button size="small" variant="outlined" onClick={() => router.push(`/sales/${inq.sale!.id}`)}>
                  Open Sale
                </Button>
              ) : undefined
            }
            sx={{ mb: 2, ...(highlightSale && { border: `2px solid ${tokens.blue}`, boxShadow: '0 0 0 4px rgba(22,101,245,.15)' }) }}
          >
            <Grid container columnSpacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Row label="Sale Number">{inq.sale.saleNumber}</Row>
                <Row label="Sale Date">{fDate(inq.sale.saleDate)}</Row>
                <Row label="Sale Value (₹)">{fNum(inq.sale.totalValue)}</Row>
                <Row label="Payment">
                  <Pill label={inq.sale.paymentStatus} />
                </Row>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Row label="Products">{inq.sale.totalProducts}</Row>
                <Row label="Products Remaining">{inq.sale.productsRemaining}</Row>
                <Row label="Orders">{inq.sale.totalOrders}</Row>
                <Row label="Email to Gallery Manager">
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Pill label={inq.sale.emailStatus === 'Pending' ? 'Not sent' : inq.sale.emailStatus === 'Sent' ? 'Sent' : 'Received'} />
                    {inq.sale.emailStatus === 'Pending' && (user?.id === inq.rm?.id || user?.role === 'ADMIN') && (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={markingSent}
                        onClick={async () => {
                          try {
                            await markEmailSent(inq.sale!.id).unwrap();
                            enqueueSnackbar('Marked as sent. The Gallery Manager has been notified.', { variant: 'success' });
                          } catch (e) {
                            enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
                          }
                        }}
                      >
                        Mark email as sent
                      </Button>
                    )}
                  </Stack>
                </Row>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                {inq.sale.orders.length === 0 && <Row label="Order Status">No order yet</Row>}
                {inq.sale.orders.map((o) => (
                  <Row key={o.id} label={o.orderNumber}>
                    <Pill label={o.status} />
                  </Row>
                ))}
              </Grid>
            </Grid>
          </Panel>
        </Box>
      )}

      <Panel>
        <TabsUnderline
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'interaction', label: `Interaction History (${interaction.length})` },
            { value: 'followup', label: `Follow-up History (${followups.length})` },
            { value: 'all', label: `All History (${acts.length})` },
          ]}
        />
        <Timeline items={shown} />
      </Panel>
    </Box>
  );
}
