'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import UsersList from '@/features/users/components/UsersList';

export default function UsersPage() {
  return (
    <RequirePermission module="users" action="view">
      <UsersList />
    </RequirePermission>
  );
}
