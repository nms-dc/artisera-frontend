'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import { useAuth } from '@/core/auth/useAuth';
import { PageHeader, SearchBox, FilterSelect, Pill, Pager, usePaging, useDebounced, QueryState, tableWrap, usePageReset } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useGetRoleListQuery } from '../api';

export default function RolesList() {
  const router = useRouter();
  const { can } = useAuth();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('');
  const paging = usePaging(10);
  const dq = useDebounced(q);
  usePageReset(paging.setPage, JSON.stringify([dq, status]));
  const { data, isFetching, error } = useGetRoleListQuery({ q: dq, status, page: paging.page, pageSize: paging.size });
  const rows = data?.results ?? [];
  const from = (paging.page - 1) * paging.size;

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Roles' }]}
        title="Roles"
        subtitle="Manage user roles and their access permissions in the system."
        actions={
          can('users', 'create') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => router.push('/masters/roles/new')}>
              Add Role
            </Button>
          ) : undefined
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
        <Box sx={{ width: 360 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search roles..." />
        </Box>
        <FilterSelect
          value={status}
          onChange={setStatus}
          all="All Status"
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
            setStatus('');
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
              {['#', 'Role Name', 'Description', 'Status', 'Users Count', 'Actions'].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={7} emptyText="No roles found." />
            {rows.map((r, i) => (
              <TableRow key={r.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox size="small" />
                </TableCell>
                <TableCell>{from + i + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: tokens.ink }}>{r.name}</TableCell>
                <TableCell sx={{ maxWidth: 360 }}>{r.description}</TableCell>
                <TableCell>
                  <Pill label={r.status} />
                </TableCell>
                <TableCell align="center">{r.usersCount}</TableCell>
                <TableCell>
                  {can('users', 'edit') && (
                    <IconButton aria-label="Edit role" size="small" sx={{ color: tokens.blue }} onClick={() => router.push(`/masters/roles/${r.id}`)}>
                      <Iconify icon="mdi:pencil" width={18} />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Pager paging={paging} total={data?.count ?? 0} noun="roles" />
    </Box>
  );
}
