'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '@/core/ui/ConfirmDialog';
import Iconify from '@/core/ui/Iconify';
import { handleSubmitError } from '@/core/ui/forms';
import { tokens } from '@/core/theme/palette';
import { useDeleteOrderMediaMutation, useUploadOrderMediaMutation } from '../../api';
import { MediaDropzone } from '../shared';
import type { MediaKind, OrderMedia } from '@/lib/types';

type Props = { orderId: string; kind: MediaKind; media: OrderMedia[]; locked: boolean };

export function MediaGrid({ orderId, kind, media, locked }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [upload] = useUploadOrderMediaMutation();
  const [remove] = useDeleteOrderMediaMutation();
  const items = media.filter((m) => m.kind === kind);
  // Removing a file asks first, so a stray click on the × cannot make a photo disappear.
  const [removing, setRemoving] = React.useState<OrderMedia | null>(null);

  const addFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        await upload({ id: orderId, file, kind }).unwrap();
      } catch (e) {
        enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
      }
    }
  };

  return (
    <Stack spacing={1.5}>
      {items.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
          {items.map((m) => (
            <Box key={m.id} sx={{ position: 'relative', width: 140, height: 96, borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${tokens.border}`, bgcolor: '#000' }}>
              {m.type === 'video' ? (
                <Box component="video" src={m.url} muted sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Box component="img" src={m.url} alt={m.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {m.type === 'video' && <Iconify icon="mdi:play-circle" width={34} sx={{ position: 'absolute', inset: 0, m: 'auto', color: '#fff' }} />}
              {!locked && (
                <IconButton
                  size="small"
                  aria-label={`Remove ${m.fileName}`}
                  onClick={() => setRemoving(m)}
                  sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255,255,255,.9)' }}
                >
                  <Iconify icon="mdi:close" width={16} />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      )}
      {!locked && <MediaDropzone onFiles={addFiles} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this file?"
        message={`${removing?.fileName ?? 'This file'} will be removed from the order. This is recorded in the order activity.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          const m = removing;
          setRemoving(null);
          if (!m) return;
          try {
            await remove({ id: orderId, mediaId: m.id }).unwrap();
          } catch (e) {
            enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
          }
        }}
        onCancel={() => setRemoving(null)}
      />
    </Stack>
  );
}
