'use client';

import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import { PageHeader, Panel, FieldLabel, LabeledSelect } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { handleSubmitError } from '@/core/ui/forms';
import { useCreateUserMutation, useGetUserQuery, useUpdateUserMutation } from '../api';
import { useGetRoleOptionsQuery } from '@/features/roles/api';

const schema = Yup.object({
  name: Yup.string().required('Required'),
  email: Yup.string().email('Enter a valid email').required('Required'),
  phone: Yup.string().required('Required'),
  roleId: Yup.string().required('Required'),
  status: Yup.string().required(),
});

export default function UserForm({ id }: { id: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: user, isLoading } = useGetUserQuery(id, { skip: isNew });
  const { data: roles = [] } = useGetRoleOptionsQuery();
  const [create] = useCreateUserMutation();
  const [update] = useUpdateUserMutation();

  const f = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      roleId: user?.roleId ?? '',
      status: user?.status ?? 'Active',
      notes: user?.notes ?? '',
    },
    validationSchema: schema,
    onSubmit: async (v, { setErrors }) => {
      try {
        const body = { ...v, status: v.status as 'Active' | 'Inactive' };
        if (isNew) await create(body).unwrap();
        else await update({ id, changes: body }).unwrap();
        enqueueSnackbar('User saved', { variant: 'success' });
        router.push('/masters/users');
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e, setErrors), { variant: 'error' });
      }
    },
  });
  if (!isNew && isLoading) return <CircularProgress />;

  const bad = (k: keyof typeof f.values) => Boolean(f.errors[k] && (f.touched[k] || f.submitCount));
  const txt = (k: keyof typeof f.values, label: string, req = false) => (
    <FieldLabel label={label} required={req}>
      <TextField name={k} value={f.values[k]} onChange={f.handleChange} onBlur={f.handleBlur} error={bad(k)} helperText={bad(k) ? (f.errors[k] as string) : undefined} />
    </FieldLabel>
  );

  return (
    <Box component="form" onSubmit={f.handleSubmit}>
      <PageHeader
        crumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Users', href: '/masters/users' }, { label: isNew ? 'Add User' : 'Edit User' }]}
        title={isNew ? 'Add User' : 'Edit User'}
        subtitle={isNew ? 'Create a user and assign a role.' : 'Update user details and assign a role.'}
        actions={
          <>
            <Button variant="outlined" onClick={() => router.push('/masters/users')}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Changes
            </Button>
          </>
        }
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Panel title="User Information">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                {txt('name', 'Full Name', true)}
              </Grid>
              <Grid item xs={12} sm={6}>
                {txt('email', 'Email', true)}
              </Grid>
              <Grid item xs={12} sm={6}>
                {txt('phone', 'Phone', true)}
              </Grid>
              <Grid item xs={12} sm={6}>
                <LabeledSelect
                  label="Role"
                  required
                  value={f.values.roleId}
                  onChange={(v) => f.setFieldValue('roleId', v)}
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                  error={bad('roleId')}
                  helper={bad('roleId') ? f.errors.roleId : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
            </Grid>
          </Panel>
        </Grid>
        <Grid item xs={12} md={5}>
          <Panel title="Additional Information">
            <FieldLabel label="Notes (Optional)">
              <TextField name="notes" multiline minRows={5} value={f.values.notes} onChange={(e) => f.setFieldValue('notes', e.target.value.slice(0, 500))} />
            </FieldLabel>
            <Typography variant="caption" sx={{ float: 'right' }} color="text.secondary">
              {f.values.notes.length}/500
            </Typography>
          </Panel>
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#E6F0FF', color: tokens.ink }}>
        <Iconify icon="mdi:information" width={22} sx={{ color: tokens.blue }} />
        <Typography variant="body2">Changing the role will update the user’s permissions based on the selected role.</Typography>
      </Stack>
    </Box>
  );
}
