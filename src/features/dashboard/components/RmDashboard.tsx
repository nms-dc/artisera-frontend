'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { PageHeader, KpiCard, Pill, FilterSelect, Pager, usePaging, QueryState, SortHead, useSort, usePageReset } from '@/core/ui/common';
import { PRIORITIES, SOURCES } from '@/lib/constants';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { fDateTime, fINR, fNum } from '@/lib/formatters';
import { useAuth } from '@/core/auth/useAuth';
import { useGetRmDashboardQuery } from '../api';
import { useGetInquiriesQuery } from '@/features/inquiries/api';
import { useRms } from '@/features/users/api';
import { RANGES } from './AdminDashboard';
import type { DashboardRange, Inquiry, InquiryListParams, Priority, Source } from '@/lib/types';
import { errorMessage } from '@/core/api/errors';

const sub = (text: string, color: string) => <span style={{ color, fontWeight: 600 }}>{text}</span>;
const SORTABLE: Record<string, string> = { Source: 'source', 'Value (₹)': 'value', Priority: 'priority' };
const HEADS = ['Inquiry ID', 'Customer', 'Requirement', 'Source', 'Value (₹)', 'Status', 'Priority', 'Next Action', 'Last Contact', ''];
const tabOf = (s: string) => (s === 'Touchbase' ? 'touchbase' : s === 'Touchbase Follow-up' ? 'followup' : s === 'Nurture' ? 'nurture' : 'active');

