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
import Checkbox from '@mui/material/Checkbox';
import { PageHeader, SearchBox, FilterSelect, Pill, RepeatTag, Pager, usePaging, useDebounced, QueryState, tableWrap, usePageReset } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { fDate, fNum } from '@/lib/formatters';
import { CUSTOMER_TYPES } from '@/lib/constants';
import { useAuth } from '@/core/auth/useAuth';
import { useGetCustomerLocationsQuery, useGetCustomersQuery } from '../api';
import { useRms } from '@/features/users/api';

export default function CustomersList() {
  const router = useRouter();
  const { can } = useAuth();
  const rms = useRms();
  const { data: locations = [] } = useGetCustomerLocationsQuery();
  const [q, setQ] = React.useState('');
  const [loc, setLoc] = React.useState('');
  const [rm, setRm] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [type, setType] = React.useState('');
  const paging = usePaging(10);
  const dq = useDebounced(q);
  usePageReset(paging.setPage, JSON.stringify([dq, loc, rm, status, type]));

  const { data, isFetching, error } = useGetCustomersQuery({ q: dq, location: loc, rmId: rm, status, customerType: type, page: paging.page, pageSize: paging.size });
  const rows = data?.results ?? [];

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle="Manage real customers of Artisera. (Customers created directly or converted from inquiry)."
        actions={
          can('customers', 'create') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => router.push('/customers/new')}>
              Add Customer
            </Button>
          ) : undefined
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }} alignItems="center">
        <Box sx={{ flex: '1 1 260px', maxWidth: 360 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search by customer name, phone, email..." />
        </Box>
        <FilterSelect value={loc} onChange={setLoc} all="All Locations" options={locations.map((l) => ({ value: l, label: l }))} width={160} />
        <FilterSelect value={rm} onChange={setRm} all="All Relationship Managers" options={rms.map((u) => ({ value: u.id, label: u.name }))} width={230} />
        <FilterSelect value={type} onChange={setType} all="All Types" options={CUSTOMER_TYPES.map((x) => ({ value: x, label: x }))} width={150} />
        <FilterSelect
          value={status}
          onChange={setStatus}
          all="All Statuses"
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
          width={150}
        />
        <Button
          sx={{ fontWeight: 600 }}
          onClick={() => {
            setQ('');
            setLoc('');
            setRm('');
            setStatus('');
            setType('');
          }}
        >
          Reset
        </Button>
      </Stack>
      <Box sx={tableWrap}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox size="small" />
              </TableCell>
              {[
                'Customer ID',
                'Customer Name',
                'Type',
                'Contact Details',
                'Location',
                'Total Inquiries',
                'Open',
                'Won',
                'Total Value (₹)',
                'Last Activity',
                'Relationship Manager',
                'Status',
                'Actions',
              ].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={14} emptyText="No customers found." />
            {rows.map((c) => (
              <TableRow key={c.id} hover sx={{ opacity: isFetching ? 0.6 : 1 }}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" />
                </TableCell>
                <TableCell>
                  <NextLink href={`/customers/${c.id}`} style={{ color: tokens.blue, textDecoration: 'none' }}>
                    {c.code}
                  </NextLink>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: tokens.ink }}>{c.name}</TableCell>
                <TableCell>
                  <Pill label={c.customerType} />
                  {c.repeatProspect && (
                    <Box sx={{ mt: 0.5 }}>
                      <RepeatTag />
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12 }}>
                    ✆ {c.phone}
                    <br />✉ {c.email ?? '—'}
                  </span>
                </TableCell>
                <TableCell>{c.location ?? '—'}</TableCell>
                <TableCell align="center">{c.totalInquiries}</TableCell>
                <TableCell align="center" sx={{ color: '#D32F2F' }}>
                  {c.openInquiries}
                </TableCell>
                <TableCell align="center" sx={{ color: '#1E8E3E' }}>
                  {c.wonInquiries}
                </TableCell>
                <TableCell>₹{fNum(c.totalValue)}</TableCell>
                <TableCell>{fDate(c.lastActivityAt)}</TableCell>
                <TableCell>{c.rm?.name ?? '—'}</TableCell>
                <TableCell>
                  <Pill label={c.status} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:eye-outline" width={16} />} onClick={() => router.push(`/customers/${c.id}`)}>
                      View
                    </Button>
                    {can('customers', 'edit') && (
                      <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:pencil" width={16} />} onClick={() => router.push(`/customers/${c.id}/edit`)}>
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
      <Pager paging={paging} total={data?.count ?? 0} noun="customers" />
    </Box>
  );
}
