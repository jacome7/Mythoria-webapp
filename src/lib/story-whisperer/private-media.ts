import { Storage } from '@google-cloud/storage';
import { BiographerError } from '@/db/services/biographer';

export function privateWhispererBucket() {
  const name = process.env.BIOGRAPHER_STORAGE_BUCKET;
  if (!name) throw new BiographerError('Private media storage unavailable', 503);
  return new Storage().bucket(name);
}

export function whispererDraftMediaPrefix(draftId: string) {
  return `${draftId}/inputs/whisperer-`;
}

export async function deleteWhispererDraftMedia(draftId: string) {
  await privateWhispererBucket().deleteFiles({
    prefix: whispererDraftMediaPrefix(draftId),
    force: true,
  });
}
