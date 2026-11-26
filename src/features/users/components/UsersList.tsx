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
import { useGetUserListQuery } from '../api';
import { useGetRoleOptionsQuery } from '@/features/roles/api';

export default function UsersList() {
  const router = useRouter();
  const { can } = useAuth();
  const { data: roles = [] } = useGetRoleOptionsQuery();
  const [q, setQ] = React.useState('');
  const [role, setRole] = React.useState('');
  const [status, setStatus] = React.useState('');
  const paging = usePaging(10);
  const dq = useDebounced(q);
  usePageReset(paging.setPage, JSON.stringify([dq, role, status]));
  const { data, isFetching, error } = useGetUserListQuery({ q: dq, role, status, page: paging.page, pageSize: paging.size });
  const rows = data?.results ?? [];
  const from = (paging.page - 1) * paging.size;

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Users' }]}
        title="Users"
        subtitle="Manage system users and their roles."
        actions={
          can('users', 'create') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => router.push('/masters/users/new')}>
              Add User
            </Button>
          ) : undefined
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
        <Box sx={{ width: 340 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search by name, email or phone..." />
        </Box>
        <FilterSelect value={role} onChange={setRole} all="All Roles" options={roles.map((r) => ({ value: r.id, label: r.name }))} width={200} />
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
            setRole('');
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
              {['#', 'Name', 'Email', 'Role', 'Phone', 'Status', 'Actions'].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={8} emptyText="No users found." />
            {rows.map((u, i) => (
              <TableRow key={u.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox size="small" />
                </TableCell>
                <TableCell>{from + i + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: tokens.ink }}>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Pill label={u.roleId === 'RM' ? 'RM' : u.roleName} kind={u.roleId === 'ADMIN' ? 'Admin' : 'RM'} />
                </TableCell>
                <TableCell>{u.phone}</TableCell>
                <TableCell>
                  <Pill label={u.status} />
                </TableCell>
                <TableCell>
                  {can('users', 'edit') && (
                    <IconButton aria-label="Edit user" size="small" sx={{ color: tokens.blue }} onClick={() => router.push(`/masters/users/${u.id}`)}>
                      <Iconify icon="mdi:pencil" width={18} />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Pager paging={paging} total={data?.count ?? 0} noun="users" />
    </Box>
  );
}
