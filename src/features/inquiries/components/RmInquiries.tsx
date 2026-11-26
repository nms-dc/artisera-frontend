'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { isPast, isToday, parseISO } from 'date-fns';
import {
  PageHeader,
  HighlightFrame,
  SortHead,
  useSort,
  TabsUnderline,
  SearchBox,
  FilterSelect,
  Pill,
  Pager,
  usePaging,
  useDebounced,
  useHighlight,
  highlightSx,
  QueryState,
  tableWrap,
  usePageReset,
} from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { fDate, fTime, fNum } from '@/lib/formatters';
import { PRIORITIES, SOURCES } from '@/lib/constants';
import { useGetInquiriesQuery, useGetInquiryCountsQuery } from '../api';
import { CustomerCell } from './shared';
import { InteractionPanel, SnoozeDialog, StatusDialog, TouchbasePanel, BulkActionDialog } from './panels';
import type { Inquiry, InquiryStatus, Method, MoveTo, Priority, RmTab, Source, InquiryListParams } from '@/lib/types';

type Tab = Exclude<RmTab, 'today'>;
const TABS: { value: Tab; label: string }[] = [
  { value: 'touchbase', label: 'Touchbase' },
  { value: 'followup', label: 'Touchbase Follow-up' },
  { value: 'active', label: 'Active Conversations' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'nurture', label: 'Nurture' },
];
const DATES = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
];
const opt = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
const isDue = (i: Inquiry) => !!i.nextFollowUp && (isToday(parseISO(i.nextFollowUp)) || isPast(parseISO(i.nextFollowUp)));

const MENU_MOVES: Partial<Record<InquiryStatus, MoveTo[]>> = {
  'Touchbase Follow-up': ['Active Conversations', 'Nurture'],
  'Active Conversations': ['Nurture', 'Lost'],
  Nurture: ['Active Conversations'],
};
const MENU_LABEL: Record<MoveTo, string> = { 'Active Conversations': 'Move to Active Conversations', Nurture: 'Move to Nurture', Lost: 'Mark as Closed' };

const SORTABLE: Record<string, string> = { 'Next Follow-up': 'nextFollowUp', 'Value (₹)': 'value', Priority: 'priority', Source: 'source', 'Created On': 'createdAt' };

