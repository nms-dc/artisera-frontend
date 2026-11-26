'use client';

import * as React from 'react';
import { addDays } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { FieldLabel } from '@/core/ui/common';
import { handleSubmitError } from '@/core/ui/forms';
import { useChangeStatusMutation } from '../../api';
import { combineDateTime } from '../shared';
import { ymd } from './parts';
import type { Inquiry, MoveTo } from '@/lib/types';
import DateField from '@/core/ui/DateField';

const REMARK_MAX = 500;

const TITLES: Record<MoveTo, string> = {
  'Active Conversations': 'Move to Active Conversations',
  Nurture: 'Move to Nurture',
  Lost: 'Mark as Closed',
};

export function StatusDialog({ inq, status, onClose }: { inq: Inquiry | null; status: MoveTo | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [change, { isLoading }] = useChangeStatusMutation();
  const [remark, setRemark] = React.useState('');
  const [next, setNext] = React.useState(ymd(addDays(new Date(), 1)));
  const [attempted, setAttempted] = React.useState(false);

  React.useEffect(() => {
    setRemark('');
    setNext(status === 'Nurture' ? '' : ymd(addDays(new Date(), 1)));
    setAttempted(false);
  }, [inq, status]);

  const isLost = status === 'Lost';
  const needsDate = !isLost;
  const reasonMissing = isLost && !remark.trim();
  const dateMissing = needsDate && !next;

  const submit = async () => {
    setAttempted(true);
    if (reasonMissing || dateMissing) return;
    try {
      await change({ id: inq!.id, status: status!, remark: remark.trim() || undefined, nextFollowUp: needsDate ? combineDateTime(next, '10:00') : undefined }).unwrap();
      enqueueSnackbar(isLost ? `${inq!.code} closed` : `${inq!.code} moved to ${status}`, { variant: 'success' });
      onClose();
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={Boolean(inq && status)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {status ? TITLES[status] : ''} — {inq?.code}
        </Typography>
        {needsDate && (
          <Box sx={{ mb: 1.5 }}>
            <FieldLabel label={status === 'Nurture' ? 'Next Follow-up Date (when to revisit)' : 'Next Follow-up Date'} required>
              <DateField
                value={next}
                error={attempted && dateMissing}
                helperText={attempted && dateMissing ? 'Select the date' : undefined}
                onChange={(e) => setNext(e.target.value)}
              />
            </FieldLabel>
          </Box>
        )}
        <FieldLabel label={isLost ? 'Reason for closing this inquiry' : 'Remark (Optional)'} required={isLost}>
          <TextField
            multiline
            minRows={3}
            value={remark}
            error={attempted && reasonMissing}
            helperText={attempted && reasonMissing ? 'A reason is required' : `${remark.length}/${REMARK_MAX}`}
            onChange={(e) => setRemark(e.target.value.slice(0, REMARK_MAX))}
          />
        </FieldLabel>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" color={isLost ? 'error' : 'primary'} disabled={isLoading} onClick={submit}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
