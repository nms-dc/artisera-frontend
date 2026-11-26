'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { PageHeader, SearchBox, Pill, Pager, usePaging, useDebounced, QueryState, tableWrap, usePageReset } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { fDate, fNum } from '@/lib/formatters';
import { useAuth } from '@/core/auth/useAuth';
import { downloadFile } from '@/core/api/download';
import { endpoints } from '@/core/api/endpoints';
import { handleSubmitError } from '@/core/ui/forms';
import { CustomerCell } from '@/features/inquiries/components/shared';
import { useGetInquiryDetailReportQuery } from '../api';
import ReportFilters, { defaultFilters } from './ReportFilters';
import type { ReportFilters as Filters } from '@/lib/types';

export default function InquiryDetailReport() {
  const router = useRouter();
  const { can } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = React.useState<Filters>(defaultFilters());
  const [q, setQ] = React.useState('');
  const dq = useDebounced(q);
  const paging = usePaging(10);
  usePageReset(paging.setPage, JSON.stringify([filters, dq]));

  const { data, isFetching, error } = useGetInquiryDetailReportQuery({ ...filters, q: dq, page: paging.page, pageSize: paging.size });
  const rows = data?.results ?? [];

  const exportCsv = async () => {
    try {
      await downloadFile(endpoints.reports.inquiryDetailExport, { ...filters, q: dq }, `inquiry-detail-${format(new Date(), 'yyyyMMdd')}.csv`);
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Reports', href: '/reports/inquiry-summary' }, { label: 'Inquiry Detail' }]}
        title="Inquiry Detail"
        subtitle="View detailed list of inquiries for the selected period and filters."
      />
      <ReportFilters
        onApply={setFilters}
        extra={
          <Button variant="outlined" startIcon={<Iconify icon="mdi:download" width={18} />} onClick={exportCsv}>
            Export
          </Button>
        }
      />
      <Box sx={{ mb: 2 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search by Inquiry ID, customer name, email, phone or contact..." />
      </Box>
      <Box sx={tableWrap}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                'Inquiry ID',
                'Customer / Prospect',
                'Contact Details',
                'Category',
                'Subcategory',
                'Quantity',
                'Value (₹)',
                'Status',
                'Follow-up Date',
                'Relationship Manager',
                'Created Date',
                'Actions',
              ].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={12} emptyText="No inquiries for these filters." />
            {rows.map((i) => (
              <TableRow key={i.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                <TableCell>
                  <NextLink href={`/inquiries/${i.id}`} style={{ color: tokens.blue, textDecoration: 'none' }}>
                    {i.code}
                  </NextLink>
                </TableCell>
                <TableCell>
                  <CustomerCell c={i.customer} repeat={i.repeatProspect} />
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12 }}>
                    {i.customer.phone}
                    <br />
                    {i.customer.email}
                  </span>
                </TableCell>
                <TableCell>{i.category?.name ?? '—'}</TableCell>
                <TableCell>{i.subcategory?.name ?? '—'}</TableCell>
                <TableCell align="center">{i.quantity}</TableCell>
                <TableCell>{fNum(i.value)}</TableCell>
                <TableCell>
                  <Pill label={i.status} />
                </TableCell>
                <TableCell>{i.nextFollowUp ? fDate(i.nextFollowUp) : '-'}</TableCell>
                <TableCell>{i.rm?.name ?? 'Unassigned'}</TableCell>
                <TableCell>{fDate(i.createdAt)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:eye-outline" width={16} />} onClick={() => router.push(`/inquiries/${i.id}`)}>
                      View
                    </Button>
                    {can('inquiries', 'edit') && (
                      <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:pencil" width={16} />} onClick={() => router.push(`/inquiries/${i.id}/edit`)}>
                        Edit
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Pager paging={paging} total={data?.count ?? 0} noun="inquiries" />
    </Box>
  );
}
