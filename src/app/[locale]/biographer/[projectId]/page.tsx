import BiographerStudio from '@/components/biographer/BiographerStudio';
import { biographerCollaborationEnabled } from '@/lib/biographer/validation';

export default async function BiographerProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <BiographerStudio
      projectId={projectId}
      collaborationEnabled={biographerCollaborationEnabled()}
    />
  );
}
