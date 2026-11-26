'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import RmDashboard from '@/features/dashboard/components/RmDashboard';
import RmViewBanner from '@/features/dashboard/components/RmViewBanner';

export default function RmWorkspaceDashboardPage({ params }: { params: Promise<{ rmId: string }> }) {
  const { rmId } = use(params);
  return (
    <RequirePermission module="inquiries" action="assignRm">
      <RmViewBanner rmId={rmId} />
      <RmDashboard rmId={rmId} readOnly />
    </RequirePermission>
  );
}
