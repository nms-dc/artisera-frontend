'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import { PageHeader, SearchBox, FilterSelect, Pill, Pager, usePaging, useDebounced, QueryState, tableWrap, usePageReset } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useAuth } from '@/core/auth/useAuth';
import { useCategoryOptions, useGetMasterListQuery } from '../api';
import type { Category, MasterKind } from '@/lib/types';

export const MASTER_META: Record<MasterKind, { title: string; one: string; sub: string; edit: string }> = {
  categories: { title: 'Categories', one: 'Category', sub: 'Manage high level art categories.', edit: 'Update category information.' },
  subcategories: { title: 'Subcategories', one: 'Subcategory', sub: 'Manage subcategories under each category.', edit: 'Update subcategory information.' },
  artists: { title: 'Artists', one: 'Artist', sub: 'Manage artists available in the system.', edit: 'Update artist information.' },
};

type MasterRow = { id: string; name: string; description?: string; status?: Category['status']; categoryName?: string | null; subcategoryName?: string | null };

export default function MasterList({ kind }: { kind: MasterKind }) {
  const router = useRouter();
  const { can } = useAuth();
  const meta = MASTER_META[kind];
  const cats = useCategoryOptions();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('Active');
  const [cat, setCat] = React.useState('');
  const paging = usePaging(10);
  const dq = useDebounced(q);
  usePageReset(paging.setPage, JSON.stringify([dq, status, cat, kind]));
  const hasStatus = kind !== 'artists';
  const { data, isFetching, error } = useGetMasterListQuery({ kind, q: dq, status: hasStatus ? status : undefined, categoryId: cat, page: paging.page, pageSize: paging.size });
  const rows = (data?.results ?? []) as MasterRow[];
  const from = (paging.page - 1) * paging.size;
  const heads =
    kind === 'categories'
      ? ['Category Name', 'Description']
      : kind === 'subcategories'
        ? ['Subcategory Name', 'Category', 'Description']
        : ['Artist Name', 'Category', 'Subcategory'];

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Masters', href: '/masters' }, { label: meta.title }]}
        title={meta.title}
        subtitle={meta.sub}
        actions={
          can('masters', 'create') ? (
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => router.push(`/masters/${kind}/new`)}>
              Add {meta.one}
            </Button>
          ) : undefined
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
        <Box sx={{ width: 300 }}>
          <SearchBox value={q} onChange={setQ} placeholder={`Search ${meta.title.toLowerCase()}...`} />
        </Box>
        {kind !== 'categories' && <FilterSelect value={cat} onChange={setCat} all="All Categories" options={cats.map((c) => ({ value: c.id, label: c.name }))} width={180} />}
        {hasStatus && (
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
        )}
        <Button
          sx={{ fontWeight: 600 }}
          onClick={() => {
            setQ('');
            setStatus('Active');
            setCat('');
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
              <TableCell>#</TableCell>
              {heads.map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
              {hasStatus && <TableCell>Status</TableCell>}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <QueryState loading={isFetching && !data} error={error} empty={!isFetching && rows.length === 0} colSpan={heads.length + (hasStatus ? 4 : 3)} emptyText="No records." />
            {rows.map((r, i) => (
              <TableRow key={r.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox size="small" />
                </TableCell>
                <TableCell>{from + i + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: tokens.ink }}>{r.name}</TableCell>
                {kind !== 'categories' && <TableCell>{r.categoryName || '—'}</TableCell>}
                <TableCell>{kind === 'artists' ? r.subcategoryName || '—' : r.description}</TableCell>
                {hasStatus && (
                  <TableCell>
                    <Pill label={r.status ?? ''} />
                  </TableCell>
                )}
                <TableCell>
                  {can('masters', 'edit') && (
                    <Button size="small" variant="outlined" startIcon={<Iconify icon="mdi:pencil" width={16} />} onClick={() => router.push(`/masters/${kind}/${r.id}`)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Pager paging={paging} total={data?.count ?? 0} noun={meta.title.toLowerCase()} />
    </Box>
  );
}
