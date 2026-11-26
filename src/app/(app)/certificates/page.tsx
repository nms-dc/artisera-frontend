'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import { CertificatesList } from '@/features/gallery/components/lists';

export default function Page() {
  return (
    <RequirePermission module="certificates" action="view">
      <CertificatesList />
    </RequirePermission>
  );
}
