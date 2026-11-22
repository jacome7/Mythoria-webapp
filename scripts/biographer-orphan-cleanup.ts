import { Storage } from '@google-cloud/storage';
import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db';
import { biographerAssets, biographerSegments } from '../src/db/schema/biographer';
import { orphanCandidate, shouldDeleteOrphan } from '../src/lib/biographer/orphan-cleanup';

/** Dry run by default. --apply deletes only old unreferenced objects under a locked project. */
async function main() {
  const apply = process.argv.includes('--apply');
  if (process.argv.slice(2).some((arg) => arg !== '--apply'))
    throw new Error('Usage: npm run biographer:cleanup-orphans -- [--apply]');
  const bucketName = process.env.BIOGRAPHER_STORAGE_BUCKET;
  if (!bucketName) throw new Error('BIOGRAPHER_STORAGE_BUCKET is required');
  const bucket = new Storage().bucket(bucketName);
  const now = new Date();
  let candidates = 0;
  let deleted = 0;
  let page: { prefix: string; autoPaginate: false; maxResults: number; pageToken?: string } = {
    prefix: 'biographer/',
    autoPaginate: false,
    maxResults: 200,
  };
  do {
    const [files, next] = await bucket.getFiles(page);
    for (const file of files) {
      const created =
        typeof file.metadata.timeCreated === 'string' ? file.metadata.timeCreated : undefined;
      const projectId = orphanCandidate(file.name, created, now);
      const generation = file.metadata.generation;
      if (!projectId || !generation) continue;
      const removed = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
        const [asset] = await tx
          .select({ id: biographerAssets.id })
          .from(biographerAssets)
          .where(eq(biographerAssets.objectPath, file.name))
          .limit(1);
        const [segment] = await tx
          .select({ id: biographerSegments.id })
          .from(biographerSegments)
          .where(eq(biographerSegments.objectPath, file.name))
          .limit(1);
        if (
          !shouldDeleteOrphan(file.name, created, now, {
            asset: Boolean(asset),
            segment: Boolean(segment),
          })
        )
          return false;
        candidates++;
        if (!apply) return false;
        const current = bucket.file(file.name, {
          preconditionOpts: { ifGenerationMatch: String(generation) },
        });
        await current.delete({ ignoreNotFound: true });
        return true;
      });
      if (removed) deleted++;
    }
    page = next
      ? { prefix: 'biographer/', autoPaginate: false, maxResults: 200, pageToken: next.pageToken }
      : { prefix: 'biographer/', autoPaginate: false, maxResults: 200 };
    if (!next?.pageToken) break;
  } while (true);
  process.stdout.write(
    JSON.stringify({ mode: apply ? 'apply' : 'dry-run', candidates, deleted }) + '\n',
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(
      `Biographer cleanup failed: ${error instanceof Error ? error.name : 'unknown'}\n`,
    );
    process.exit(1);
  });
