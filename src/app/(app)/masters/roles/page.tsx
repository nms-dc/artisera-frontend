'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import RolesList from '@/features/roles/components/RolesList';

export default function RolesPage() {
  return (
    <RequirePermission module="users" action="view">
      <RolesList />
    </RequirePermission>
  );
}
