'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import OrderDetailView from '@/features/gallery/components/OrderDetailView';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="orders" action="view">
      <OrderDetailView id={id} />
    </RequirePermission>
  );
}
