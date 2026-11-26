'use client';

import { useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { PageHeader } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useAuth } from '@/core/auth/useAuth';

const CARDS: { kind: string; title: string; text: string; icon: string; bg: string; fg: string; btn: string; admin?: boolean }[] = [
  {
    kind: 'categories',
    title: 'Categories',
    text: 'Manage high level art categories used in inquiries.',
    icon: 'mdi:view-grid-outline',
    bg: '#FFE3EC',
    fg: '#E91E63',
    btn: 'Manage Categories',
  },
  {
    kind: 'subcategories',
    title: 'Subcategories',
    text: 'Manage subcategories under each category.',
    icon: 'mdi:format-list-bulleted',
    bg: '#EADCFF',
    fg: '#7C4DFF',
    btn: 'Manage Subcategories',
  },
  { kind: 'artists', title: 'Artists', text: 'Manage artists available in the system.', icon: 'mdi:account-outline', bg: '#DDF5E3', fg: '#1E8E3E', btn: 'Manage Artists' },
  {
    kind: 'roles',
    title: 'Roles',
    text: 'Manage user roles and their access permissions.',
    icon: 'mdi:shield-account-outline',
    bg: '#E3EDFF',
    fg: '#1665F5',
    btn: 'Manage Roles',
    admin: true,
  },
  {
    kind: 'users',
    title: 'Users',
    text: 'Manage system users and their roles.',
    icon: 'mdi:account-group-outline',
    bg: '#FFF1D6',
    fg: '#B26A00',
    btn: 'Manage Users',
    admin: true,
  },
];

export default function MastersHome() {
  const router = useRouter();
  const { can } = useAuth();
  return (
    <Box>
      <PageHeader title="Masters" subtitle="Manage categories, subcategories and artists used in inquiries." />
      <Grid container spacing={2.5}>
        {CARDS.filter((c) => !c.admin || can('users', 'view')).map((c) => (
          <Grid item xs={12} md={4} lg={3} key={c.kind}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: c.bg, color: c.fg, display: 'grid', placeItems: 'center', mx: 'auto', mb: 2 }}>
                <Iconify icon={c.icon} width={28} />
              </Box>
              <Typography variant="h6" sx={{ mt: 3 }}>
                {c.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, minHeight: 40, color: tokens.muted }}>
                {c.text}
              </Typography>
              <Button fullWidth variant="outlined" endIcon={<Iconify icon="mdi:arrow-right" width={16} />} onClick={() => router.push(`/masters/${c.kind}`)}>
                {c.btn}
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
