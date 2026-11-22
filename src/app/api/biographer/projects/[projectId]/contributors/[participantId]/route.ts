import { body, handle, id, owner } from '@/lib/biographer/http';
import { contributorDetail, manageContributor } from '@/lib/biographer/collaboration';
type Context = { params: Promise<{ projectId: string; participantId: string }> };
export const GET = (_: Request, c: Context) =>
  handle(async () => {
    const a = await owner(true);
    const p = await c.params;
    return contributorDetail(a.authorId, id(p.projectId), id(p.participantId));
  });
export const PATCH = (r: Request, c: Context) =>
  handle(async () => {
    const a = await owner();
    const p = await c.params;
    return manageContributor(a.authorId, id(p.projectId), id(p.participantId), await body(r));
  });
