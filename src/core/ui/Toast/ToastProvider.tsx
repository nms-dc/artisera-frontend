'use client';

import * as React from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';
import { SnackbarProvider } from 'notistack';

// Toasts sit at the top right, just below the app bar so the bell and profile menu stay reachable.
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} autoHideDuration={4000} classes={{ containerRoot: 'app-toasts' }}>
      <GlobalStyles styles={{ '.app-toasts': { top: '72px !important' } }} />
      {children}
    </SnackbarProvider>
  );
}
