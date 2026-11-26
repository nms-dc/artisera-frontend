'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import { ShipmentsList } from '@/features/gallery/components/lists';

export default function Page() {
  return (
    <RequirePermission module="shipments" action="view">
      <ShipmentsList />
    </RequirePermission>
  );
}
