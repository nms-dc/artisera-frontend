'use client';

import * as React from 'react';
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
import { handleSubmitError } from '@/core/ui/forms';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useCreateCustomerMutation, useGetCustomerQuery, useUpdateCustomerMutation } from '../api';
import { useRms } from '@/features/users/api';
import { changedFields } from '@/lib/diff';
import { SOURCES } from '@/lib/constants';
import type { CustomerInput, Customer, CustomerTypeInput } from '@/lib/types';

const schema = Yup.object({
  name: Yup.string().required('Required'),
  customerType: Yup.string().required(),
  status: Yup.string().required(),
  phone: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  location: Yup.string().required('City is required'),
  state: Yup.string().required('State is required'),
  source: Yup.string().required(),
});
const o = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
const Sec = ({ icon, t, children }: { icon: string; t: string; children: React.ReactNode }) => (
  <Panel>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <Iconify icon={icon} width={22} sx={{ color: tokens.blue }} />
      <Typography variant="subtitle1">{t}</Typography>
    </Stack>
    {children}
  </Panel>
);

export default function CustomerForm({ id }: { id: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: c, isLoading } = useGetCustomerQuery(id, { skip: isNew });
  const rms = useRms();
  const [create] = useCreateCustomerMutation();
  const [update] = useUpdateCustomerMutation();

  const f = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: c?.name ?? '',
      customerType: c && (c.customerType === 'Client' || c.customerType === 'Repeat Client') ? 'Client' : 'Prospect',
      status: c?.status ?? 'Active',
      phone: c?.phone ?? '',
      email: c?.email ?? '',
      altPhone: c?.altPhone ?? '',
      address1: c?.address1 ?? '',
      address2: c?.address2 ?? '',
      location: c?.location ?? '',
      state: c?.state ?? '',
      pin: c?.pin ?? '',
      country: c?.country ?? 'India',
      source: c?.source ?? 'Other',
      rmId: c?.rm?.id ?? '',
      notes: c?.notes ?? '',
    },
    validationSchema: schema,
    onSubmit: async (v, { setErrors }) => {
      try {
        if (isNew) {
          // Status is not part of the create contract: the backend starts every customer as Active.
          const { status: _status, ...rest } = v;
          const r = await create({ ...rest, customerType: v.customerType as CustomerTypeInput, rmId: v.rmId || null }).unwrap();
          enqueueSnackbar('Customer created', { variant: 'success' });
          router.push(`/customers/${r.id}`);
        } else {
          // Customer Type is system-managed (Prospect, Client, Repeat Prospect, Repeat Client) and is not editable here.
          // Only changed fields are sent, so unchanged phone / email are not re-checked for uniqueness.
          const { customerType: _systemType, ...changed } = changedFields(v, f.initialValues);
          const { rmId, status, ...plain } = changed;
          const changes: CustomerInput = { ...plain, ...(rmId !== undefined && { rmId: rmId || null }), ...(status !== undefined && { status: status as Customer['status'] }) };
          if (Object.keys(changes).length === 0) {
            enqueueSnackbar('No changes to save', { variant: 'info' });
            return;
          }
          await update({ id, changes }).unwrap();
          enqueueSnackbar('Customer updated', { variant: 'success' });
          router.push(`/customers/${id}`);
        }
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e, setErrors), { variant: 'error' });
      }
    },
  });
  if (!isNew && isLoading) return <CircularProgress />;

  const t = (k: keyof typeof f.values, label: string, req = false) => (
    <FieldLabel label={label} required={req}>
      <TextField
        name={k}
        value={f.values[k]}
        onChange={f.handleChange}
        onBlur={f.handleBlur}
        error={Boolean(f.errors[k] && (f.touched[k] || f.submitCount))}
        helperText={f.errors[k] && (f.touched[k] || f.submitCount) ? (f.errors[k] as string) : undefined}
      />
    </FieldLabel>
  );
  const s = (k: keyof typeof f.values, label: string, options: { value: string; label: string }[], req = false) => (
    <LabeledSelect label={label} required={req} value={String(f.values[k])} onChange={(v) => f.setFieldValue(k, v)} options={options} />
  );

  return (
    <Box component="form" onSubmit={f.handleSubmit}>
      <PageHeader
        crumbs={[{ label: 'Customers', href: '/customers' }, ...(c ? [{ label: c.code, href: `/customers/${id}` }] : []), { label: isNew ? 'New Customer' : 'Edit Customer' }]}
        title={isNew ? 'Add Customer' : 'Edit Customer'}
        subtitle={isNew ? 'Add a new customer. The record will be created in Customer Master.' : 'Update customer information. Changes will be recorded in the audit trail.'}
        actions={
          <>
            <Button variant="outlined" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Changes
            </Button>
          </>
        }
      />
      <Stack spacing={2}>
        <Sec icon="mdi:account-outline" t="Basic Information">
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              {t('name', 'Customer Name', true)}
            </Grid>
            <Grid item xs={12} md={4}>
              {isNew ? (
                s('customerType', 'Customer Type', o(['Prospect', 'Client']), true)
              ) : (
                <FieldLabel label="Customer Type">
                  <TextField value={c?.customerType ?? f.values.customerType} disabled InputProps={{ readOnly: true }} />
                </FieldLabel>
              )}
              <Typography variant="caption" color="text.secondary">
                {isNew
                  ? 'Repeat Prospect and Repeat Client are set automatically from the customer\u2019s history.'
                  : 'Customer Type is set automatically by the system and cannot be changed here.'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              {s('status', 'Status', o(['Active', 'Inactive']), true)}
            </Grid>
          </Grid>
        </Sec>
        <Sec icon="mdi:phone-outline" t="Contact Information">
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              {t('phone', 'Phone', true)}
            </Grid>
            <Grid item xs={12} md={4}>
              {t('email', 'Email', true)}
            </Grid>
            <Grid item xs={12} md={4}>
              {t('altPhone', 'Alternate Phone')}
            </Grid>
          </Grid>
        </Sec>
        <Sec icon="mdi:home-outline" t="Address Information">
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              {t('address1', 'Address Line 1')}
            </Grid>
            <Grid item xs={12} md={3}>
              {t('address2', 'Address Line 2')}
            </Grid>
            <Grid item xs={12} md={2}>
              {t('location', 'City', true)}
            </Grid>
            <Grid item xs={12} md={2}>
              {t('state', 'State', true)}
            </Grid>
            <Grid item xs={12} md={2}>
              {t('pin', 'PIN Code')}
            </Grid>
            <Grid item xs={12} md={3}>
              {t('country', 'Country')}
            </Grid>
          </Grid>
        </Sec>
        <Sec icon="mdi:information-outline" t="Additional Information">
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              {s('source', 'Source', o(Array.from(new Set<string>([...SOURCES, c?.source ?? ''].filter(Boolean)))), true)}
            </Grid>
            <Grid item xs={12} md={3}>
              <FieldLabel label="Original Inquiry">
                <TextField disabled value={c?.originalInquiry?.code ?? '—'} />
              </FieldLabel>
            </Grid>
            <Grid item xs={12} md={3}>
              {s(
                'rmId',
                'Relationship Manager',
                rms.map((u) => ({ value: u.id, label: u.name })),
              )}
            </Grid>
            <Grid item xs={12} md={3}>
              <FieldLabel label="Notes (Internal)">
                <TextField name="notes" multiline minRows={2} value={f.values.notes} onChange={f.handleChange} />
              </FieldLabel>
            </Grid>
          </Grid>
        </Sec>
      </Stack>
    </Box>
  );
}
