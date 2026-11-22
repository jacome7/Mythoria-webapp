import { handle } from '@/lib/biographer/http';
import { guestSavePhoto, requireGuestOrigin } from '@/lib/biographer/collaboration';
import { BiographerError } from '@/db/services/biographer';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    if (Number(r.headers.get('content-length')) > 11000000)
      throw new BiographerError('Photograph too large', 413);
    const form = await r.formData();
    const file = form.get('file');
    const caption = form.get('caption');
    if (!(file instanceof File)) throw new BiographerError('Photo required');
    return guestSavePhoto(file, typeof caption === 'string' ? caption : '');
  });
