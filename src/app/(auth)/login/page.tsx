import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LoginForm from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0A2342 0%,#123A6F 100%)' }}>
      <React.Suspense fallback={<CircularProgress />}>
        <LoginForm />
      </React.Suspense>
    </Box>
  );
}
