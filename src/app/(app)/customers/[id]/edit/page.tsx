'use client';

import { use } from 'react';
import RequirePermission from '@/core/auth/RequirePermission';
import CustomerForm from '@/features/customers/components/CustomerForm';

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission module="customers" action="edit">
      <CustomerForm id={id} />
    </RequirePermission>
  );
}
