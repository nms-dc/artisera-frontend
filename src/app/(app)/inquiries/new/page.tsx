'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import NewInquiry from '@/features/inquiries/components/NewInquiry';

export default function NewInquiryPage() {
  return (
    <RequirePermission module="inquiries" action="create">
      <NewInquiry />
    </RequirePermission>
  );
}
