import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { getLandingPageBySlug } from '../src/content/landing-pages';

const landingSlug = 'livro-personalizado-crianca';
const publicRoot = join(process.cwd(), 'public');
const landingAssetRoot = join(publicRoot, 'landing-pages', landingSlug, 'assets');

async function digest(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

async function assertImage(
  errors: string[],
  path: string,
  expectedWidth: number,
  expectedHeight: number,
) {
  if (!existsSync(path)) {
    errors.push(`missing image ${path}`);
    return;
  }
  try {
    const metadata = await sharp(path).metadata();
    if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
      errors.push(
        `invalid image dimensions ${path}: ${metadata.width}x${metadata.height}, expected ${expectedWidth}x${expectedHeight}`,
      );
    }
  } catch {
    errors.push(`undecodable image ${path}`);
  }
}

async function main() {
  const errors: string[] = [];
  const page = getLandingPageBySlug(landingSlug);
  if (!page) throw new Error(`Missing landing ${landingSlug}`);
  if (!page.indexable) errors.push('approved landing must remain indexable');
  if (page.books.length !== 5) errors.push(`expected 5 books, found ${page.books.length}`);

  await assertImage(errors, join(landingAssetRoot, 'hero', 'hero.jpeg'), 1500, 1200);
  await assertImage(errors, join(landingAssetRoot, 'hero', 'og-cover.jpeg'), 1200, 630);

  const assetManifestPath = join(landingAssetRoot, 'asset-manifest.json');
  if (!existsSync(assetManifestPath)) errors.push(`missing ${assetManifestPath}`);
  const assetManifest = existsSync(assetManifestPath)
    ? (JSON.parse(await readFile(assetManifestPath, 'utf8')) as {
        books?: Array<{ slug: string; title: string }>;
        audioIncluded?: boolean;
        deterministicComposition?: { coverTitles?: boolean };
      })
    : {};
  if (assetManifest.deterministicComposition?.coverTitles !== true) {
    errors.push('asset manifest must confirm deterministic cover titles');
  }
  if (assetManifest.audioIncluded !== true) {
    errors.push('asset manifest must confirm that audio is included');
  }
  if (
    JSON.stringify(assetManifest.books?.map((book) => book.title)) !==
    JSON.stringify(page.books.map((book) => book.title))
  ) {
    errors.push('asset manifest titles must match landing book titles in order');
  }

  for (const book of page.books) {
    if (!book.slug) {
      errors.push(`book ${book.id} is missing slug`);
      continue;
    }
    const sampleRoot = join(publicRoot, 'sample-books', book.slug);
    const sampleAssets = join(sampleRoot, 'assets');
    const landingAssets = join(landingAssetRoot, 'books', book.slug);
    const bookJson = JSON.parse(await readFile(join(sampleRoot, 'book.json'), 'utf8')) as {
      title?: string;
      publicProvenance?: string;
      sampleChapterImage?: { localPath?: string };
      audioSample?: { status?: string };
    };
    if (bookJson.title !== book.title) errors.push(`title mismatch for ${book.slug}`);
    if (bookJson.publicProvenance !== 'mythoria_created_example') {
      errors.push(`invalid public provenance for ${book.slug}`);
    }
    if (bookJson.sampleChapterImage?.localPath !== 'assets/chapter-01.jpeg') {
      errors.push(`missing chapter image contract for ${book.slug}`);
    }
    if (bookJson.audioSample?.status !== 'generated') {
      errors.push(`book audio status must be generated for ${book.slug}`);
    }

    for (const [file, width, height] of [
      ['cover.jpeg', 1024, 1536],
      ['feature.jpeg', 1536, 1024],
      ['chapter-01.jpeg', 1536, 1024],
    ] as const) {
      const canonicalPath = join(sampleAssets, file);
      const landingPath = join(landingAssets, file);
      await assertImage(errors, canonicalPath, width, height);
      await assertImage(errors, landingPath, width, height);
      if (existsSync(canonicalPath) && existsSync(landingPath)) {
        if ((await digest(canonicalPath)) !== (await digest(landingPath))) {
          errors.push(`landing copy is stale for ${book.slug}/${file}`);
        }
      }
    }

    const audioPath = join(sampleAssets, 'audio-teaser.mp3');
    const landingAudioPath = join(landingAssets, 'audio-teaser.mp3');
    const audioManifest = JSON.parse(
      await readFile(join(sampleRoot, 'audio-sample.json'), 'utf8'),
    ) as Record<string, unknown>;
    if (!existsSync(audioPath) || !existsSync(landingAudioPath)) {
      errors.push(`missing audio for ${book.slug}`);
    } else {
      if ((await stat(audioPath)).size < 20_000) errors.push(`audio too small for ${book.slug}`);
      if ((await digest(audioPath)) !== (await digest(landingAudioPath))) {
        errors.push(`landing audio copy is stale for ${book.slug}`);
      }
    }
    const duration = Number(audioManifest.durationSeconds);
    if (duration < 30 || duration > 45)
      errors.push(`audio duration outside 30–45s for ${book.slug}`);
    if (
      audioManifest.status !== 'generated' ||
      audioManifest.language !== 'pt-PT' ||
      audioManifest.provider !== 'google-genai' ||
      audioManifest.model !== 'gemini-3.1-flash-tts-preview' ||
      audioManifest.voice !== 'Aoede'
    ) {
      errors.push(`invalid audio manifest for ${book.slug}`);
    }
    if (audioManifest.text !== book.audioSampleTranscript) {
      errors.push(`audio transcript mismatch for ${book.slug}`);
    }

    const chapter = (await readFile(join(sampleRoot, 'sample-chapter.md'), 'utf8'))
      .replace(/^---[\s\S]*?---/, '')
      .trim();
    const words = chapter.split(/\s+/u).filter(Boolean).length;
    if (words < 600 || words > 900) errors.push(`chapter word count ${words} for ${book.slug}`);
  }

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Personalized children assets valid: 5 complete books, 15 images, 5 audio teasers.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
