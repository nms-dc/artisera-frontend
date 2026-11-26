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
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/core/auth/useAuth';
import {
  PageHeader,
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
  FieldLabel,
  usePageReset,
} from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { fDate, fTime, fNum } from '@/lib/formatters';
import { PRIORITIES, SOURCES, STATUSES, ASSIGN_PRIORITIES } from '@/lib/constants';
import { handleSubmitError } from '@/core/ui/forms';
import { useAssignInquiryMutation, useGetInquiriesQuery, useGetInquiryCountsQuery } from '../api';
import { useGetAdminDashboardQuery } from '@/features/dashboard/api';
import { StatusDialog, BulkActionDialog } from './panels';
import type { BulkMode } from './panels/BulkActionDialog';
import { useRms } from '@/features/users/api';
import { CustomerCell } from './shared';
import { KpiCard, HighlightFrame } from '@/core/ui/common';
import { fLakh } from '@/lib/formatters';
import type { AdminTab, Inquiry, InquiryStatus, MoveTo, Priority, Source, InquiryListParams } from '@/lib/types';

const DATES = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
];
const opt = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

const SORTABLE: Record<string, string> = { 'Value (₹)': 'value', Priority: 'priority', Source: 'source', 'Created On': 'createdAt' };

export default function AdminInquiries() {
  const router = useRouter();
  const { can } = useAuth();
  const canEdit = can('inquiries', 'edit');
  const canAssign = can('inquiries', 'assignRm');
  const sp = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const rms = useRms();

  const [tab, setTab] = React.useState<AdminTab>((sp.get('tab') as AdminTab) || 'all');
  const [q, setQ] = React.useState(sp.get('q') ?? '');
  const [rm, setRm] = React.useState(sp.get('rm') ?? '');
  const [priority, setPriority] = React.useState('');
  const [source, setSource] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [dates, setDates] = React.useState('');
  const paging = usePaging(10);
  const dq = useDebounced(q);

  React.useEffect(() => {
    setQ(sp.get('q') ?? '');
    setRm(sp.get('rm') ?? '');
    const t = sp.get('tab');
    if (t) setTab(t as AdminTab);
    if (t) setStatus(sp.get('status') ?? '');
  }, [sp]);
  const { ordering, toggle } = useSort();
  usePageReset(paging.setPage, JSON.stringify([tab, dq, rm, priority, source, status, dates, ordering]));

  const { data, isFetching, error } = useGetInquiriesQuery({
    tab,
    q: dq,
    rmId: rm,
    priority: priority as Priority,
    source: source as Source,
    status: status as InquiryStatus,
    dateRange: dates as InquiryListParams['dateRange'],
    ordering: ordering || undefined,
    page: paging.page,
    pageSize: paging.size,
  });
  const { data: counts } = useGetInquiryCountsQuery();
  const { data: dash } = useGetAdminDashboardQuery({ range: '30' });
  const [statusFor, setStatusFor] = React.useState<{ inq: Inquiry; status: MoveTo } | null>(null);
  const hl = useHighlight(!isFetching && !!data);
  const assignParam = sp.get('assign');
  React.useEffect(() => {
    if (assignParam && data?.results.some((r) => r.id === assignParam && !r.rm)) {
      setAssignId(assignParam);
      setSelRm('');
      setSelPri('High');
    }
  }, [assignParam, data]);
  const [assign, { isLoading: assigning }] = useAssignInquiryMutation();

  const [assignId, setAssignId] = React.useState<string | null>(null);
  const [selRm, setSelRm] = React.useState('');
  const [selPri, setSelPri] = React.useState<Priority>('High');
  const [menu, setMenu] = React.useState<{ el: HTMLElement; inq: Inquiry } | null>(null);
  const rows = data?.results ?? [];
  const [selected, setSelected] = React.useState<string[]>([]);
  const [bulk, setBulk] = React.useState<BulkMode | null>(null);
  const bulkEnabled = canAssign;
  // Assign / Reassign works on any open inquiry; Snooze and Mark as Lost are Nurture-only.
  const selectedRows = rows.filter((r) => selected.includes(r.id));
  const hasClosed = selectedRows.some((r) => r.status === 'Won' || r.status === 'Lost');
  const allNurture = selectedRows.length > 0 && selectedRows.every((r) => r.status === 'Nurture');
  React.useEffect(() => setSelected([]), [tab, dq, rm, priority, source, status, dates, paging.page]);

  const reset = () => {
    setQ('');
    setRm('');
    setPriority('');
    setSource('');
    setStatus('');
    setDates('');
    router.replace('/inquiries');
  };

  const doAssign = async (id: string) => {
    if (!selRm) {
      enqueueSnackbar('Select an RM first', { variant: 'warning' });
      return;
    }
    try {
      await assign({ id, rmId: selRm, priority: selPri }).unwrap();
      enqueueSnackbar('RM assigned', { variant: 'success' });
      setAssignId(null);
      setSelRm('');
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Inquiries"
        subtitle="Manage all inquiries, assign to RMs and view details."
        actions={
          can('inquiries', 'create') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => router.push('/inquiries/new')}>
              New Inquiry
            </Button>
          ) : undefined
        }
      />
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg>
          <KpiCard href="/inquiries?tab=all&highlight=list" label="Total Inquiries" sub="All time" value={counts?.all ?? 0} icon="mdi:file-document-edit-outline" tone="blue" />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard
            href="/inquiries?tab=unassigned&highlight=list"
            label="Unassigned Inquiries"
            value={dash?.kpis.unassigned ?? 0}
            icon="mdi:account-alert-outline"
            tone="red"
            valueColor="#D32F2F"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard
            href="/inquiries?tab=all&status=Active%20Conversations&highlight=list"
            label="Active Conversations"
            sub="All time"
            value={counts?.active ?? 0}
            icon="mdi:clock-outline"
            tone="blue"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard
            href="/inquiries?tab=all&status=Won&highlight=list"
            label="Won (This Month)"
            value={dash?.kpis.wonCount ?? 0}
            sub={`Revenue: ${fLakh(dash?.kpis.wonRevenue ?? 0)}`}
            icon="mdi:trophy-outline"
            tone="green"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard href="/inquiries?tab=nurture&highlight=list" label="Nurture" value={counts?.nurture ?? 0} icon="mdi:sprout" tone="purple" />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard href="/inquiries?tab=all&status=Lost&highlight=list" label="Lost (This Month)" value={dash?.kpis.lostCount ?? 0} icon="mdi:chart-bar" tone="orange" />
        </Grid>
      </Grid>
      <TabsUnderline
        value={tab}
        onChange={(v) => setTab(v as AdminTab)}
        tabs={[
          { value: 'all', label: `All Inquiries (${counts?.all ?? '…'})` },
          { value: 'unassigned', label: `Unassigned (${counts?.unassigned ?? '…'})` },
          { value: 'assigned', label: `Assigned (${counts?.assigned ?? '…'})` },
          { value: 'nurture', label: `Nurture (${counts?.nurture ?? '…'})` },
        ]}
      />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }} alignItems="center">
        <Box sx={{ flex: '1 1 280px', maxWidth: 420 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search by Inquiry ID, customer name, phone, email, requirement..." />
        </Box>
        <FilterSelect value={rm} onChange={setRm} all="All RMs" options={rms.map((r) => ({ value: r.id, label: r.name }))} />
        <FilterSelect value={priority} onChange={setPriority} all="All Priorities" options={opt(PRIORITIES)} />
        <FilterSelect value={source} onChange={setSource} all="All Sources" options={opt(SOURCES)} />
        <FilterSelect value={status} onChange={setStatus} all="All Statuses" options={opt(STATUSES)} />
        <FilterSelect value={dates} onChange={setDates} all="All Dates" options={DATES} />
        <Button onClick={reset} sx={{ fontWeight: 600 }}>
          Reset
        </Button>
      </Stack>

      <BulkActionDialog
        mode={bulk}
        ids={selected}
        onClose={() => setBulk(null)}
        onDone={() => {
          setBulk(null);
          setSelected([]);
        }}
      />
      <HighlightFrame match="list" scroll={false}>
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    disabled={!bulkEnabled}
                    checked={bulkEnabled && rows.length > 0 && selected.length === rows.length}
                    indeterminate={bulkEnabled && selected.length > 0 && selected.length < rows.length}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                    inputProps={{ 'aria-label': 'Select all on this page' }}
                  />
                </TableCell>
                {bulkEnabled && selected.length > 0 ? (
                  <TableCell colSpan={10} sx={{ bgcolor: '#EEF4FF' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="subtitle2">{selected.length} selected</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={hasClosed}
                        startIcon={<Iconify icon="mdi:account-switch-outline" width={16} />}
                        onClick={() => setBulk('reassign')}
                      >
                        Assign / Reassign RM
                      </Button>
                      {allNurture && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:clock-outline" width={16} />} onClick={() => setBulk('snooze')}>
                            Snooze
                          </Button>
                          <Button size="small" variant="outlined" color="error" startIcon={<Iconify icon="mdi:close-circle-outline" width={16} />} onClick={() => setBulk('lost')}>
                            Mark as Lost
                          </Button>
                        </>
                      )}
                      {hasClosed && <Typography variant="caption">Won or closed inquiries can&apos;t be reassigned. Untick them to continue.</Typography>}
                      {!allNurture && !hasClosed && <Typography variant="caption">Snooze and Mark as Lost are available when only Nurture inquiries are selected.</Typography>}
                      <Button size="small" onClick={() => setSelected([])} sx={{ ml: 'auto !important' }}>
                        Clear
                      </Button>
                    </Stack>
                  </TableCell>
                ) : (
                  <>
                    {['Inquiry ID', 'Customer', 'Requirement', 'Value (₹)', 'Source', 'Priority', 'Assigned RM', 'Status', 'Created On', 'Actions'].map((h) =>
                      SORTABLE[h] ? (
                        <SortHead key={h} field={SORTABLE[h]} ordering={ordering} onSort={toggle}>
                          {h}
                        </SortHead>
                      ) : (
                        <TableCell key={h}>{h}</TableCell>
                      ),
                    )}
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={11} emptyText="No inquiries match these filters." />
              {rows.map((i) => (
                <React.Fragment key={i.id}>
                  <TableRow hover data-row={i.id} sx={{ opacity: isFetching ? 0.6 : 1, ...highlightSx(hl === i.id) }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        disabled={!bulkEnabled}
                        checked={selected.includes(i.id)}
                        onChange={(e) => setSelected(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))}
                        inputProps={{ 'aria-label': `Select ${i.code}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <NextLink href={`/inquiries/${i.id}`} style={{ color: tokens.blue, textDecoration: 'none' }}>
                        {i.code}
                      </NextLink>
                    </TableCell>
                    <TableCell>
                      <CustomerCell c={i.customer} link repeat={i.repeatProspect} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 190 }}>{i.requirement}</TableCell>
                    <TableCell>{fNum(i.value)}</TableCell>
                    <TableCell>{i.source}</TableCell>
                    <TableCell>
                      <Pill label={i.priority} />
                    </TableCell>
                    <TableCell>{i.rm ? i.rm.name : <span style={{ color: '#D32F2F', fontWeight: 600 }}>— Unassigned</span>}</TableCell>
                    <TableCell>
                      <Pill label={i.status} />
                      {i.sale && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: tokens.muted }}>
                          Sale {i.sale.saleNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {fDate(i.createdAt)}
                      <br />
                      <span style={{ fontSize: 12 }}>{fTime(i.createdAt)}</span>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {!i.rm && canAssign && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Iconify icon="mdi:account-plus-outline" width={16} />}
                            onClick={() => {
                              setAssignId(i.id);
                              setSelRm('');
                              setSelPri('High');
                            }}
                          >
                            Assign
                          </Button>
                        )}
                        <IconButton aria-label="Inquiry actions" size="small" onClick={(e) => setMenu({ el: e.currentTarget, inq: i })}>
                          <Iconify icon="mdi:dots-vertical" width={18} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {assignId === i.id && (
                    <TableRow>
                      <TableCell colSpan={11} sx={{ p: 0, bgcolor: '#E9F8EE', borderLeft: '4px solid #1E8E3E' }}>
                        <Stack direction="row" alignItems="flex-end" spacing={2.5} sx={{ p: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 220 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#1E8E3E', color: '#fff', display: 'grid', placeItems: 'center' }}>
                              <Iconify icon="mdi:account-outline" width={22} />
                            </Box>
                            <Typography sx={{ fontWeight: 700, color: tokens.ink, lineHeight: 1.25 }}>
                              Assign RM to Inquiry
                              <br />
                              {i.code}
                            </Typography>
                          </Stack>
                          <Box sx={{ width: 200 }}>
                            <FieldLabel label="Select RM" required>
                              <Select value={selRm} onChange={(e) => setSelRm(e.target.value as string)} displayEmpty fullWidth>
                                <MenuItem value="" disabled>
                                  Select RM
                                </MenuItem>
                                {rms.map((r) => (
                                  <MenuItem key={r.id} value={r.id}>
                                    {r.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FieldLabel>
                          </Box>
                          <Box sx={{ width: 200 }}>
                            <FieldLabel label="Priority" required>
                              <Select value={selPri} onChange={(e) => setSelPri(e.target.value as Priority)} fullWidth>
                                {ASSIGN_PRIORITIES.map((p) => (
                                  <MenuItem key={p} value={p}>
                                    {p}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FieldLabel>
                          </Box>
                          <Box sx={{ flex: 1 }} />
                          <Button variant="outlined" onClick={() => setAssignId(null)}>
                            Cancel
                          </Button>
                          <Button variant="contained" color="success" disabled={assigning} onClick={() => doAssign(i.id)}>
                            Assign RM
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Box>
      </HighlightFrame>
      <Pager paging={paging} total={data?.count ?? 0} noun="inquiries" />
      <Menu anchorEl={menu?.el} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            const i = menu!.inq;
            setMenu(null);
            router.push(`/inquiries/${i.id}`);
          }}
        >
          <Iconify icon="mdi:eye-outline" width={18} sx={{ mr: 1.5 }} />
          View Inquiry
        </MenuItem>
        {canEdit && (
          <MenuItem
            onClick={() => {
              const i = menu!.inq;
              setMenu(null);
              router.push(`/inquiries/${i.id}/edit`);
            }}
          >
            <Iconify icon="mdi:pencil-outline" width={18} sx={{ mr: 1.5 }} />
            Edit Inquiry
          </MenuItem>
        )}
        {menu &&
          !['Won', 'Lost'].includes(menu.inq.status) &&
          (canAssign || canEdit) && [
            canAssign ? (
              <MenuItem
                key="r"
                onClick={() => {
                  const i = menu.inq;
                  setMenu(null);
                  setAssignId(i.id);
                  setSelRm('');
                  setSelPri('High');
                }}
              >
                <Iconify icon="mdi:account-switch-outline" width={18} sx={{ mr: 1.5 }} />
                Reassign RM
              </MenuItem>
            ) : null,
            canEdit ? (
              <MenuItem
                key="w"
                divider
                onClick={() => {
                  const i = menu.inq;
                  setMenu(null);
                  router.push(`/inquiries/${i.id}/won`);
                }}
              >
                <Iconify icon="mdi:trophy-outline" width={18} sx={{ mr: 1.5, color: '#1E8E3E' }} />
                Mark as Won
              </MenuItem>
            ) : null,
            canEdit ? (
              <MenuItem
                key="l"
                onClick={() => {
                  const i = menu.inq;
                  setMenu(null);
                  setStatusFor({ inq: i, status: 'Lost' });
                }}
              >
                <Iconify icon="mdi:close-circle-outline" width={18} sx={{ mr: 1.5, color: '#C62828' }} />
                Mark as Closed
              </MenuItem>
            ) : null,
            canEdit && menu.inq.status !== 'Nurture' ? (
              <MenuItem
                key="n"
                onClick={() => {
                  const i = menu.inq;
                  setMenu(null);
                  setStatusFor({ inq: i, status: 'Nurture' });
                }}
              >
                <Iconify icon="mdi:sprout-outline" width={18} sx={{ mr: 1.5 }} />
                Mark as Nurture
              </MenuItem>
            ) : null,
          ]}
      </Menu>
      <StatusDialog inq={statusFor?.inq ?? null} status={statusFor?.status ?? null} onClose={() => setStatusFor(null)} />
    </Box>
  );
}
