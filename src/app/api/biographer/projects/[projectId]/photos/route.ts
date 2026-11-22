import { handle, owner, id } from '@/lib/biographer/http';
import { savePhoto } from '@/lib/biographer/storage';
import { BiographerError } from '@/db/services/biographer';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => {
    const a = await owner();
    if (Number(r.headers.get('content-length')) > 11000000)
      throw new BiographerError('Photograph too large', 413);
    const form = await r.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new BiographerError('Photograph required');
    return savePhoto(
      a.authorId,
      id((await c.params).projectId),
      file,
      String(form.get('caption') ?? ''),
    );
  });
