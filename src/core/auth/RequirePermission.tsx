'use client';

import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAuth } from './useAuth';
import type { PermissionAction, PermissionModule } from '@/lib/types';

export default function RequirePermission({ module, action, children }: { module: PermissionModule; action: PermissionAction; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(module, action)) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          403 — Not allowed
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Your role does not have access to this page.
        </Typography>
        <Button component={NextLink} href="/dashboard" variant="contained">
          Back to dashboard
        </Button>
      </Box>
    );
  }
  return <>{children}</>;
}
