'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import RoleForm from '@/features/roles/components/RoleForm';

export default function RoleFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="users" action="edit">
      <RoleForm id={id} />
    </RequirePermission>
  );
}
