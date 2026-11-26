'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import InquiryDetailReport from '@/features/reports/components/InquiryDetailReport';

export default function InquiryDetailPage() {
  return (
    <RequirePermission module="reports" action="view">
      <InquiryDetailReport />
    </RequirePermission>
  );
}
