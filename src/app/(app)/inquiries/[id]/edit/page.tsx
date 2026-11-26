'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import InquiryEdit from '@/features/inquiries/components/InquiryEdit';

export default function InquiryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="inquiries" action="edit">
      <InquiryEdit id={id} />
    </RequirePermission>
  );
}
