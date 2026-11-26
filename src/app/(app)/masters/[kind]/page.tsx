import { notFound } from 'next/navigation';
import MasterList from '@/features/masters/components/MasterList';
import type { MasterKind } from '@/lib/types';

const KINDS = ['categories', 'subcategories', 'artists'];

export default async function MasterListPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind)) notFound();
  return <MasterList kind={kind as MasterKind} />;
}
