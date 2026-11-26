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
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import { useSnackbar } from 'notistack';
import { PageHeader, FieldLabel, LabeledSelect, SearchBox, Pill, RepeatTag, useDebounced } from '@/core/ui/common';
import { fDate, initials } from '@/lib/formatters';
import AmountField from '@/core/ui/AmountField';
import { handleSubmitError } from '@/core/ui/forms';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useAuth } from '@/core/auth/useAuth';
import { ASSIGN_PRIORITIES, INQUIRY_TYPES, SOURCES } from '@/lib/constants';
import { useCreateInquiryMutation } from '../api';
import { useCreateCustomerMutation, useGetCustomersQuery } from '@/features/customers/api';
import { useRms } from '@/features/users/api';
import { useArtistOptions, useCategoryOptions, useCreateMasterMutation, useSubcategoryOptions } from '@/features/masters/api';
import type { Customer, CustomerSummary, CustomerTypeInput, MasterKind, InquiryType, Source, Priority } from '@/lib/types';

const schema = Yup.object({
  customerId: Yup.string().required('Select or create a customer'),
  inquiryType: Yup.string().required('Required'),
  source: Yup.string().required('Required'),
  requirement: Yup.string().required('Describe the product / requirement').max(500),
  quantity: Yup.number().typeError('Enter a number').min(1).required(),
  value: Yup.number().typeError('Enter a number').positive('Must be positive').required('Required'),
  categoryId: Yup.string(),
  subcategoryId: Yup.string(),
  artistId: Yup.string(),
  rmId: Yup.string(),
  priority: Yup.string().required(),
});

