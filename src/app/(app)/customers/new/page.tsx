'use client';

import RequirePermission from '@/core/auth/RequirePermission';
import CustomerForm from '@/features/customers/components/CustomerForm';

export default function NewCustomerPage() {
  return (
    <RequirePermission module="customers" action="create">
      <CustomerForm id="new" />
    </RequirePermission>
  );
}
