'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import { PageHeader, Panel, FieldLabel, LabeledSelect, tableWrap } from '@/core/ui/common';
import { handleSubmitError } from '@/core/ui/forms';
import { useCreateRoleMutation, useGetRoleQuery, useUpdateRoleMutation } from '../api';
import type { PermissionAction, PermissionModule, Permissions } from '@/lib/types';

const MODULES: [PermissionModule, string][] = [
  ['inquiries', 'Inquiries'],
  ['customers', 'Customers'],
  ['masters', 'Masters (Categories, Artists, etc.)'],
  ['reports', 'Reports'],
  ['users', 'User Management'],
  ['sales', 'Sales (Won)'],
  ['orders', 'Orders'],
  ['shipments', 'Shipments'],
  ['certificates', 'Certificates'],
];
const ACTIONS: [PermissionAction, string][] = [
  ['view', 'View'],
  ['create', 'Create'],
  ['edit', 'Edit'],
  ['delete', 'Delete'],
  ['assignRm', 'Assign RM'],
];
const EMPTY: Permissions = { inquiries: {}, customers: {}, masters: {}, reports: {}, users: {}, sales: {}, orders: {}, shipments: {}, certificates: {} };
const schema = Yup.object({ name: Yup.string().required('Required'), description: Yup.string().required('Required'), status: Yup.string().required() });

export default function RoleForm({ id }: { id: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: role, isLoading } = useGetRoleQuery(id, { skip: isNew });
  const [create] = useCreateRoleMutation();
  const [update] = useUpdateRoleMutation();
  const [perms, setPerms] = React.useState<Permissions>(EMPTY);
  React.useEffect(() => {
    if (role) setPerms({ ...EMPTY, ...role.permissions });
  }, [role]);

  const f = useFormik({
    enableReinitialize: true,
    initialValues: { name: role?.name ?? '', description: role?.description ?? '', status: role?.status ?? 'Active' },
    validationSchema: schema,
    onSubmit: async (v, { setErrors }) => {
      try {
        const body = { ...v, status: v.status as 'Active' | 'Inactive', permissions: perms };
        if (isNew) await create(body).unwrap();
        else await update({ id, changes: body }).unwrap();
        enqueueSnackbar('Role saved', { variant: 'success' });
        router.push('/masters/roles');
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e, setErrors), { variant: 'error' });
      }
    },
  });
  if (!isNew && isLoading) return <CircularProgress />;
  const bad = (k: 'name' | 'description') => Boolean(f.errors[k] && (f.touched[k] || f.submitCount));
  const toggle = (m: PermissionModule, a: PermissionAction) => setPerms((p) => ({ ...p, [m]: { ...p[m], [a]: !p[m]?.[a] } }));

  return (
    <Box component="form" onSubmit={f.handleSubmit}>
      <PageHeader
        crumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Roles', href: '/masters/roles' }, { label: isNew ? 'Add Role' : 'Edit Role' }]}
        title={isNew ? 'Add Role' : 'Edit Role'}
        subtitle="Update role details and permissions."
        actions={
          <>
            <Button variant="outlined" onClick={() => router.push('/masters/roles')}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Changes
            </Button>
          </>
        }
      />
      <Panel>
        <Grid container spacing={2}>
          <Grid item xs={12} md={9}>
            <FieldLabel label="Role Name" required>
              <TextField
                name="name"
                value={f.values.name}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                error={bad('name')}
                helperText={bad('name') ? f.errors.name : undefined}
              />
            </FieldLabel>
          </Grid>
          <Grid item xs={12} md={3}>
            <LabeledSelect
              label="Status"
              required
              value={f.values.status}
              onChange={(v) => f.setFieldValue('status', v)}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </Grid>
          <Grid item xs={12}>
            <FieldLabel label="Description" required>
              <TextField
                name="description"
                multiline
                minRows={3}
                value={f.values.description}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                error={bad('description')}
                helperText={bad('description') ? f.errors.description : undefined}
              />
            </FieldLabel>
          </Grid>
        </Grid>
        <Typography variant="subtitle1" sx={{ mt: 3 }}>
          Module Permissions
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Select the modules this role can access and the permitted actions.
        </Typography>
        <Box sx={tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Module</TableCell>
                {ACTIONS.map(([, l]) => (
                  <TableCell key={l} align="center">
                    {l}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {MODULES.map(([m, label]) => (
                <TableRow key={m}>
                  <TableCell>{label}</TableCell>
                  {ACTIONS.map(([a]) => (
                    <TableCell key={a} align="center">
                      <Checkbox size="small" checked={Boolean(perms[m]?.[a])} onChange={() => toggle(m, a)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Panel>
    </Box>
  );
}
