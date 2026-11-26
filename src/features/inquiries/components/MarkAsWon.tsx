'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { handleSubmitError } from '@/core/ui/forms';
import { errorMessage } from '@/core/api/errors';
import { useAuth } from '@/core/auth/useAuth';
import { useArtistOptions } from '@/features/masters/api';
import { useGetInquiryQuery, useMarkWonMutation } from '../api';
import { buildSaleInput, initialWonForm, validateAll, wonBlockedReason } from './won/form';
import type { WonErrors, WonFormState } from './won/form';
import { SECTION_IDS, Stepper } from './won/parts';
import { ProductsStep } from './won/ProductsStep';
import { SaleStep } from './won/SaleStep';
import { CertificatePlanSection, PaymentSection, ShipmentSection } from './won/ShipmentStep';

export default function MarkAsWon({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data: inquiry, isLoading, error } = useGetInquiryQuery(id);
  const artists = useArtistOptions();
  const [markWon, { isLoading: saving }] = useMarkWonMutation();

  const [active, setActive] = React.useState(0);
  const [errors, setErrors] = React.useState<WonErrors>({});
  const [form, setForm] = React.useState<WonFormState>(() => initialWonForm());
  const seeded = React.useRef(false);
  const update = React.useCallback((patch: Partial<WonFormState>) => setForm((current) => ({ ...current, ...patch })), []);

  React.useEffect(() => {
    if (inquiry && !seeded.current) {
      seeded.current = true;
      update({ totalValue: String(inquiry.value) });
    }
  }, [inquiry, update]);

  if (isLoading) return <CircularProgress />;
  if (error || !inquiry) return <Typography color="error">{errorMessage(error) ?? 'Inquiry not found.'}</Typography>;

  const blocked = wonBlockedReason(inquiry.status, user?.role === 'ADMIN');
  const goTo = (index: number) => {
    setActive(index);
    document.getElementById(SECTION_IDS[index])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    const found = validateAll(form);
    setErrors(found);
    if (Object.keys(found).length) {
      enqueueSnackbar('Complete the highlighted fields before saving', { variant: 'warning' });
      goTo(Object.keys(found).some((key) => key.startsWith('totalValue') || key.startsWith('saleDate')) ? 0 : Object.keys(found).some((key) => key.includes('-')) ? 1 : 2);
      return;
    }
    try {
      const won = await markWon({ id, sale: buildSaleInput(form) }).unwrap();
      enqueueSnackbar(`${inquiry.code} marked as Won${won.sale ? ` · Sale ${won.sale.saleNumber}` : ''}`, { variant: 'success' });
      // highlight=sale scrolls to the Sale & Fulfilment panel, which shows the new sale number.
      router.push(`/inquiries/${id}?highlight=sale`);
    } catch (err) {
      enqueueSnackbar(handleSubmitError(err), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        crumbs={[{ label: 'Inquiries', href: '/inquiries' }, { label: inquiry.code, href: `/inquiries/${id}` }, { label: 'Mark as Won' }]}
        title={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Iconify icon="mdi:trophy-outline" width={34} sx={{ color: '#F5A623' }} />
            <span>Mark as Won</span>
          </Stack>
        }
        subtitle="Capture sale details and products for this inquiry."
        actions={<Stepper active={active} onSelect={goTo} />}
      />
      {blocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {blocked}
        </Alert>
      )}

      <Stack spacing={2}>
        <Box id={SECTION_IDS[0]} sx={{ scrollMarginTop: 80 }}>
          <SaleStep inquiry={inquiry} form={form} errors={errors} update={update} />
        </Box>
        <Box id={SECTION_IDS[1]} sx={{ scrollMarginTop: 80 }}>
          <ProductsStep form={form} errors={errors} artists={artists} update={update} />
        </Box>
        <Stack id={SECTION_IDS[2]} spacing={2} sx={{ scrollMarginTop: 80 }}>
          <CertificatePlanSection form={form} update={update} />
          <ShipmentSection form={form} errors={errors} update={update} />
          <PaymentSection form={form} update={update} />
        </Stack>
      </Stack>

      <Stack id={SECTION_IDS[3]} direction="row" justifyContent="space-between" sx={{ mt: 2.5, scrollMarginTop: 80 }}>
        <Button variant="outlined" onClick={() => router.push(`/inquiries/${id}`)}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" size="large" disabled={Boolean(blocked) || saving} onClick={submit}>
          Save & Mark as Won
        </Button>
      </Stack>
    </Box>
  );
}
