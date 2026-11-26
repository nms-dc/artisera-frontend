import InquiryView from '@/features/inquiries/components/InquiryView';

export default async function InquiryViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InquiryView id={id} />;
}