const Step = ({ n, title, hint, children, tint }: { n: number; title: React.ReactNode; hint?: string; children: React.ReactNode; tint?: string }) => (
  <Box sx={{ bgcolor: tint ?? '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2, p: 2.5 }}>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
      <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: tokens.blue, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{n}</Box>
      <Typography variant="h6">{title}</Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
    {children}
  </Box>
);

export default function NewInquiry() {
  const router = useRouter();
  const { can } = useAuth();
  const canAssign = can('inquiries', 'assignRm');
  const canAddMaster = can('masters', 'create');
  const { enqueueSnackbar } = useSnackbar();
  const rms = useRms();
  const [createInquiry, { isLoading }] = useCreateInquiryMutation();
  const [createCustomer] = useCreateCustomerMutation();
  const [createMaster] = useCreateMasterMutation();

  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<CustomerSummary | Customer | null>(null);
  const dSearch = useDebounced(search, 300);
  const { data: found } = useGetCustomersQuery({ q: dSearch, pageSize: 5 }, { skip: dSearch.trim().length < 2 });
  const [newCust, setNewCust] = React.useState(false);
  const [nc, setNc] = React.useState({ name: '', phone: '', email: '', location: '', customerType: 'Prospect' as CustomerTypeInput, notes: '' });
  const [ncErr, setNcErr] = React.useState<Record<string, string>>({});
  const [addKind, setAddKind] = React.useState<null | 'categories' | 'subcategories' | 'artists'>(null);
  const [addName, setAddName] = React.useState('');

  const f = useFormik({
    initialValues: {
      customerId: '',
      inquiryType: 'Product Inquiry',
      source: 'Phone / Walk-in',
      requirement: '',
      quantity: '1',
      value: '',
      categoryId: '',
      subcategoryId: '',
      artistId: '',
      rmId: '',
      priority: 'Normal',
      notes: '',
    },
    validationSchema: schema,
    onSubmit: async (v, { setErrors }) => {
      if (canAssign && !v.rmId) {
        f.setFieldError('rmId', 'Select an RM');
        enqueueSnackbar('Select an RM for assignment', { variant: 'warning' });
        return;
      }
      try {
        const created = await createInquiry({
          customerId: v.customerId,
          inquiryType: v.inquiryType as InquiryType,
          source: v.source as Source,
          requirement: v.requirement,
          quantity: Number(v.quantity),
          value: Number(v.value),
          // Optional fields: left out entirely when nothing is selected.
          ...(v.categoryId && { categoryId: v.categoryId }),
          ...(v.subcategoryId && { subcategoryId: v.subcategoryId }),
          artistId: v.artistId || null,
          notes: v.notes,
          ...(canAssign ? { rmId: v.rmId, priority: v.priority as Priority } : {}),
        }).unwrap();
        enqueueSnackbar(`Inquiry ${created.code} created`, { variant: 'success' });
        router.push(`/inquiries/${created.id}`);
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e, setErrors), { variant: 'error' });
      }
    },
  });
  const cats = useCategoryOptions();
  const subs = useSubcategoryOptions(f.values.categoryId || undefined);
  const arts = useArtistOptions();

  // A contact with an earlier inquiry makes this a repeat prospect, so priority defaults to High.
  const isRepeat = Boolean(selected && 'totalInquiries' in selected && selected.totalInquiries > 0);
  const { setFieldValue } = f;
  React.useEffect(() => {
    setFieldValue('priority', isRepeat ? 'High' : 'Normal');
  }, [isRepeat, selected?.id, setFieldValue]);

  const results = dSearch.trim().length >= 2 ? (found?.results ?? []) : [];
  const err = (k: keyof typeof f.values) => Boolean(f.touched[k] && f.errors[k]);

  const saveCustomer = async () => {
    const errs: Record<string, string> = {};
    if (!nc.name.trim()) errs.name = 'Required';
    if (!nc.phone.trim()) errs.phone = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(nc.email)) errs.email = 'Enter a valid email';
    setNcErr(errs);
    if (Object.keys(errs).length) return;
    try {
      const c = await createCustomer({ ...nc, source: 'Other', country: 'India' }).unwrap();
      f.setFieldValue('customerId', c.id);
      setSelected(c);
      setNewCust(false);
      setNc({ name: '', phone: '', email: '', location: '', customerType: 'Prospect', notes: '' });
      setSearch('');
      enqueueSnackbar('Contact created', { variant: 'success' });
    } catch (e) {
      const err = e as { fieldErrors?: Record<string, string[]> };
      if (err.fieldErrors) setNcErr(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])));
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  const saveMaster = async () => {
    if (!addKind || !addName.trim()) return;
    if (addKind === 'subcategories' && !f.values.categoryId) {
      enqueueSnackbar('Select a category first', { variant: 'warning' });
      return;
    }
    const data: Record<string, unknown> = { name: addName.trim() };
    if (addKind === 'categories') data.description = '';
    if (addKind === 'subcategories') {
      data.categoryId = f.values.categoryId;
      data.description = '';
    }
    if (addKind === 'artists') {
      data.categoryId = f.values.categoryId || null;
      data.subcategoryId = f.values.subcategoryId || null;
    }
    try {
      const rec = await createMaster({ kind: addKind as MasterKind, data }).unwrap();
      const field = addKind === 'categories' ? 'categoryId' : addKind === 'subcategories' ? 'subcategoryId' : 'artistId';
      f.setFieldValue(field, rec.id);
      if (addKind === 'categories') f.setFieldValue('subcategoryId', '');
      setAddKind(null);
      setAddName('');
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };
  const addLabel = { categories: 'Category', subcategories: 'Subcategory', artists: 'Artist' };
  const o = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

  return (
    <Box component="form" onSubmit={f.handleSubmit}>
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Inquiries', href: '/inquiries' }, { label: 'New Inquiry' }]}
        title={
          <>
            New Inquiry <span style={{ fontSize: 16, fontWeight: 500 }}>({canAssign ? 'Admin' : 'RM'})</span>
          </>
        }
        subtitle="Create a new inquiry for an existing or new customer"
      />
      <Stack spacing={2}>
        <Step n={1} title="Customer / Contact" hint="Search by name, phone number or email. If no match is found, create a new contact.">
          {!selected && (
            <Box sx={{ position: 'relative' }}>
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name, phone number or email (e.g. Rahul Mehta, 9876543210, rahul@email.com)" />
              {(results.length > 0 || dSearch.trim().length >= 2) && (
                <Box
                  sx={{
                    position: 'absolute',
                    zIndex: 5,
                    left: 0,
                    right: 0,
                    top: 44,
                    bgcolor: '#fff',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 1.5,
                    boxShadow: '0 8px 24px rgba(10,35,66,.12)',
                  }}
                >
                  {results.map((c) => (
                    <Stack
                      key={c.id}
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      onClick={() => {
                        f.setFieldValue('customerId', c.id);
                        setSelected(c);
                        setSearch('');
                      }}
                      sx={{ px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: '#F0F5FF' } }}
                    >
                      <Avatar sx={{ width: 34, height: 34, fontSize: 13, bgcolor: '#8794AD' }}>{initials(c.name)}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <b style={{ color: tokens.ink }}>{c.name}</b>
                        <br />
                        <span style={{ fontSize: 12 }}>
                          {c.email} &nbsp;|&nbsp; {c.phone}
                        </span>
                      </Box>
                      <Box sx={{ width: 150, fontSize: 12 }}>⌖ {c.location ?? '—'}</Box>
                      {c.totalInquiries > 0 && <RepeatTag />}
                      {(c.customerType === 'Client' || c.customerType === 'Repeat Client') && <Pill label={c.customerType} />}
                      {c.customerSince && <span style={{ fontSize: 12 }}>(Since {fDate(c.customerSince)})</span>}
                    </Stack>
                  ))}
                  {results.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                      No matching contact.
                    </Typography>
                  )}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.25, borderTop: `1px solid ${tokens.border}`, bgcolor: '#F7FAFF' }}>
                    <Typography variant="body2">Can’t find the person you’re looking for?</Typography>
                    <Link
                      component="button"
                      type="button"
                      underline="always"
                      onClick={() => {
                        setNc({ ...nc, name: search });
                        setNewCust(true);
                        setSearch('');
                      }}
                    >
                      + Create a new contact
                    </Link>
                  </Stack>
                </Box>
              )}
              {err('customerId') && (
                <Typography variant="caption" color="error">
                  {f.errors.customerId}
                </Typography>
              )}
            </Box>
          )}
          {newCust && !selected && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#F3F8FF', border: '1px solid #C9DCFB', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1">Create New Contact</Typography>
                  <Typography variant="caption">Enter the basic details for the new contact. This will be added to Customer Master.</Typography>
                </Box>
                <IconButton aria-label="Close" size="small" onClick={() => setNewCust(false)}>
                  <Iconify icon="mdi:close" width={18} />
                </IconButton>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FieldLabel label="Name" required>
                    <TextField value={nc.name} error={Boolean(ncErr.name)} helperText={ncErr.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
                  </FieldLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FieldLabel label="Phone Number" required>
                    <TextField value={nc.phone} error={Boolean(ncErr.phone)} helperText={ncErr.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
                  </FieldLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FieldLabel label="Email Address" required>
                    <TextField value={nc.email} error={Boolean(ncErr.email)} helperText={ncErr.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} />
                  </FieldLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FieldLabel label="Location / City">
                    <TextField value={nc.location} onChange={(e) => setNc({ ...nc, location: e.target.value })} />
                  </FieldLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <LabeledSelect
                    label="Customer Type"
                    required
                    value={nc.customerType}
                    onChange={(v) => setNc({ ...nc, customerType: v as CustomerTypeInput })}
                    options={[
                      { value: 'Prospect', label: 'Prospect' },
                      { value: 'Client', label: 'Client' },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FieldLabel label="Notes (Optional)">
                    <TextField multiline minRows={2} value={nc.notes} onChange={(e) => setNc({ ...nc, notes: e.target.value.slice(0, 500) })} />
                  </FieldLabel>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                    <Button variant="outlined" onClick={() => setNewCust(false)}>
                      Cancel
                    </Button>
                    <Button variant="contained" onClick={saveCustomer}>
                      Save Contact
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}
          {selected && (
            <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 1.5, bgcolor: '#E6F0FF', border: `1px solid ${tokens.border}`, borderRadius: 2 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: '#8794AD' }}>{initials(selected.name)}</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, color: tokens.ink }}>{selected.name}</Typography>
                <Stack direction="row" spacing={2} sx={{ fontSize: 12, color: tokens.muted }}>
                  <span>✉ {selected.email}</span>
                  <span>✆ {selected.phone}</span>
                  <span>⌖ {selected.location ?? '—'}</span>
                </Stack>
              </Box>
              {'totalInquiries' in selected && selected.totalInquiries > 0 && <RepeatTag />}
              {'customerType' in selected && (selected.customerType === 'Client' || selected.customerType === 'Repeat Client') && <Pill label={selected.customerType} />}
              <IconButton
                aria-label="Change customer"
                size="small"
                onClick={() => {
                  f.setFieldValue('customerId', '');
                  setSelected(null);
                }}
              >
                <Iconify icon="mdi:close" width={18} />
              </IconButton>
            </Stack>
          )}
        </Step>

        <Step n={2} title="Inquiry Details" hint="Capture the key details of this inquiry. You can add new Category / Subcategory / Artist inline if not found.">
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <LabeledSelect label="Inquiry Type" required value={f.values.inquiryType} onChange={(v) => f.setFieldValue('inquiryType', v)} options={o(INQUIRY_TYPES)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <LabeledSelect label="Source" required value={f.values.source} onChange={(v) => f.setFieldValue('source', v)} options={o(SOURCES)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FieldLabel label="Product / Requirement" required>
                <TextField
                  name="requirement"
                  multiline
                  minRows={3}
                  value={f.values.requirement}
                  onChange={(e) => f.setFieldValue('requirement', e.target.value.slice(0, 500))}
                  onBlur={f.handleBlur}
                  error={err('requirement')}
                  helperText={err('requirement') ? f.errors.requirement : undefined}
                />
                <Typography variant="caption" sx={{ float: 'right' }} color="text.secondary">
                  {f.values.requirement.length}/500
                </Typography>
              </FieldLabel>
            </Grid>
            <Grid item xs={6} md={3}>
              <FieldLabel label="Quantity" required>
                <TextField name="quantity" type="number" value={f.values.quantity} onChange={f.handleChange} />
              </FieldLabel>
            </Grid>
            <Grid item xs={6} md={3}>
              <FieldLabel label="Inquiry Price / Value" required>
                <AmountField
                  name="value"
                  value={f.values.value}
                  onChange={(e) => f.setFieldValue('value', e.target.value)}
                  onBlur={f.handleBlur}
                  error={err('value')}
                  helperText={err('value') ? f.errors.value : undefined}
                  InputProps={{ startAdornment: <Box sx={{ mr: 1, color: tokens.muted }}>₹</Box> }}
                />
              </FieldLabel>
            </Grid>
            <Grid item xs={12} md={4}>
              <LabeledSelect
                label="Category"
                value={f.values.categoryId}
                onChange={(v) => {
                  f.setFieldValue('categoryId', v);
                  f.setFieldValue('subcategoryId', '');
                }}
                options={[{ value: '', label: 'Not specified' }, ...cats.map((c) => ({ value: c.id, label: c.name }))]}
                error={err('categoryId')}
                helper={err('categoryId') ? f.errors.categoryId : undefined}
              />
              {canAddMaster && (
                <Link
                  component="button"
                  type="button"
                  underline="always"
                  sx={{ fontSize: 13, mt: 0.5 }}
                  onClick={() => {
                    setAddKind('categories');
                    setAddName('');
                  }}
                >
                  + Add New Category
                </Link>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <LabeledSelect
                label="Subcategory"
                value={f.values.subcategoryId}
                onChange={(v) => f.setFieldValue('subcategoryId', v)}
                options={[{ value: '', label: 'Not specified' }, ...subs.map((c) => ({ value: c.id, label: c.name }))]}
                error={err('subcategoryId')}
                helper={err('subcategoryId') ? f.errors.subcategoryId : undefined}
              />
              {canAddMaster && (
                <Link
                  component="button"
                  type="button"
                  underline="always"
                  sx={{ fontSize: 13, mt: 0.5 }}
                  onClick={() => {
                    setAddKind('subcategories');
                    setAddName('');
                  }}
                >
                  + Add New Subcategory
                </Link>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <LabeledSelect
                label="Artist"
                value={f.values.artistId}
                onChange={(v) => f.setFieldValue('artistId', v)}
                options={arts.map((c) => ({ value: c.id, label: c.name }))}
                error={err('artistId')}
                helper={err('artistId') ? f.errors.artistId : undefined}
              />
              {canAddMaster && (
                <Link
                  component="button"
                  type="button"
                  underline="always"
                  sx={{ fontSize: 13, mt: 0.5 }}
                  onClick={() => {
                    setAddKind('artists');
                    setAddName('');
                  }}
                >
                  + Add New Artist
                </Link>
              )}
            </Grid>
            {addKind && (
              <Grid item xs={12}>
                <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ p: 2, bgcolor: '#F0FAF3', border: '1px solid #BFE5CB', borderRadius: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <FieldLabel label={`Add New ${addLabel[addKind]}`}>
                      <TextField autoFocus value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={`${addLabel[addKind]} name`} />
                    </FieldLabel>
                  </Box>
                  <Button variant="outlined" onClick={() => setAddKind(null)}>
                    Cancel
                  </Button>
                  <Button variant="contained" onClick={saveMaster}>
                    Save & Use
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </Step>

        {canAssign && (
          <Step
            n={3}
            title={
              <>
                RM Assignment <span style={{ fontSize: 14, fontWeight: 600 }}>(Admin only)</span>
              </>
            }
            hint="Assign a Relationship Manager for this inquiry and set the priority."
            tint="#F5F2FF"
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <LabeledSelect
                  label="RM Name"
                  required
                  value={f.values.rmId}
                  onChange={(v) => f.setFieldValue('rmId', v)}
                  options={rms.map((u) => ({ value: u.id, label: u.name }))}
                  error={Boolean(f.errors.rmId)}
                  helper={f.errors.rmId}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <LabeledSelect
                  label="Priority"
                  required
                  value={f.values.priority}
                  onChange={(v) => f.setFieldValue('priority', v)}
                  options={o(ASSIGN_PRIORITIES)}
                  helper={isRepeat ? 'Repeat prospect: High by default' : 'Normal by default'}
                />
              </Grid>
            </Grid>
          </Step>
        )}

        <Step
          n={canAssign ? 4 : 3}
          title={
            <>
              Initial Notes <span style={{ fontSize: 14, fontWeight: 500 }}>(Optional)</span>
            </>
          }
          hint="Add any additional notes from the customer or internal notes."
        >
          <TextField
            name="notes"
            multiline
            minRows={3}
            value={f.values.notes}
            onChange={(e) => f.setFieldValue('notes', e.target.value.slice(0, 1000))}
            placeholder="Add any additional notes..."
          />
          <Typography variant="caption" sx={{ float: 'right' }} color="text.secondary">
            {f.values.notes.length}/1000
          </Typography>
        </Step>
      </Stack>

      <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2.5 }}>
        <Button variant="outlined" onClick={() => router.push('/inquiries')}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" startIcon={<Iconify icon="mdi:content-save-outline" width={18} />} disabled={isLoading}>
          Save Inquiry
        </Button>
      </Stack>
    </Box>
  );
}
