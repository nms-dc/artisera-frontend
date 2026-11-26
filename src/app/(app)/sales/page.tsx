'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import SalesList from '@/features/gallery/components/SalesList';

export default function Page() {
  return (
    <RequirePermission module="sales" action="view">
      <SalesList />
    </RequirePermission>
  );
}