export default function RmDashboard({ rmId, readOnly }: { rmId?: string; readOnly?: boolean } = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const rms = useRms();
  const viewing = rmId ? rms.find((r) => r.id === rmId) : undefined;
  const base = rmId ? `/rm/${rmId}/inquiries` : '/inquiries';
  const [range, setRange] = React.useState<DashboardRange>('30');
  const paging = usePaging(10);
  const { ordering, toggle } = useSort();
  usePageReset(paging.setPage, ordering);
  const [menu, setMenu] = React.useState<{ el: HTMLElement; inq: Inquiry } | null>(null);

  const { data, error } = useGetRmDashboardQuery({ range, rmId });
  const [source, setSource] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [valueBand, setValueBand] = React.useState('');
  const filtered = Boolean(source || priority || valueBand);
  const {
    data: tasks,
    isFetching,
    error: tasksError,
  } = useGetInquiriesQuery({
    tab: 'today',
    rmId,
    source: (source || undefined) as Source | undefined,
    priority: (priority || undefined) as Priority | undefined,
    valueBand: (valueBand || undefined) as InquiryListParams['valueBand'],
    ordering: ordering || undefined,
    page: paging.page,
    pageSize: paging.size,
  });
  const k = data?.kpis;
  const rows = tasks?.results ?? [];

  if (error) return <Alert severity="error">Could not load the dashboard: {errorMessage(error)}</Alert>;

  return (
    <Box>
      <PageHeader
        title={readOnly ? `${viewing?.name ?? 'RM'}'s Dashboard` : 'My Dashboard'}
        subtitle={readOnly ? 'Read-only view of this Relationship Manager’s workspace.' : `Welcome back, ${user?.name.split(' ')[0]}! Here's your work overview for today.`}
        actions={<FilterSelect value={range} onChange={(v) => setRange((v || '30') as DashboardRange)} options={RANGES} all="Last 30 Days" width={170} />}
      />
      <Box sx={{ display: 'grid', gap: 2, mb: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(auto-fit, minmax(180px, 1fr))' } }}>
        <KpiCard
          href="/inquiries?tab=touchbase&highlight=list"
          label="Touchbase"
          value={k?.touchbase.count ?? 0}
          sub={sub(`${k?.touchbase.overdue ?? 0} overdue`, '#D32F2F')}
          icon="mdi:phone-in-talk-outline"
          tone="blue"
        />
        <KpiCard
          href="/inquiries?tab=followup&highlight=list"
          label="Touchbase Follow-up"
          value={k?.followUp.count ?? 0}
          sub={sub(`${k?.followUp.overdue ?? 0} overdue`, '#D32F2F')}
          icon="mdi:calendar-clock-outline"
          tone="purple"
        />
        <KpiCard
          href="/inquiries?tab=active&highlight=list"
          label="Active Conversations"
          value={k?.active.count ?? 0}
          sub={sub(`${k?.active.dueToday ?? 0} due today`, '#B26A00')}
          icon="mdi:message-text-outline"
          tone="green"
        />
        <KpiCard href="/inquiries?tab=nurture&highlight=list" label="Nurture" value={k?.nurture ?? 0} icon="mdi:sprout-outline" tone="orange" />
        <KpiCard href="/inquiries?tab=won&highlight=list" label="Won" value={k?.won.count ?? 0} sub={`Value: ${fINR(k?.won.value)}`} icon="mdi:trophy-outline" tone="green" />
        <KpiCard label="In Pipeline" value={k?.pipeline.count ?? 0} sub={`Value: ${fINR(k?.pipeline.value)}`} icon="mdi:chart-timeline-variant" tone="purple" />
        <KpiCard
          href="/inquiries?tab=lost&highlight=list"
          label="Lost"
          value={k?.lost.count ?? 0}
          sub={`Value: ${fINR(k?.lost.value)}`}
          icon="mdi:close-circle-outline"
          tone="red"
          valueColor={tokens.ink}
        />
      </Box>

      <Box sx={{ bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.75, bgcolor: '#EEF5FF' }}>
          <Typography variant="h5">My Tasks Today</Typography>
          <Typography variant="body2">Inquiries that need your attention today, in order of scheduled action.</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            <FilterSelect
              value={source}
              onChange={(v) => {
                setSource(v);
                paging.setPage(1);
              }}
              options={SOURCES.map((s) => ({ value: s, label: s }))}
              all="All Sources"
              width={160}
            />
            <FilterSelect
              value={priority}
              onChange={(v) => {
                setPriority(v);
                paging.setPage(1);
              }}
              options={PRIORITIES.map((s) => ({ value: s, label: s }))}
              all="All Priorities"
              width={160}
            />
            <FilterSelect
              value={valueBand}
              onChange={(v) => {
                setValueBand(v);
                paging.setPage(1);
              }}
              options={[
                { value: 'lt1', label: 'Under ₹1,00,000' },
                { value: '1to5', label: '₹1,00,000 – ₹5,00,000' },
                { value: 'gt5', label: 'Above ₹5,00,000' },
              ]}
              all="All Values"
              width={190}
            />
            {filtered && (
              <Button
                size="small"
                onClick={() => {
                  setSource('');
                  setPriority('');
                  setValueBand('');
                  paging.setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </Stack>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              {HEADS.map((h) =>
                SORTABLE[h] ? (
                  <SortHead key={h} field={SORTABLE[h]} ordering={ordering} onSort={toggle} sx={{ bgcolor: '#fff' }}>
                    {h}
                  </SortHead>
                ) : (
                  <TableCell key={h} sx={{ bgcolor: '#fff' }}>
                    {h}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            <QueryState
              loading={isFetching && !tasks}
              error={tasksError}
              empty={!isFetching && rows.length === 0}
              colSpan={10}
              emptyText={filtered ? 'No tasks match these filters' : 'No tasks for today 🎉'}
            />
            {rows.map((i) => (
              <TableRow key={i.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                <TableCell>
                  <NextLink href={`/inquiries/${i.id}`} style={{ color: tokens.blue, fontWeight: 600, textDecoration: 'none' }}>
                    {i.code}
                  </NextLink>
                </TableCell>
                <TableCell>{i.customer.name}</TableCell>
                <TableCell>{i.requirement}</TableCell>
                <TableCell>
                  <Pill label={i.source} />
                </TableCell>
                <TableCell>{i.value ? fNum(i.value) : 'Price on inquiry'}</TableCell>
                <TableCell>
                  <Pill label={i.status} />
                </TableCell>
                <TableCell>
                  <Pill label={i.priority} />
                </TableCell>
                <TableCell>{i.nextAction ?? '—'}</TableCell>
                <TableCell>{fDateTime(i.lastContact)}</TableCell>
                <TableCell>
                  <IconButton aria-label="Inquiry actions" size="small" onClick={(e) => setMenu({ el: e.currentTarget, inq: i })}>
                    <Iconify icon="mdi:dots-vertical" width={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Pager paging={paging} total={tasks?.count ?? 0} noun="inquiries" />

      <Menu anchorEl={menu?.el} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            const i = menu!.inq;
            setMenu(null);
            router.push(`/inquiries/${i.id}`);
          }}
        >
          View Inquiry
        </MenuItem>
        {!readOnly && (
          <MenuItem
            onClick={() => {
              const i = menu!.inq;
              setMenu(null);
              router.push(`${base}?tab=${tabOf(i.status)}&open=${i.id}&highlight=${i.id}`);
            }}
          >
            Record in My Inquiries
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
