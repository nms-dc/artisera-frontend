'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useAuth } from '@/core/auth/useAuth';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Alert from '@mui/material/Alert';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { PageHeader, KpiCard, Panel, FilterSelect, AvatarInitials, tableWrap } from '@/core/ui/common';
import { tokens } from '@/core/theme/palette';
import { CHART } from '@/lib/constants';
import { fLakh, fNum } from '@/lib/formatters';
import { useGetAdminDashboardQuery } from '../api';
import type { DashboardRange } from '@/lib/types';
import { errorMessage } from '@/core/api/errors';

export const RANGES = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'all', label: 'All time' },
];
const SRC_COLORS: Record<string, string> = { Website: CHART.blue, Email: CHART.purple, WhatsApp: CHART.green, 'Phone / Walk-in': CHART.orange };
const TYPE_COLORS = [CHART.blue, CHART.purple, CHART.green, CHART.grey];
const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

export default function AdminDashboard() {
  const { can } = useAuth();
  const [range, setRange] = React.useState<DashboardRange>('30');
  const [tableRange, setTableRange] = React.useState<DashboardRange>('30');
  const { data, error } = useGetAdminDashboardQuery({ range });
  const { data: tableData } = useGetAdminDashboardQuery({ range: tableRange });

  if (error) return <Alert severity="error">Could not load the dashboard: {errorMessage(error)}</Alert>;
  const k = data?.kpis;
  const total = k?.total ?? 0;

  const main = ['Website', 'Email', 'WhatsApp', 'Phone / Walk-in'];
  const donut = [
    ...main.map((name) => ({ name, count: data?.bySource.find((s) => s.source === name)?.count ?? 0 })),
    { name: 'Other', count: (data?.bySource ?? []).filter((s) => !main.includes(s.source)).reduce((a, b) => a + b.count, 0) },
  ];
  const maxType = Math.max(1, ...(data?.byType ?? []).map((t) => t.count));
  const trend = (data?.trend ?? []).map((t, i, arr) => {
    const m = format(parseISO(t.weekStart), 'MMM');
    return { label: i === 0 || format(parseISO(arr[i - 1].weekStart), 'MMM') !== m ? m : '', count: t.count, tip: format(parseISO(t.weekStart), 'dd-MMM-yyyy') };
  });
  const rmRows = tableData?.rmTable ?? [];
  const sum = (key: 'touchbase' | 'followUp' | 'active' | 'nurture' | 'won' | 'lost' | 'total' | 'wonValue' | 'pipelineValue' | 'revenue') =>
    rmRows.reduce((a, b) => a + b[key], 0);

  return (
    <Box>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Business overview and RM performance"
        actions={<FilterSelect value={range} onChange={(v) => setRange((v || '30') as DashboardRange)} options={RANGES} all="Last 30 Days" width={170} />}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg>
          <KpiCard href="/inquiries?tab=all&highlight=list" label="Total Inquiries" value={total} icon="mdi:file-document-edit-outline" tone="blue" />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard
            href="/inquiries?tab=unassigned&highlight=list"
            label="Unassigned Inquiries"
            value={k?.unassigned ?? 0}
            icon="mdi:account-alert-outline"
            tone="red"
            valueColor="#D32F2F"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard
            href="/inquiries?tab=all&status=Active%20Conversations&highlight=list"
            label="Active Inquiries (In Progress)"
            value={k?.active ?? 0}
            icon="mdi:clock-outline"
            tone="blue"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard
            href="/inquiries?tab=all&status=Won&highlight=list"
            label="Won"
            value={k?.wonCount ?? 0}
            sub={`Revenue: ${fLakh(k?.wonRevenue ?? 0)}`}
            icon="mdi:trophy-outline"
            tone="green"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard label="In Pipeline" value={k?.pipelineCount ?? 0} sub={`Value: ${fLakh(k?.pipelineValue ?? 0)}`} icon="mdi:chart-timeline-variant" tone="purple" />
        </Grid>
        <Grid item xs={12} sm={6} lg>
          <KpiCard href="/inquiries?tab=all&status=Lost&highlight=list" label="Lost" value={k?.lostCount ?? 0} icon="mdi:chart-bar" tone="orange" />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Panel title="Inquiries by Source" sx={{ height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ width: 170, height: 170, position: 'relative', flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut} dataKey="count" innerRadius={52} outerRadius={80} paddingAngle={1} stroke="none">
                      {donut.map((d) => (
                        <Cell key={d.name} fill={SRC_COLORS[d.name] ?? CHART.grey} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: tokens.ink, lineHeight: 1 }}>{total}</Typography>
                    <Typography variant="caption">Total</Typography>
                  </Box>
                </Box>
              </Box>
              <Stack spacing={1} sx={{ flex: 1 }}>
                {donut.map((d) => (
                  <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: SRC_COLORS[d.name] ?? CHART.grey }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {d.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {d.count} ({pct(d.count, total)}%)
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Panel>
        </Grid>
        <Grid item xs={12} md={4}>
          <Panel title="Inquiries by Type" sx={{ height: '100%' }}>
            <Stack spacing={2.25} sx={{ pt: 1 }}>
              {(data?.byType ?? []).map((t, i) => (
                <Stack key={t.type} direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="body2" sx={{ width: 110 }}>
                    {t.type}
                  </Typography>
                  <Box sx={{ flex: 1, height: 14, bgcolor: '#EEF3FB', borderRadius: 1 }}>
                    <Box sx={{ width: `${(t.count / maxType) * 100}%`, height: '100%', bgcolor: TYPE_COLORS[i % 4], borderRadius: 1 }} />
                  </Box>
                  <Typography variant="body2" sx={{ width: 62, textAlign: 'right', fontWeight: 600 }}>
                    {t.count} ({pct(t.count, total)}%)
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Panel>
        </Grid>
        <Grid item xs={12} md={4}>
          <Panel title="Weekly Trend (New Inquiries)" sx={{ height: '100%' }}>
            <Box sx={{ height: 190 }}>
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART.blue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#E8EEF8" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval={0} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} inquiries`, '']} labelFormatter={(_l, p) => `Week of ${p?.[0]?.payload?.tip ?? ''}`} />
                  <Area type="monotone" dataKey="count" stroke={CHART.blue} strokeWidth={2} fill="url(#g)" dot={{ r: 3, fill: CHART.blue }} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Panel>
        </Grid>
      </Grid>

      <Panel
        title="Inquiry Status by RM"
        action={<FilterSelect value={tableRange} onChange={(v) => setTableRange((v || '30') as DashboardRange)} options={RANGES} all="Last 30 Days" width={160} />}
        sx={{ p: 0, '& > .MuiStack-root': { px: 2.25, pt: 2 } }}
      >
        <Box sx={{ ...tableWrap, border: 'none', borderTop: `1px solid ${tokens.border}`, borderRadius: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>RM Name</TableCell>
                <TableCell align="center">Touchbase</TableCell>
                <TableCell align="center">Follow-up</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="center">Nurture</TableCell>
                <TableCell align="center">Won</TableCell>
                <TableCell align="center">Lost</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell align="center">Won (₹)</TableCell>
                <TableCell align="center">In Pipeline (₹)</TableCell>
                <TableCell align="center">Total Value (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rmRows.map((r, i) => (
                <TableRow key={r.rm.id} hover>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <AvatarInitials name={r.rm.name} />
                      {can('inquiries', 'assignRm') ? (
                        <NextLink href={`/rm/${r.rm.id}`} style={{ color: tokens.blue, fontWeight: 600 }}>
                          {r.rm.name}
                        </NextLink>
                      ) : (
                        <span>{r.rm.name}</span>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ color: tokens.blue }}>
                    {r.touchbase}
                  </TableCell>
                  <TableCell align="center">{r.followUp}</TableCell>
                  <TableCell align="center">{r.active}</TableCell>
                  <TableCell align="center">{r.nurture}</TableCell>
                  <TableCell align="center" sx={{ color: '#1E8E3E' }}>
                    {r.won}
                  </TableCell>
                  <TableCell align="center">{r.lost}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {r.total}
                  </TableCell>
                  <TableCell align="center" sx={{ color: '#1E8E3E' }}>
                    {fNum(r.wonValue)}
                  </TableCell>
                  <TableCell align="center">{fNum(r.pipelineValue)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {fNum(r.revenue)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ '& td': { fontWeight: 700, color: tokens.ink, bgcolor: tokens.headBg } }}>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell align="center">{sum('touchbase')}</TableCell>
                <TableCell align="center">{sum('followUp')}</TableCell>
                <TableCell align="center">{sum('active')}</TableCell>
                <TableCell align="center">{sum('nurture')}</TableCell>
                <TableCell align="center">{sum('won')}</TableCell>
                <TableCell align="center">{sum('lost')}</TableCell>
                <TableCell align="center">{sum('total')}</TableCell>
                <TableCell align="center">{fNum(sum('wonValue'))}</TableCell>
                <TableCell align="center">{fNum(sum('pipelineValue'))}</TableCell>
                <TableCell align="center">{fNum(sum('revenue'))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Panel>
    </Box>
  );
}
