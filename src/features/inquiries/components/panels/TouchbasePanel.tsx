'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useSnackbar } from 'notistack';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { handleSubmitError } from '@/core/ui/forms';
import { useRecordTouchbaseMutation } from '../../api';
import type { Inquiry, Method } from '@/lib/types';
import { MethodPicker, NotesField, panelSx, headSx } from './parts';

export function TouchbasePanel({ inq, defaultMethod, onClose }: { inq: Inquiry; defaultMethod?: Method; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [save, { isLoading }] = useRecordTouchbaseMutation();
  const [method, setMethod] = React.useState<Method>(defaultMethod ?? 'WhatsApp');
  const [notes, setNotes] = React.useState('');

  const submit = async () => {
    try {
      await save({ id: inq.id, method, at: new Date().toISOString(), notes: notes.trim() || undefined }).unwrap();
      enqueueSnackbar('Touchbase recorded', { variant: 'success' });
      onClose();
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  return (
    <Box sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={headSx}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Iconify icon="mdi:message-text-outline" width={22} sx={{ color: tokens.blue }} />
          <Typography variant="subtitle1">Record Touchbase (Inline)</Typography>
        </Stack>
        <Typography variant="caption" sx={{ textAlign: 'right', maxWidth: 340 }}>
          You have already communicated with the client outside CRM. Please record the details of your touchbase below.
        </Typography>
      </Stack>
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 2, maxWidth: 480 }}>
          <MethodPicker value={method} onChange={setMethod} />
          <Typography variant="caption" color="text.secondary">
            The current date and time are recorded automatically.
          </Typography>
        </Box>
        <NotesField value={notes} onChange={setNotes} />
      </Box>
      <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ px: 2, py: 1.5, borderTop: '1px solid #C9DCFB', bgcolor: '#E7F0FF' }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" color="success" size="large" disabled={isLoading} onClick={submit}>
          Save Touchbase
        </Button>
      </Stack>
    </Box>
  );
}
