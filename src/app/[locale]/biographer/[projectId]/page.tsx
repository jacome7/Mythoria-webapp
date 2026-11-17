import BiographerStudio from '@/components/biographer/BiographerStudio';
export default async function BiographerProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <BiographerStudio projectId={projectId} />;
}
