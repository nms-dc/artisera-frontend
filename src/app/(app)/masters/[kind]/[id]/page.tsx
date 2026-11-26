'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import RequirePermission from '@/core/auth/RequirePermission';
import MasterForm from '@/features/masters/components/MasterForm';
import type { MasterKind } from '@/lib/types';

const KINDS = ['categories', 'subcategories', 'artists'];

export default function MasterFormPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { id, kind } = use(params);
  if (!KINDS.includes(kind)) notFound();
  return (
    <RequirePermission module="masters" action={id === 'new' ? 'create' : 'edit'}>
      <MasterForm kind={kind as MasterKind} id={id} />
    </RequirePermission>
  );
}
