'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { addDays } from 'date-fns';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { handleSubmitError } from '@/core/ui/forms';
import { useRecordInteractionMutation, useSnoozeInquiryMutation } from '../../api';
import { dayToDateTime } from '@/lib/dates';
import { combineDateTime } from '../shared';
import type { Inquiry, Method, MoveTo } from '@/lib/types';
import { ymd, FOLLOW_UP_HOUR, MethodPicker, NotesField, HistoryPanel, FollowUpDateField, panelSx, headSx } from './parts';

type Choice = MoveTo | 'Won';
type MoveOption = { to: Choice; title: string; text: string; icon: string; bg: string; border: string; fg: string; heading: string };

const ACTIVE: MoveOption = {
  to: 'Active Conversations',
  title: 'Move to Active Conversations',
  text: 'Select if the client has responded and you are now in discussion.',
  icon: 'mdi:message-text',
  bg: '#EAF8EF',
  border: '#CDEBD6',
  fg: '#1E8E3E',
  heading: tokens.ink,
};
const NURTURE: MoveOption = {
  to: 'Nurture',
  title: 'Move to Nurture',
  text: 'Select if the inquiry is to be kept for future consideration.',
  icon: 'mdi:sprout',
  bg: '#FFF7E0',
  border: '#F5E2A8',
  fg: '#B26A00',
  heading: '#B26A00',
};
const WON: MoveOption = {
  to: 'Won',
  title: 'Mark as Won',
  text: 'Inquiry converted to an order. Opens the sale form directly.',
  icon: 'mdi:trophy-outline',
  bg: '#EAF8EF',
  border: '#CDEBD6',
  fg: '#1E8E3E',
  heading: tokens.ink,
};
const CLOSED: MoveOption = {
  to: 'Lost',
  title: 'Mark as Closed',
  text: 'Select if the inquiry is closed without conversion.',
  icon: 'mdi:close-circle-outline',
  bg: '#FFECEC',
  border: '#F5C6C6',
  fg: '#C62828',
  heading: '#C62828',
};

const MOVES: Record<string, MoveOption[]> = {
  'Touchbase Follow-up': [ACTIVE, NURTURE, CLOSED],
  'Active Conversations': [NURTURE, WON, CLOSED],
};

const CHOICE_COLOR: Record<string, string> = { 'Active Conversations': '#1E8E3E', Nurture: '#B26A00', Lost: '#C62828' };

const remarkLabel = (choice: Choice | ''): string => {
  if (choice === 'Lost') return 'Reason for closing this inquiry';
  if (choice === 'Nurture') return 'Remark for moving to Nurture (Optional)';
  return 'Remark (Optional)';
};

