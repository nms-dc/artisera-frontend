'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import SaleDetailView from '@/features/gallery/components/SaleDetailView';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="sales" action="view">
      <SaleDetailView id={id} />
    </RequirePermission>
  );
}
