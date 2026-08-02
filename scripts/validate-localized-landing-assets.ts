import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { getIndexableLandingPages } from '../src/content/landing-pages';

const LOCALES = new Set(['en-US', 'es-ES', 'fr-FR']);
const MODEL = 'gemini-3.1-flash-tts-preview';

async function main() {
  const pages = getIndexableLandingPages().filter((page) => LOCALES.has(page.locale));
  const errors: string[] = [];
  let images = 0;
  let audio = 0;

  if (pages.length !== 9) errors.push(`expected 9 localized pages, found ${pages.length}`);
  for (const page of pages) {
    for (const source of [page.hero.imageSrc, page.ogImageSrc]) {
      if (!source) continue;
      const path = join(process.cwd(), 'public', source.replace(/^\//, ''));
      if (!existsSync(path)) {
        errors.push(`missing hero/OG image ${source}`);
        continue;
      }
      const metadata = await sharp(path).metadata();
      if (!metadata.width || !metadata.height) errors.push(`undecodable hero/OG image ${source}`);
      if (
        source.endsWith('/og-cover.jpeg') &&
        (metadata.width !== 1200 || metadata.height !== 630)
      ) {
        errors.push(`invalid OG dimensions ${source}: ${metadata.width}x${metadata.height}`);
      }
    }
    for (const book of page.books) {
      for (const source of [book.imageSrc, book.sampleChapter?.imageSrc]) {
        if (!source) continue;
        const path = join(process.cwd(), 'public', source.replace(/^\//, ''));
        if (!existsSync(path)) {
          errors.push(`missing image ${source}`);
          continue;
        }
        const metadata = await sharp(path).metadata();
        if (!metadata.width || !metadata.height) errors.push(`undecodable image ${source}`);
        images += 1;
      }

      if (!book.audioSampleSrc) continue;
      const path = join(process.cwd(), 'public', book.audioSampleSrc.replace(/^\//, ''));
      const manifestPath = join(dirname(path), 'audio-sample.json');
      if (!existsSync(path) || !existsSync(manifestPath)) {
        errors.push(`missing audio or manifest ${book.audioSampleSrc}`);
        continue;
      }
      const file = await stat(path);
      if (file.size < 20_000) errors.push(`audio too small ${book.audioSampleSrc}`);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
      const duration = Number(manifest.durationSeconds);
      if (duration < 30 || duration > 60) errors.push(`invalid duration ${book.audioSampleSrc}`);
      if (
        manifest.language !== page.locale ||
        manifest.model !== MODEL ||
        manifest.voice !== 'Aoede'
      ) {
        errors.push(`invalid manifest ${book.audioSampleSrc}`);
      }
      const manifestText = String(manifest.text ?? '');
      const expectedStoryText = [
        book.title,
        book.excerpt,
        book.synopsis,
        book.sampleChapter?.title,
        ...(book.sampleChapter?.paragraphs ?? []),
      ].filter((value): value is string => Boolean(value));
      if (expectedStoryText.some((value) => !manifestText.includes(value))) {
        errors.push(`stale audio manifest ${book.audioSampleSrc}`);
      }
      audio += 1;
    }
  }

  if (images !== 108) errors.push(`expected 108 localized book images, found ${images}`);
  if (audio !== 54) errors.push(`expected 54 localized audio samples, found ${audio}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    `Localized landing assets valid: ${pages.length} pages, ${images} images, ${audio} audio samples.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