export function InteractionPanel({ inq, defaultMethod, onClose }: { inq: Inquiry; defaultMethod?: Method; onClose: () => void; onSnooze?: () => void }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [save, { isLoading: saving }] = useRecordInteractionMutation();
  const [snooze, { isLoading: snoozing }] = useSnoozeInquiryMutation();
  const isLoading = saving || snoozing;
  const isFollowUp = inq.status === 'Touchbase Follow-up';
  const [method, setMethod] = React.useState<Method>(defaultMethod ?? 'WhatsApp');
  const [nextDate, setNextDate] = React.useState(ymd(addDays(new Date(), 1)));
  const [nurtureDate, setNurtureDate] = React.useState('');
  const [closedDate, setClosedDate] = React.useState(ymd(new Date()));
  const [notes, setNotes] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [choice, setChoice] = React.useState<Choice | ''>('');
  const [noContact, setNoContact] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);
  const toLost = choice === 'Lost';
  const frozen = noContact;
  const toNurture = choice === 'Nurture';
  const nextMissing = toLost ? !closedDate : toNurture ? !nurtureDate : !nextDate;
  const reasonMissing = toLost && !remark.trim();

  const choose = (to: Choice) => {
    if (to === 'Won') {
      router.push(`/inquiries/${inq.id}/won`);
      return;
    }
    setChoice(choice === to ? '' : to);
  };

  const submit = async () => {
    setAttempted(true);
    if (noContact) {
      // Nothing happened with the client: only the next follow-up date changes.
      if (!nextDate) return;
      try {
        await snooze({ id: inq.id, nextFollowUp: combineDateTime(nextDate, FOLLOW_UP_HOUR) }).unwrap();
        enqueueSnackbar('Follow-up date updated', { variant: 'success' });
        onClose();
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
      }
      return;
    }
    if (nextMissing || reasonMissing) return;
    try {
      await save({
        id: inq.id,
        method,
        at: new Date().toISOString(),
        notes: notes.trim() || undefined,
        remark: choice ? remark.trim() || undefined : undefined,
        moveTo: (choice as MoveTo) || undefined,
        nextFollowUp: toLost ? undefined : combineDateTime(toNurture ? nurtureDate : nextDate, FOLLOW_UP_HOUR),
        closedOn: toLost ? dayToDateTime(closedDate) : undefined,
      }).unwrap();
      enqueueSnackbar(choice ? (toLost ? 'Saved — inquiry closed' : `Saved — moved to ${choice}`) : isFollowUp ? 'Follow-up recorded' : 'Conversation recorded', {
        variant: 'success',
      });
      onClose();
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    }
  };

  const primary = noContact ? 'Snooze' : isFollowUp ? 'Save Follow-up' : 'Save Conversation';
  const nextLabel = 'Next Follow-up Date & Time';

  return (
    <Box sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={headSx}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon={isFollowUp ? 'mdi:calendar-check-outline' : 'mdi:message-text'} width={22} sx={{ color: tokens.blue }} />
            <Typography variant="subtitle1">{isFollowUp ? 'Record Touchbase Follow-up (Inline)' : 'Record Active Conversation (Inline)'}</Typography>
          </Stack>
          <Typography variant="caption">
            {isFollowUp
              ? 'Log your follow-up interaction, schedule the next follow-up, or update the inquiry status if needed.'
              : 'Log your interaction with the customer, schedule the next follow-up, and update the inquiry status if needed.'}
          </Typography>
        </Box>
        <Stack alignItems="flex-end" spacing={0.75}>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="contained" color="success" disabled={isLoading} onClick={submit}>
              {primary}
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ textAlign: 'right', maxWidth: 320 }}>
            You have already communicated with the client outside CRM. The current date and time are recorded automatically.
          </Typography>
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ p: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1, opacity: frozen ? 0.45 : 1, pointerEvents: frozen ? 'none' : 'auto' }}>
              <MethodPicker value={method} onChange={setMethod} />
              <FormControlLabel
                sx={{ mt: 1, pointerEvents: 'auto' }}
                control={
                  <Checkbox
                    size="small"
                    checked={noContact}
                    onChange={(e) => {
                      setNoContact(e.target.checked);
                      if (e.target.checked) setChoice('');
                    }}
                  />
                }
                label={<Typography variant="body2">No Email / WhatsApp / Call recorded</Typography>}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box>
                {toLost ? (
                  <FollowUpDateField
                    label="Closed Date"
                    value={closedDate}
                    onChange={setClosedDate}
                    error={attempted && nextMissing}
                    min=""
                    max={ymd(new Date())}
                    hint="Defaults to today. The date this inquiry was closed."
                  />
                ) : toNurture ? (
                  <FollowUpDateField
                    label="Nurture Follow-up Date"
                    value={nurtureDate}
                    onChange={setNurtureDate}
                    error={attempted && nextMissing}
                    hint={attempted && nextMissing ? 'Select the date to revisit this inquiry.' : 'Required. The date this inquiry should be revisited. Reminder time is 9:00 AM.'}
                  />
                ) : (
                  <FollowUpDateField
                    label={nextLabel}
                    value={nextDate}
                    onChange={setNextDate}
                    error={attempted && nextMissing}
                    hint={noContact ? 'Pick the new follow-up date, then press Snooze. Reminder time is 9:00 AM.' : 'Defaults to 1 day from today. Reminder time is 9:00 AM.'}
                  />
                )}
              </Box>
            </Box>
          </Stack>
          {noContact && (
            <Typography variant="body2" sx={{ mb: 1.5, color: tokens.blue }}>
              Nothing is recorded. Set the next follow-up date above and press Snooze; the inquiry and its history stay unchanged.
            </Typography>
          )}
          <Box sx={{ opacity: frozen ? 0.45 : 1, pointerEvents: frozen ? 'none' : 'auto' }}>
            <NotesField value={notes} onChange={setNotes} />
          </Box>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#EEF4FF', borderRadius: 2, opacity: noContact ? 0.45 : 1, pointerEvents: noContact ? 'none' : 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: tokens.ink }}>
              Update Inquiry Status (Optional)
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              {MOVES[inq.status].map((o) => (
                <Box
                  key={o.to}
                  onClick={() => choose(o.to)}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: o.bg,
                    border: `${choice === o.to ? 2 : 1}px solid ${choice === o.to ? o.fg : o.border}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Iconify icon={o.icon} width={26} sx={{ color: o.fg }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: o.heading }}>{o.title}</Typography>
                    <Typography variant="caption">{o.text}</Typography>
                  </Box>
                  {o.to === 'Won' ? (
                    <Button variant="contained" color="success" size="small" disableElevation sx={{ flexShrink: 0, alignSelf: 'center' }}>
                      Mark as Won
                    </Button>
                  ) : (
                    <Radio size="small" checked={choice === o.to} sx={{ p: 0, alignSelf: 'flex-start', color: o.fg, '&.Mui-checked': { color: o.fg } }} />
                  )}
                </Box>
              ))}
            </Stack>
            <Collapse in={Boolean(choice)} unmountOnExit>
              <Box sx={{ mt: 1.5, pl: 1.5, borderLeft: `3px solid ${CHOICE_COLOR[choice] ?? tokens.blue}` }}>
                <NotesField
                  value={remark}
                  onChange={setRemark}
                  label={remarkLabel(choice)}
                  required={toLost}
                  error={attempted && reasonMissing}
                  helper={attempted && reasonMissing ? 'A reason is required' : undefined}
                />
              </Box>
            </Collapse>
          </Box>
        </Box>
        <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
          <HistoryPanel inquiryId={inq.id} title={isFollowUp ? 'Touchbase History' : 'Active Conversation History'} />
        </Box>
      </Stack>
    </Box>
  );
}
