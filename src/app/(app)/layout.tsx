'use client';

import * as React from 'react';
import AppShell from '@/core/ui/layout/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <React.Suspense fallback={null}>{children}</React.Suspense>
    </AppShell>
  );
}
