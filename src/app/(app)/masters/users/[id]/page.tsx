'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import UserForm from '@/features/users/components/UserForm';

export default function UserFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="users" action="edit">
      <UserForm id={id} />
    </RequirePermission>
  );
}
