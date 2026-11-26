'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import InquirySummary from '@/features/reports/components/InquirySummary';

export default function InquirySummaryPage() {
  return (
    <RequirePermission module="reports" action="view">
      <InquirySummary />
    </RequirePermission>
  );
}
