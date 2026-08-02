import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { getIndexableLandingPages } from '../src/content/landing-pages';

const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Aoede';
const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const TARGET_LOCALES = new Set(['en-US', 'es-ES', 'fr-FR']);

const directions: Record<string, string> = {
  'en-US':
    'American English as spoken in New York, warm clear adult storyteller, unhurried 0.85x audiobook pacing with natural pauses, emotionally expressive without melodrama.',
  'es-ES':
    'Español de España como se habla en Madrid, narradora adulta cálida, dicción natural, ritmo de audiolibro pausado a 0,85x con pausas naturales, expresivo sin caricaturizar el acento.',
  'fr-FR':
    'Français de France comme parlé à Paris, narratrice adulte chaleureuse, diction naturelle, rythme de livre audio posé à 0,85x avec des pauses naturelles, expressif sans caricaturer l’accent.',
};

const sampleIntroductions: Record<string, (title: string, chapter: string) => string> = {
  'en-US': (title, chapter) => `From the fictional book “${title}”. Sample chapter: “${chapter}”.`,
  'es-ES': (title, chapter) => `Del libro ficticio «${title}». Capítulo de muestra: «${chapter}».`,
  'fr-FR': (title, chapter) =>
    `Extrait du livre fictif «${title}». Chapitre d’exemple : «${chapter}».`,
};

interface CliOptions {
  locale?: string;
  translationKey?: string;
  book?: string;
  overwrite: boolean;
}

async function hasCurrentManifest(
  manifestPath: string,
  expected: { text: string; language: string; voiceDirection: string },
): Promise<boolean> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    return (
      manifest.text === expected.text &&
      manifest.language === expected.language &&
      manifest.voiceDirection === expected.voiceDirection &&
      manifest.model === MODEL &&
      manifest.voice === VOICE
    );
  } catch {
    return false;
  }
}

function parseOptions(): CliOptions {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    locale: option('--locale'),
    translationKey: option('--translation-key'),
    book: option('--book'),
    overwrite: args.includes('--overwrite'),
  };
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const sibling = resolve(
    process.cwd(),
    '..',
    'story-generation-workflow',
    'node_modules',
    '@ffmpeg-installer',
    'win32-x64',
    'ffmpeg.exe',
  );
  return existsSync(sibling) ? sibling : 'ffmpeg';
}

function audioStats(pcm: Buffer) {
  let sumSquares = 0;
  let peak = 0;
  let clipped = 0;
  const sampleCount = Math.floor(pcm.length / BYTES_PER_SAMPLE);
  for (let offset = 0; offset + 1 < pcm.length; offset += BYTES_PER_SAMPLE) {
    const sample = pcm.readInt16LE(offset);
    const magnitude = Math.abs(sample);
    peak = Math.max(peak, magnitude);
    sumSquares += sample * sample;
    if (magnitude >= 32_760) clipped += 1;
  }
  return {
    durationSeconds: Number((pcm.length / (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE)).toFixed(2)),
    peakRatio: Number((peak / 32_767).toFixed(4)),
    rmsRatio: Number((Math.sqrt(sumSquares / sampleCount) / 32_767).toFixed(4)),
    clippingRatio: Number((clipped / sampleCount).toFixed(6)),
  };
}

async function requestAudio(apiKey: string, prompt: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const request = async () => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
                },
              },
            }),
          },
        );
        if (!response.ok) {
          throw new Error(`Gemini TTS returned ${response.status}: ${await response.text()}`);
        }
        const payload = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
        };
        const data = payload.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)
          ?.inlineData?.data;
        if (!data) throw new Error('Gemini TTS response did not contain inline audio data.');
        return Buffer.from(data, 'base64');
      };

      const hardTimeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error('Gemini TTS request exceeded the 120 second hard timeout.'));
        }, 120_000);
      });
      return await Promise.race([request(), hardTimeout]);
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      console.warn(`TTS request attempt ${attempt} failed; retrying.`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 2_000));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw lastError;
}

async function main() {
  dotenv.config({ path: join(process.cwd(), '.env.local'), quiet: true });
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is required.');

  const options = parseOptions();
  const ffmpeg = resolveFfmpeg();
  const pages = getIndexableLandingPages().filter(
    (page) =>
      TARGET_LOCALES.has(page.locale) &&
      (!options.locale || page.locale === options.locale) &&
      (!options.translationKey || page.translationKey === options.translationKey),
  );

  for (const page of pages) {
    for (const book of page.books) {
      if (options.book && book.slug !== options.book && book.title !== options.book) continue;
      if (!book.audioSampleSrc || !book.sampleChapter) continue;
      const outputPath = join(process.cwd(), 'public', book.audioSampleSrc.replace(/^\//, ''));
      const manifestPath = join(dirname(outputPath), 'audio-sample.json');
      const text = [
        sampleIntroductions[page.locale](book.title, book.sampleChapter.title),
        book.excerpt,
        ...book.sampleChapter.paragraphs,
        book.synopsis,
      ].join(' ');
      const voiceDirection = directions[page.locale];
      if (
        !options.overwrite &&
        existsSync(outputPath) &&
        existsSync(manifestPath) &&
        (await hasCurrentManifest(manifestPath, {
          text,
          language: page.locale,
          voiceDirection,
        }))
      ) {
        console.log(`skip current ${page.locale} ${book.title}`);
        continue;
      }
      const prompt =
        'Narrate a 30 to 60 second audiobook preview. ' +
        `Voice direction: ${voiceDirection} ` +
        'Read only the following story text in the language in which it is written. Do not read the instructions aloud:\n\n' +
        text;
      await mkdir(dirname(outputPath), { recursive: true });
      const pcmPath = `${outputPath}.pcm`;
      console.log(`generate ${page.locale} ${book.title}`);
      const pcm = await requestAudio(apiKey, prompt);
      const stats = audioStats(pcm);
      if (stats.durationSeconds < 30 || stats.durationSeconds > 60) {
        throw new Error(`${book.title} duration ${stats.durationSeconds}s is outside 30–60s.`);
      }
      if (stats.rmsRatio < 0.005 || stats.clippingRatio > 0.001) {
        throw new Error(`${book.title} failed silence/clipping checks: ${JSON.stringify(stats)}`);
      }
      await writeFile(pcmPath, pcm);
      try {
        await run(ffmpeg, [
          '-y',
          '-f',
          's16le',
          '-ar',
          String(SAMPLE_RATE),
          '-ac',
          String(CHANNELS),
          '-i',
          pcmPath,
          '-codec:a',
          'libmp3lame',
          '-b:a',
          '64k',
          outputPath,
        ]);
        await run(ffmpeg, ['-v', 'error', '-i', outputPath, '-f', 'null', '-']);
      } finally {
        await rm(pcmPath, { force: true });
      }
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            status: 'generated',
            targetPath: 'audio-teaser.mp3',
            text,
            voiceDirection,
            language: page.locale,
            provider: 'google-genai',
            model: MODEL,
            voice: VOICE,
            durationSeconds: stats.durationSeconds,
            generatedAt: new Date().toISOString(),
            validation: {
              decoded: true,
              sampleRate: SAMPLE_RATE,
              channels: CHANNELS,
              peakRatio: stats.peakRatio,
              rmsRatio: stats.rmsRatio,
              clippingRatio: stats.clippingRatio,
              accentReview: 'pending-human-review',
            },
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
