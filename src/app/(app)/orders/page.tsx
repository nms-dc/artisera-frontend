'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import { OrdersList } from '@/features/gallery/components/lists';

export default function Page() {
  return (
    <RequirePermission module="orders" action="view">
      <OrdersList />
    </RequirePermission>
  );
}
