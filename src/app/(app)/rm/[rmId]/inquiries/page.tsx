'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import RmInquiries from '@/features/inquiries/components/RmInquiries';
import RmViewBanner from '@/features/dashboard/components/RmViewBanner';

export default function RmWorkspaceInquiriesPage({ params }: { params: Promise<{ rmId: string }> }) {
  const { rmId } = use(params);
  return (
    <RequirePermission module="inquiries" action="assignRm">
      <RmViewBanner rmId={rmId} />
      <RmInquiries rmId={rmId} readOnly />
    </RequirePermission>
  );
}