export default function RmInquiries({ rmId, readOnly }: { rmId?: string; readOnly?: boolean } = {}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = React.useState<Tab>((sp.get('tab') as Tab) || 'touchbase');
  const [q, setQ] = React.useState(sp.get('q') ?? '');
  const [dates, setDates] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [source, setSource] = React.useState('');
  const [openId, setOpenId] = React.useState<string | null>(sp.get('open'));
  const [method, setMethod] = React.useState<Method | undefined>((sp.get('method') as Method) || undefined);
  const [snoozeFor, setSnoozeFor] = React.useState<Inquiry | null>(null);
  const [statusFor, setStatusFor] = React.useState<{ inq: Inquiry; status: MoveTo } | null>(null);
  const [menu, setMenu] = React.useState<{ el: HTMLElement; inq: Inquiry } | null>(null);
  const [reassignFor, setReassignFor] = React.useState<Inquiry | null>(null);
  const paging = usePaging(10);
  const dq = useDebounced(q);

  const { ordering, toggle } = useSort();
  usePageReset(paging.setPage, JSON.stringify([tab, dq, dates, priority, source, ordering]));
  React.useEffect(() => {
    const t = sp.get('tab');
    if (t && TABS.some((x) => x.value === t)) setTab(t as Tab);
    const o = sp.get('open');
    if (o && !readOnly) setOpenId(o);
    setMethod((sp.get('method') as Method) || undefined);
  }, [sp, readOnly]);

  const { data, isFetching, error } = useGetInquiriesQuery({
    tab,
    q: dq,
    dateRange: dates as InquiryListParams['dateRange'],
    priority: priority as Priority,
    source: source as Source,
    ordering: ordering || undefined,
    page: paging.page,
    pageSize: paging.size,
    rmId,
  });
  const { data: counts } = useGetInquiryCountsQuery(rmId ? { rmId } : undefined);
  const hl = useHighlight(!isFetching && !!data);
  const rows = data?.results ?? [];
  const scheduled = tab === 'followup' || tab === 'active';
  const heads = [
    'Inquiry ID',
    'Customer',
    'Requirement',
    'Value (₹)',
    'Source',
    'Priority',
    ...(scheduled || tab === 'nurture' ? ['Next Follow-up'] : []),
    ...(tab === 'won' ? ['Sale Number', 'Closed On'] : tab === 'lost' ? ['Closed On'] : tab === 'nurture' ? ['Current Owner', 'Last Activity'] : ['Last Activity']),
    'Actions',
  ];
  const canWork = !readOnly && (tab === 'touchbase' || scheduled);

  return (
    <Box>
      <PageHeader
        title={readOnly ? 'Inquiries' : 'My Inquiries'}
        subtitle={readOnly ? "This Relationship Manager's inquiries (read-only)." : 'Manage your inquiries and record touchbases.'}
      />
      <TabsUnderline
        value={tab}
        onChange={(v) => {
          setTab(v as Tab);
          setOpenId(null);
        }}
        tabs={TABS.map((t) => ({ value: t.value, label: `${t.label} (${counts?.[t.value] ?? '…'})` }))}
      />

      {tab === 'nurture' && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#FFF7E0', border: '1px solid #F5E3A8' }}>
          <Iconify icon="mdi:sprout" width={40} sx={{ color: '#B7791F' }} />
          <Box>
            <Typography variant="h6">Nurture</Typography>
            <Typography variant="body2">
              These are inquiries with future potential that are not being actively pursued at present. You can reassign an inquiry to another RM or move it back to Active
              Conversations when appropriate.
            </Typography>
          </Box>
        </Stack>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }} alignItems="center">
        <Box sx={{ flex: '1 1 260px', maxWidth: 380 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search by Inquiry ID, customer name, phone or email..." />
        </Box>
        <FilterSelect value={dates} onChange={setDates} all="All Dates" options={DATES} />
        <FilterSelect value={priority} onChange={setPriority} all="All Priorities" options={opt(PRIORITIES)} width={150} />
        <FilterSelect value={source} onChange={setSource} all="All Sources" options={opt(SOURCES)} width={150} />
        <Button
          onClick={() => {
            setQ('');
            setDates('');
            setPriority('');
            setSource('');
          }}
          sx={{ fontWeight: 600 }}
        >
          Clear Filters
        </Button>
      </Stack>

      <HighlightFrame match="list" scroll={false}>
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" />
                </TableCell>
                {heads.map((h) =>
                  SORTABLE[h] ? (
                    <SortHead key={h} field={SORTABLE[h]} ordering={ordering} onSort={toggle}>
                      {h}
                    </SortHead>
                  ) : (
                    <TableCell key={h}>{h}</TableCell>
                  ),
                )}
                <TableCell padding="none" />
              </TableRow>
            </TableHead>
            <TableBody>
              <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={heads.length + 2} emptyText="Nothing here." />
              {rows.map((i) => {
                const open = openId === i.id && canWork;
                const due = isDue(i);
                return (
                  <React.Fragment key={i.id}>
                    <TableRow hover selected={open} data-row={i.id} sx={{ '&.Mui-selected': { bgcolor: '#EAF2FF' }, opacity: isFetching ? 0.6 : 1, ...highlightSx(hl === i.id) }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={open} onChange={() => canWork && setOpenId(open ? null : i.id)} />
                      </TableCell>
                      <TableCell>
                        <NextLink href={`/inquiries/${i.id}`} style={{ color: tokens.blue, textDecoration: 'none' }}>
                          {i.code}
                        </NextLink>
                      </TableCell>
                      <TableCell>
                        <CustomerCell c={i.customer} repeat={i.repeatProspect} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>{i.requirement}</TableCell>
                      <TableCell>{fNum(i.value)}</TableCell>
                      <TableCell>
                        <Pill label={i.source} />
                      </TableCell>
                      <TableCell>
                        <Pill label={i.priority} />
                      </TableCell>
                      {(scheduled || tab === 'nurture') && (
                        <TableCell sx={{ color: due ? '#D32F2F' : tokens.text, fontWeight: due ? 600 : 400 }}>
                          {fDate(i.nextFollowUp)}
                          <br />
                          {fTime(i.nextFollowUp)}
                        </TableCell>
                      )}
                      {tab === 'won' && <TableCell>{i.sale?.saleNumber ?? '—'}</TableCell>}
                      {(tab === 'won' || tab === 'lost') && <TableCell>{fDate(i.closedAt)}</TableCell>}
                      {tab === 'nurture' && <TableCell>{i.rm?.name ?? '—'}</TableCell>}
                      {tab !== 'won' && tab !== 'lost' && <TableCell>{fDate(i.lastContact ?? i.updatedAt)}</TableCell>}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {tab === 'touchbase' && !readOnly && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Iconify icon="mdi:message-text-outline" width={16} />}
                            onClick={() => {
                              setMethod(undefined);
                              setOpenId(open ? null : i.id);
                            }}
                          >
                            Record Touchbase
                          </Button>
                        )}
                        {scheduled && !readOnly && (
                          <Button size="small" startIcon={<Iconify icon="mdi:clock-outline" width={18} />} onClick={() => setSnoozeFor(i)}>
                            Snooze
                          </Button>
                        )}
                        {(tab === 'won' || tab === 'lost' || readOnly) && (
                          <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:eye-outline" width={16} />} onClick={() => router.push(`/inquiries/${i.id}`)}>
                            View
                          </Button>
                        )}
                        {!readOnly && tab !== 'won' && tab !== 'lost' && (
                          <IconButton aria-label="Inquiry actions" size="small" onClick={(e) => setMenu({ el: e.currentTarget, inq: i })}>
                            <Iconify icon="mdi:dots-vertical" width={18} />
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell padding="none">
                        {canWork && (
                          <IconButton aria-label="Show or hide the interaction panel" size="small" onClick={() => setOpenId(open ? null : i.id)} sx={{ color: tokens.blue }}>
                            <Iconify icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow>
                        <TableCell colSpan={heads.length + 2} sx={{ p: 0 }}>
                          {tab === 'touchbase' ? (
                            <TouchbasePanel inq={i} defaultMethod={method} onClose={() => setOpenId(null)} />
                          ) : (
                            <InteractionPanel inq={i} defaultMethod={method} onClose={() => setOpenId(null)} onSnooze={() => setSnoozeFor(i)} />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </HighlightFrame>
      <Pager paging={paging} total={data?.count ?? 0} noun={`inquiries (${TABS.find((t) => t.value === tab)?.label})`} />

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
        {menu?.inq.status === 'Active Conversations' && (
          <MenuItem
            onClick={() => {
              const i = menu!.inq;
              setMenu(null);
              router.push(`/inquiries/${i.id}/won`);
            }}
          >
            Mark as Won
          </MenuItem>
        )}
        {menu && !readOnly && menu.inq.status === 'Nurture' && (
          <MenuItem
            onClick={() => {
              const i = menu.inq;
              setMenu(null);
              setReassignFor(i);
            }}
          >
            Reassign RM
          </MenuItem>
        )}
        {menu &&
          !readOnly &&
          MENU_MOVES[menu.inq.status]?.map((target) => (
            <MenuItem
              key={target}
              onClick={() => {
                const i = menu.inq;
                setMenu(null);
                setStatusFor({ inq: i, status: target });
              }}
            >
              {MENU_LABEL[target]}
            </MenuItem>
          ))}
      </Menu>
      <BulkActionDialog mode={reassignFor ? 'reassign' : null} ids={reassignFor ? [reassignFor.id] : []} onClose={() => setReassignFor(null)} onDone={() => setReassignFor(null)} />
      <SnoozeDialog inq={snoozeFor} onClose={() => setSnoozeFor(null)} />
      <StatusDialog inq={statusFor?.inq ?? null} status={statusFor?.status ?? null} onClose={() => setStatusFor(null)} />
    </Box>
  );
}
