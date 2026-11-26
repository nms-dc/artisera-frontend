'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList, Tooltip } from 'recharts';
import { PageHeader, KpiCard, Panel } from '@/core/ui/common';
import { tokens } from '@/core/theme/palette';
import { CHART } from '@/lib/constants';
import { useGetInquirySummaryQuery } from '../api';
import ReportFilters, { defaultFilters } from './ReportFilters';
import type { InquiryStatus, ReportFilters as Filters } from '@/lib/types';
import { errorMessage } from '@/core/api/errors';

const STATUS_COLORS: Record<string, string> = {
  Touchbase: CHART.amber,
  'Touchbase Follow-up': CHART.purple,
  'Active Conversations': CHART.blue,
  Nurture: CHART.grey,
  Won: CHART.green,
  Lost: CHART.pink,
};
const CAT_COLORS = [CHART.blue, CHART.amber, CHART.purple, CHART.green, CHART.pink];

export default function InquirySummary() {
  const [filters, setFilters] = React.useState<Filters>(defaultFilters());
  const { data, error } = useGetInquirySummaryQuery(filters);
  const k = data?.kpis;
  const rowsTotal = k?.total ?? 0;
  const byStatus = (data?.byStatus ?? []).map((d) => ({ name: d.status as InquiryStatus, value: d.count }));
  const byCat = (data?.byCategory ?? []).map((d) => ({ name: d.category, count: d.count }));
  const byRm = (data?.byRm ?? []).map((d) => ({ name: d.rm, count: d.count }));
  const maxRm = Math.max(1, ...byRm.map((r) => r.count));
  const rows = { length: rowsTotal };

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Reports', href: '/reports/inquiry-summary' }, { label: 'Inquiry Summary' }]}
        title="Inquiry Summary"
        subtitle="Overview of inquiries across status, categories and relationship managers."
      />
      <ReportFilters onApply={setFilters} />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Could not load the report: {errorMessage(error)}
        </Typography>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md>
          <KpiCard label="Total Inquiries" value={k?.total ?? 0} icon="mdi:file-document-outline" tone="blue" />
        </Grid>
        <Grid item xs={6} md>
          <KpiCard label="Touchbase" value={k?.touchbase ?? 0} icon="mdi:phone-outline" tone="orange" />
        </Grid>
        <Grid item xs={6} md>
          <KpiCard label="Touchbase Follow-up" value={k?.followUp ?? 0} icon="mdi:calendar-clock-outline" tone="purple" />
        </Grid>
        <Grid item xs={6} md>
          <KpiCard label="Active Conversations" value={k?.active ?? 0} icon="mdi:message-text-outline" tone="blue" />
        </Grid>
        <Grid item xs={6} md>
          <KpiCard label="Nurture" value={k?.nurture ?? 0} icon="mdi:sprout-outline" tone="orange" />
        </Grid>
        <Grid item xs={6} md>
          <KpiCard label="Won" value={k?.won ?? 0} icon="mdi:check-circle-outline" tone="green" />
        </Grid>
        <Grid item xs={6} md>
          <KpiCard label="Lost" value={k?.lost ?? 0} icon="mdi:close-circle-outline" tone="red" valueColor={tokens.ink} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Panel title="Inquiries by Status" sx={{ height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ width: 180, height: 180, position: 'relative', flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" innerRadius={52} outerRadius={82} stroke="none">
                      {byStatus.map((d) => (
                        <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: tokens.ink, lineHeight: 1 }}>{rows.length}</Typography>
                    <Typography variant="caption">Total</Typography>
                  </Box>
                </Box>
              </Box>
              <Stack spacing={1} sx={{ flex: 1 }}>
                {byStatus.map((d) => (
                  <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: STATUS_COLORS[d.name] }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {d.name}
                    </Typography>
                    <Typography variant="body2">
                      {d.value} ({rows.length ? ((d.value / rows.length) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Panel>
        </Grid>
        <Grid item xs={12} md={4}>
          <Panel title="Inquiries by Category (Top 5)" sx={{ height: '100%' }}>
            <Box sx={{ height: 210 }}>
              <ResponsiveContainer>
                <BarChart data={byCat} margin={{ top: 18, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F0F5FF' }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {byCat.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % 5]} />
                    ))}
                    <LabelList dataKey="count" position="top" fontSize={11} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Panel>
        </Grid>
        <Grid item xs={12} md={4}>
          <Panel title="Inquiries by Relationship Manager (Top 5)" sx={{ height: '100%' }}>
            <Stack spacing={2.25} sx={{ pt: 1 }}>
              {byRm.map((r) => (
                <Stack key={r.name} direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="body2" sx={{ width: 100 }}>
                    {r.name}
                  </Typography>
                  <Box sx={{ flex: 1, height: 14, bgcolor: '#EEF3FB', borderRadius: 1 }}>
                    <Box sx={{ width: `${(r.count / maxRm) * 100}%`, height: '100%', bgcolor: '#7FB0FF', borderRadius: 1 }} />
                  </Box>
                  <Typography variant="body2" sx={{ width: 24, textAlign: 'right', fontWeight: 600 }}>
                    {r.count}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
