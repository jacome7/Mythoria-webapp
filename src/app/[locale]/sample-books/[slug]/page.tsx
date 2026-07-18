import SampleBookDetailPage from '@/components/SampleBookDetailPage';

export default async function SampleBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SampleBookDetailPage slug={slug} />;
}
