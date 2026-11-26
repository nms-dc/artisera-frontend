'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import MarkAsWon from '@/features/inquiries/components/MarkAsWon';

export default function MarkAsWonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="inquiries" action="view">
      <MarkAsWon id={id} />
    </RequirePermission>
  );
}
