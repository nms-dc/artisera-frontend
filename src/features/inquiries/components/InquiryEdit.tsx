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
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import { PageHeader, Panel, FieldLabel, LabeledSelect, Pill } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { handleSubmitError } from '@/core/ui/forms';
import { PRIORITIES, SOURCES } from '@/lib/constants';
import { useGetInquiryQuery, useUpdateInquiryMutation } from '../api';
import { useAuth } from '@/core/auth/useAuth';
import { useRms } from '@/features/users/api';
import { useArtistOptions, useCategoryOptions, useSubcategoryOptions } from '@/features/masters/api';
import AmountField from '@/core/ui/AmountField';
import { changedFields } from '@/lib/diff';
import type { InquiryInput, Priority, Source } from '@/lib/types';

const makeSchema = (rmRequired: boolean) =>
  Yup.object({
    rmId: rmRequired ? Yup.string().required('Required') : Yup.string(),
    requirement: Yup.string().required('Required'),
    categoryId: Yup.string(),
    subcategoryId: Yup.string(),
    value: Yup.number().typeError('Enter a number').positive('Must be positive').required('Required'),
    priority: Yup.string().required(),
    source: Yup.string().required(),
  });
type FormValues = {
  requirement: string;
  categoryId: string;
  subcategoryId: string;
  artistId: string;
  value: string;
  priority: string;
  rmId: string;
  source: string;
  quantity: string;
  expectedTimeline: string;
  notes: string;
};

/**
 * Builds the PATCH body from the changed form fields only. Priority and RM are Admin-only fields, so they are
 * sent only when the user can assign. Category and subcategory travel together, because a subcategory must belong to its category.
 */
function toChanges(changed: Partial<FormValues>, values: FormValues, canAssign: boolean): Partial<InquiryInput> {
  const categoryTouched = changed.categoryId !== undefined || changed.subcategoryId !== undefined;
  return {
    ...(changed.requirement !== undefined && { requirement: changed.requirement }),
    ...(categoryTouched && { categoryId: values.categoryId || null, subcategoryId: values.subcategoryId || null }),
    ...(changed.artistId !== undefined && { artistId: changed.artistId || null }),
    ...(changed.value !== undefined && { value: Number(changed.value) }),
    ...(changed.source !== undefined && { source: changed.source as Source }),
    ...(changed.quantity !== undefined && { quantity: Number(changed.quantity) }),
    ...(changed.expectedTimeline !== undefined && { expectedTimeline: changed.expectedTimeline }),
    ...(changed.notes !== undefined && { notes: changed.notes }),
    ...(canAssign && changed.priority !== undefined && { priority: changed.priority as Priority }),
    ...(canAssign && changed.rmId !== undefined && changed.rmId !== '' && { rmId: changed.rmId }),
  };
}
const o = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
const Title = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
    <Iconify icon={icon} width={22} sx={{ color: tokens.blue }} />
    <Typography variant="subtitle1">{children}</Typography>
  </Stack>
);
const ReadOnly = ({ label, value }: { label: string; value?: string | null }) => (
  <FieldLabel label={label}>
    <TextField disabled value={value ?? ''} />
  </FieldLabel>
);

