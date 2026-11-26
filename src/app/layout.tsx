import * as React from 'react';
import type { Metadata } from 'next';
import ThemeProvider from '@/core/theme/ThemeProvider';
import ToastProvider from '@/core/ui/Toast/ToastProvider';
import StoreProvider from '@/store/StoreProvider';
import AuthProvider from '@/core/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Artisera CRM',
  description: 'Artisera CRM — inquiries, customers, orders and shipments for Relationship Managers, Gallery Managers and Admins',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
