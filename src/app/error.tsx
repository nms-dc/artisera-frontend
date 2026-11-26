'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Something went wrong
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          This page could not be shown. Try again, or go back to the dashboard.
        </Typography>
        <Button variant="contained" onClick={reset} sx={{ mr: 1 }}>
          Try again
        </Button>
        <Button variant="outlined" href="/dashboard">
          Dashboard
        </Button>
      </Box>
    </Box>
  );
}