export default function InquiryEdit({ id }: { id: string }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: inq } = useGetInquiryQuery(id);
  const { can } = useAuth();
  const canAssign = can('inquiries', 'assignRm');
  const rms = useRms();
  const [categoryId, setCategoryId] = React.useState<string | undefined>();
  const cats = useCategoryOptions();
  const subs = useSubcategoryOptions(categoryId);
  const arts = useArtistOptions();
  const [update, { isLoading }] = useUpdateInquiryMutation();

  const f = useFormik<FormValues>({
    enableReinitialize: true,
    initialValues: {
      requirement: inq?.requirement ?? '',
      categoryId: inq?.category?.id ?? '',
      subcategoryId: inq?.subcategory?.id ?? '',
      artistId: inq?.artist?.id ?? '',
      value: String(inq?.value ?? ''),
      priority: inq?.priority ?? 'Normal',
      rmId: inq?.rm?.id ?? '',
      source: inq?.source ?? 'Website',
      quantity: String(inq?.quantity ?? 1),
      expectedTimeline: inq?.expectedTimeline ?? '',
      notes: inq?.notes ?? '',
    },
    validationSchema: makeSchema(canAssign),
    onSubmit: async (v, { setErrors }) => {
      const changes = toChanges(changedFields<FormValues>(v, f.initialValues), v, canAssign);
      if (Object.keys(changes).length === 0) {
        enqueueSnackbar('No changes to save', { variant: 'info' });
        router.push(`/inquiries/${id}`);
        return;
      }
      try {
        await update({ id, changes }).unwrap();
        enqueueSnackbar('Inquiry updated', { variant: 'success' });
        router.push(`/inquiries/${id}`);
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e, setErrors), { variant: 'error' });
      }
    },
  });
  React.useEffect(() => {
    setCategoryId(f.values.categoryId || undefined);
  }, [f.values.categoryId]);
  if (!inq) return <CircularProgress />;

  const err = (k: keyof typeof f.values) => Boolean(f.errors[k] && (f.touched[k] || f.submitCount));
  const txt = (k: keyof typeof f.values, label: string, req = false, extra: Partial<TextFieldProps> = {}) => (
    <FieldLabel label={label} required={req}>
      <TextField name={k} value={f.values[k]} onChange={f.handleChange} onBlur={f.handleBlur} error={err(k)} helperText={err(k) ? (f.errors[k] as string) : undefined} {...extra} />
    </FieldLabel>
  );
  const sel = (k: keyof typeof f.values, label: string, options: { value: string; label: string }[], req = false, disabled = false) => (
    <LabeledSelect
      label={label}
      required={req}
      disabled={disabled}
      value={String(f.values[k])}
      onChange={(v) => f.setFieldValue(k, v)}
      options={options}
      error={err(k)}
      helper={err(k) ? (f.errors[k] as string) : undefined}
    />
  );
  const c = inq.customer;
  const address = [c.address1, c.address2, c.pin, c.country].filter(Boolean).join(', ');

  return (
    <Box component="form" onSubmit={f.handleSubmit}>
      <PageHeader
        crumbs={[{ label: 'Inquiries', href: '/inquiries' }, { label: inq.code, href: `/inquiries/${id}` }, { label: 'Edit' }]}
        title="Edit Inquiry"
        subtitle={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <b style={{ color: tokens.ink }}>{inq.code}</b>
            <Pill label={inq.status} />
          </Stack>
        }
        actions={
          <>
            <Button variant="outlined" onClick={() => router.push(`/inquiries/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isLoading}>
              Save Changes
            </Button>
          </>
        }
      />
      <Stack spacing={2}>
        <Panel>
          <Title icon="mdi:account-outline">Customer Information (Read Only)</Title>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <ReadOnly label="Customer Name" value={c.name} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ReadOnly label="Phone" value={c.phone} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ReadOnly label="Email" value={c.email} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ReadOnly label="Location" value={[c.location, c.state].filter(Boolean).join(', ')} />
                </Grid>
                {address && (
                  <Grid item xs={12}>
                    <ReadOnly label="Address" value={address} />
                  </Grid>
                )}
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1} alignItems="center" sx={{ color: tokens.muted, textAlign: 'center', px: 2 }}>
                <Iconify icon="mdi:lock-outline" width={32} />
                <Typography variant="body2">Customer details are managed in Customer Master and cannot be edited here.</Typography>
              </Stack>
            </Grid>
          </Grid>
        </Panel>
        <Panel>
          <Title icon="mdi:file-document-outline">Inquiry Information</Title>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {txt('requirement', 'Requirement / Description', true, { multiline: true, minRows: 4 })}
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <LabeledSelect
                    label="Category"
                    value={f.values.categoryId}
                    onChange={(v) => {
                      f.setFieldValue('categoryId', v);
                      f.setFieldValue('subcategoryId', '');
                    }}
                    options={[{ value: '', label: 'Not specified' }, ...cats.map((x) => ({ value: x.id, label: x.name }))]}
                    error={err('categoryId')}
                    helper={err('categoryId') ? f.errors.categoryId : undefined}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {sel('subcategoryId', 'Subcategory', [{ value: '', label: 'Not specified' }, ...subs.map((x) => ({ value: x.id, label: x.name }))])}
                </Grid>
                <Grid item xs={12}>
                  {sel('artistId', 'Artist', [{ value: '', label: 'Not specified' }, ...arts.map((x) => ({ value: x.id, label: x.name }))])}
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <FieldLabel label="Inquiry Value (₹)" required>
                <AmountField
                  name="value"
                  value={f.values.value}
                  onChange={(e) => f.setFieldValue('value', e.target.value)}
                  onBlur={f.handleBlur}
                  error={err('value')}
                  helperText={err('value') ? f.errors.value : undefined}
                />
              </FieldLabel>
            </Grid>
            <Grid item xs={12} md={6}>
              {sel('priority', 'Priority', o(PRIORITIES), true, !canAssign)}
            </Grid>
            <Grid item xs={12} md={6}>
              {sel('source', 'Source', o(SOURCES), true)}
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {canAssign && (
                  <Grid item xs={12} sm={6}>
                    {sel(
                      'rmId',
                      'Assigned RM',
                      rms.map((x) => ({ value: x.id, label: x.name })),
                      true,
                    )}
                  </Grid>
                )}
                <Grid item xs={12} sm={canAssign ? 6 : 12}>
                  <FieldLabel label="Status" required>
                    <TextField disabled value={inq.status} />
                  </FieldLabel>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Panel>
        <Panel>
          <Title icon="mdi:format-list-bulleted">Additional Details</Title>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {txt('quantity', 'Quantity', false, { type: 'number' })}
            </Grid>
            <Grid item xs={12} md={6}>
              {sel('expectedTimeline', 'Expected Purchase Timeline', o(['Within 1 month', 'Within 3 months', 'Within 6 months', 'Not decided']))}
            </Grid>
            <Grid item xs={12}>
              {txt('notes', 'Notes (Internal)', false, { multiline: true, minRows: 3 })}
            </Grid>
          </Grid>
        </Panel>
      </Stack>
    </Box>
  );
}
