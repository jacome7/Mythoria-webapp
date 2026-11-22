import { Storage } from '@google-cloud/storage';
import { BiographerError } from '@/db/services/biographer';

let storage: Storage | undefined;

export function privateWhispererBucket() {
  const name = process.env.BIOGRAPHER_STORAGE_BUCKET;
  if (!name) throw new BiographerError('Private media storage unavailable', 503);
  storage ??= new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID });
  return storage.bucket(name);
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
