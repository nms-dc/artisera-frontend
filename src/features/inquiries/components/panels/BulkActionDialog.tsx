'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { FieldLabel } from '@/core/ui/common';
import { handleSubmitError } from '@/core/ui/forms';
import { useAuth } from '@/core/auth/useAuth';
import { fDate } from '@/lib/formatters';
import { useRms } from '@/features/users/api';
import { useBulkInquiryActionMutation } from '../../api';
import { combineDateTime } from '../shared';
import { FOLLOW_UP_HOUR } from './parts';
import DateField from '@/core/ui/DateField';

export type BulkMode = 'reassign' | 'lost' | 'snooze';
const TITLES: Record<BulkMode, string> = { reassign: 'Assign / Reassign RM', lost: 'Mark as Lost', snooze: 'Snooze to a later date' };
const DAYS = ['1', '3', '7', '14'];

/** Bulk action for selected inquiries (Admin: assign/reassign any open inquiry, snooze/close Nurture ones; RMs can reassign their own Nurture inquiries). One request, applied to every selected row or none. */
export function BulkActionDialog({ mode, ids, onClose, onDone }: { mode: BulkMode | null; ids: string[]; onClose: () => void; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  // An RM reassigning to someone else should not be offered their own name.
  const rms = useRms().filter((r) => !(user?.role === 'RM' && r.id === user.id));
  const [run, { isLoading }] = useBulkInquiryActionMutation();
  const [rmId, setRmId] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [days, setDays] = React.useState('7');
  const [custom, setCustom] = React.useState('');
  const [attempted, setAttempted] = React.useState(false);

  React.useEffect(() => {
    setRmId('');
    setRemark('');
    setDays('7');
    setCustom('');
    setAttempted(false);
  }, [mode]);

  const submit = async () => {
    if (!mode) return;
    setAttempted(true);
    try {
      if (mode === 'reassign') {
        if (!rmId) return;
        await run({ ids, action: 'reassign', rmId }).unwrap();
      } else if (mode === 'lost') {
        if (!remark.trim()) return;
        await run({ ids, action: 'lost', remark: remark.trim() }).unwrap();
      } else {
        const date = days === 'custom' ? custom : format(addDays(new Date(), Number(days)), 'yyyy-MM-dd');
        if (!date) return;
        await run({ ids, action: 'snooze', nextFollowUp: combineDateTime(date, FOLLOW_UP_HOUR) }).unwrap();
      }
      enqueueSnackbar(`${ids.length} inquiries updated`, { variant: 'success' });
      onDone();
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={Boolean(mode)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{mode ? TITLES[mode] : ''}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Applies to {ids.length} selected {ids.length === 1 ? 'inquiry' : 'inquiries'}.
        </Typography>
        {mode === 'reassign' && (
          <FieldLabel label="New RM" required>
            <Select value={rmId} displayEmpty fullWidth error={attempted && !rmId} onChange={(e) => setRmId(e.target.value as string)}>
              <MenuItem value="" disabled>
                Select RM
              </MenuItem>
              {rms.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FieldLabel>
        )}
        {mode === 'lost' && (
          <FieldLabel label="Reason for closing" required>
            <TextField
              multiline
              minRows={3}
              value={remark}
              error={attempted && !remark.trim()}
              helperText={attempted && !remark.trim() ? 'A reason is required' : undefined}
              onChange={(e) => setRemark(e.target.value.slice(0, 500))}
            />
          </FieldLabel>
        )}
        {mode === 'snooze' && (
          <RadioGroup value={days} onChange={(e) => setDays(e.target.value)}>
            {DAYS.map((d) => (
              <Stack key={d} direction="row" alignItems="center">
                <FormControlLabel value={d} control={<Radio size="small" />} label={`${d} ${d === '1' ? 'Day' : 'Days'}`} sx={{ flex: 1 }} />
                <Typography variant="body2">({fDate(addDays(new Date(), Number(d)).toISOString())})</Typography>
              </Stack>
            ))}
            <Stack direction="row" alignItems="center" spacing={1}>
              <FormControlLabel value="custom" control={<Radio size="small" />} label="Custom Date" sx={{ flex: 1 }} />
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
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={isLoading} onClick={submit}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
