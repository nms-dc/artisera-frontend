import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ChangePasswordForm from '@/features/auth/components/ChangePasswordForm';

export default function ChangePasswordPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0A2342 0%,#123A6F 100%)' }}>
      <React.Suspense fallback={<CircularProgress />}>
        <ChangePasswordForm />
      </React.Suspense>
    </Box>
  );
}
