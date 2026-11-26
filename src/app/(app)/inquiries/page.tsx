'use client';

import { useAuth } from '@/core/auth/useAuth';
import RequirePermission from '@/core/auth/RequirePermission';
import AdminInquiries from '@/features/inquiries/components/AdminInquiries';
import RmInquiries from '@/features/inquiries/components/RmInquiries';

export default function InquiriesPage() {
  const { user } = useAuth();
  return (
    <RequirePermission module="inquiries" action="view">
      {user?.role === 'ADMIN' ? <AdminInquiries /> : <RmInquiries />}
    </RequirePermission>
  );
}
