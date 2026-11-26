'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import { useSnackbar } from 'notistack';
import { addDays, format } from 'date-fns';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { handleSubmitError } from '@/core/ui/forms';
import { fDate } from '@/lib/formatters';
import { useSnoozeInquiryMutation } from '../../api';
import type { Inquiry } from '@/lib/types';
import DateField from '@/core/ui/DateField';

export function SnoozeDialog({ inq, onClose }: { inq: Inquiry | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [snooze, { isLoading }] = useSnoozeInquiryMutation();
  const [days, setDays] = React.useState('3');
  const [custom, setCustom] = React.useState('');
  React.useEffect(() => {
    if (inq) {
      setDays('3');
      setCustom('');
    }
  }, [inq]);

  const submit = async () => {
    if (!inq) return;
    if (days === 'custom' && !custom) {
      enqueueSnackbar('Pick a date', { variant: 'warning' });
      return;
    }
    const target = days === 'custom' ? new Date(`${custom}T09:00`) : addDays(new Date(), Number(days));
    try {
      await snooze({ id: inq.id, nextFollowUp: target.toISOString() }).unwrap();
      enqueueSnackbar(`Done. Snoozed to ${fDate(target.toISOString())}`, { variant: 'success', autoHideDuration: 1500 });
      onClose();
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <>
      <Dialog open={Boolean(inq)} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogContent sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="mdi:clock-outline" width={26} sx={{ color: tokens.blue }} />
              <Typography variant="h5">Snooze Inquiry</Typography>
            </Stack>
            <IconButton aria-label="Close" onClick={onClose} size="small">
              <Iconify icon="mdi:close" />
            </IconButton>
          </Stack>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Choose a new follow-up date for this inquiry.
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.blue, mb: 1.5 }}>
            The follow-up date will be updated to the selected date.
          </Typography>
          <RadioGroup value={days} onChange={(e) => setDays(e.target.value)}>
            {['1', '3', '7', '14'].map((d) => (
              <Stack key={d} direction="row" alignItems="center">
                <FormControlLabel
                  value={d}
                  control={<Radio size="small" />}
                  label={
                    <b>
                      {d} {d === '1' ? 'Day' : 'Days'}
                    </b>
                  }
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2" sx={{ color: tokens.muted }}>
                  ({fDate(addDays(new Date(), Number(d)).toISOString())})
                </Typography>
              </Stack>
            ))}
            <Stack direction="row" alignItems="center" spacing={1}>
              <FormControlLabel value="custom" control={<Radio size="small" />} label={<b>Custom Date</b>} sx={{ flex: 1 }} />
              <DateField
                value={custom}
                inputProps={{ min: format(addDays(new Date(), 1), 'yyyy-MM-dd') }}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setDays('custom');
                }}
                sx={{ width: 170 }}
              />
            </Stack>
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" fullWidth disabled={isLoading} onClick={submit}>
            Update Follow-up Date
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
