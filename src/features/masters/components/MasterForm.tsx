'use client';

import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import { PageHeader, Panel, FieldLabel, LabeledSelect } from '@/core/ui/common';
import { handleSubmitError } from '@/core/ui/forms';
import { useCategoryOptions, useSubcategoryOptions, useCreateMasterMutation, useGetMasterRecordQuery, useUpdateMasterMutation } from '../api';
import { MASTER_META } from './MasterList';
import type { MasterKind, Artist, Category, Subcategory } from '@/lib/types';

export default function MasterForm({ kind, id }: { kind: MasterKind; id: string }) {
  const isNew = id === 'new';
  const meta = MASTER_META[kind];
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: rec, isLoading } = useGetMasterRecordQuery({ kind, id }, { skip: isNew });
  const cats = useCategoryOptions();
  const [create] = useCreateMasterMutation();
  const [update] = useUpdateMasterMutation();

  const detail = rec as Partial<Category & Subcategory & Artist> | undefined;
  const isArtist = kind === 'artists';

  const f = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: rec?.name ?? '',
      description: detail?.description ?? '',
      categoryId: detail?.categoryId ?? '',
      subcategoryId: detail?.subcategoryId ?? '',
      status: detail?.status ?? 'Active',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Required'),
      categoryId: kind === 'subcategories' ? Yup.string().required('Required') : Yup.string(),
    }),
    onSubmit: async (v, { setErrors }) => {
      const body: Record<string, unknown> = { name: v.name };
      if (!isArtist) {
        body.status = v.status;
        body.description = v.description;
      }
      if (kind === 'subcategories') body.categoryId = v.categoryId;
      if (isArtist) {
        body.categoryId = v.categoryId || null;
        body.subcategoryId = v.subcategoryId || null;
      }
      try {
        if (isNew) await create({ kind, data: body }).unwrap();
        else await update({ kind, id, changes: body }).unwrap();
        enqueueSnackbar(`${meta.one} saved`, { variant: 'success' });
        router.push(`/masters/${kind}`);
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e, setErrors), { variant: 'error' });
      }
    },
  });
  const subs = useSubcategoryOptions(f.values.categoryId || undefined);
  if (!isNew && isLoading) return <CircularProgress />;
  if (!isNew && !rec) return <Box>Record not found.</Box>;
  const catOptions = cats.map((c) => ({ value: c.id, label: c.name }));
  const subOptions = subs.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Box component="form" onSubmit={f.handleSubmit}>
      <PageHeader
        crumbs={[{ label: 'Masters', href: '/masters' }, { label: meta.title, href: `/masters/${kind}` }, { label: isNew ? `Add ${meta.one}` : `Edit ${meta.one}` }]}
        title={isNew ? `Add ${meta.one}` : `Edit ${meta.one}`}
        subtitle={isNew ? `Create a new ${meta.one.toLowerCase()}.` : meta.edit}
        actions={
          <>
            <Button variant="outlined" onClick={() => router.push(`/masters/${kind}`)}>
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
          <Grid item xs={12} md={6}>
            <FieldLabel label={`${meta.one} Name`} required>
              <TextField
                name="name"
                value={f.values.name}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                error={Boolean(f.touched.name && f.errors.name)}
                helperText={f.touched.name ? (f.errors.name as string) : undefined}
              />
            </FieldLabel>
          </Grid>
          {kind !== 'categories' && (
            <Grid item xs={12} md={6}>
              <LabeledSelect
                label={isArtist ? 'Category (optional)' : 'Category'}
                required={!isArtist}
                value={f.values.categoryId}
                onChange={(v) => {
                  f.setFieldValue('categoryId', v);
                  if (isArtist) f.setFieldValue('subcategoryId', '');
                }}
                options={catOptions}
                error={Boolean(f.touched.categoryId && f.errors.categoryId)}
                helper={f.touched.categoryId ? (f.errors.categoryId as string) : undefined}
              />
            </Grid>
          )}
          {isArtist && (
            <Grid item xs={12} md={6}>
              <LabeledSelect
                label="Subcategory (optional)"
                value={f.values.subcategoryId}
                onChange={(v) => f.setFieldValue('subcategoryId', v)}
                options={[{ value: '', label: '— None —' }, ...subOptions]}
              />
            </Grid>
          )}
          {kind !== 'artists' && (
            <Grid item xs={12}>
              <FieldLabel label="Description">
                <TextField name="description" multiline minRows={3} value={f.values.description} onChange={f.handleChange} />
              </FieldLabel>
            </Grid>
          )}
          {!isArtist && (
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
          )}
        </Grid>
      </Panel>
    </Box>
  );
}
