'use client';

import { useRouter, usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useRms } from '@/features/users/api';

export default function RmViewBanner({ rmId }: { rmId: string }) {
  const router = useRouter();
  const path = usePathname() ?? '';
  const rm = useRms().find((r) => r.id === rmId);
  const onInq = path.endsWith('/inquiries');
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ md: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 2.5, p: 1.5, px: 2, borderRadius: 2, bgcolor: '#FFF7E0', border: '1px solid #F5D98B' }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Iconify icon="mdi:eye-outline" width={22} sx={{ color: '#B26A00' }} />
        <Box>
          <Typography sx={{ fontWeight: 700, color: tokens.ink, fontSize: 14 }}>Viewing {rm?.name ?? 'Relationship Manager'} — read-only</Typography>
          <Typography variant="caption">You can see everything this RM sees. Actions (touchbase, follow-up, snooze, close) are disabled.</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant={onInq ? 'outlined' : 'contained'} onClick={() => router.push(`/rm/${rmId}`)}>
          Dashboard
        </Button>
        <Button size="small" variant={onInq ? 'contained' : 'outlined'} onClick={() => router.push(`/rm/${rmId}/inquiries`)}>
          Inquiries
        </Button>
        <Button size="small" color="inherit" onClick={() => router.push('/dashboard')}>
          Exit
        </Button>
      </Stack>
    </Stack>
  );
}
