'use client';

import { use } from 'react';
import { redirect } from 'next/navigation';

/** Orders are now created on the sale screen itself (Select + Group columns). Old links land there. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  redirect(`/sales/${id}`);
}
