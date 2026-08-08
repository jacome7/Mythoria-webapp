import { spawn } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Aoede';
const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const DEFAULT_BOOKS = [
  'mia-e-a-pastelaria-da-lua',
  'tomas-e-o-mapa-das-portas-escondidas',
  'lia-e-o-jardim-das-palavras-perdidas',
  'a-equipa-que-marcou-um-golo-nas-estrelas',
  'ines-e-o-robo-feito-de-desenhos',
] as const;

interface AudioManifest {
  status: string;
  targetPath: string;
  text: string;
  voiceDirection: string;
  pronunciationNotes?: string[];
  language: string;
  provider: string;
  model: string;
  voice: string;
  recommendedDurationSeconds: number;
  generatedAt?: string;
  humanListeningReview?: string;
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
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error('Gemini TTS request exceeded 120 seconds.'));
        }, 120_000);
      });
      return await Promise.race([request(), timeout]);
    } catch (error) {
      lastError = error;
      if (attempt < 3)
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 2_000));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw lastError;
}

async function generateBookAudio(apiKey: string, ffmpeg: string, slug: string, overwrite: boolean) {
  const folder = join(process.cwd(), 'public', 'sample-books', slug);
  const manifestPath = join(folder, 'audio-sample.json');
  const outputPath = join(folder, 'assets', 'audio-teaser.mp3');
  const pcmPath = `${outputPath}.pcm`;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as AudioManifest;
  if (!overwrite && existsSync(outputPath)) {
    console.log(`skip existing ${slug}`);
    return;
  }
  const prompt = [
    'Narrate only the supplied story text as a 30 to 45 second audiobook teaser.',
    `Voice direction: ${manifest.voiceDirection}`,
    `Language: European Portuguese as spoken in Lisbon, Portugal. Voice: adult storyteller.`,
    'Do not read instructions, title, labels, stage directions or quotation marks aloud.',
    'Do not add music, sound effects, an introduction or a closing sentence.',
    '',
    manifest.text,
  ].join('\n');
  console.log(`generate ${slug}`);
  const pcm = await requestAudio(apiKey, prompt);
  const stats = audioStats(pcm);
  if (stats.durationSeconds < 30 || stats.durationSeconds > 45) {
    throw new Error(`${slug} duration ${stats.durationSeconds}s is outside 30–45s.`);
  }
  if (stats.rmsRatio < 0.005 || stats.clippingRatio > 0.001) {
    throw new Error(`${slug} failed audio checks: ${JSON.stringify(stats)}`);
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
      '-af',
      'loudnorm=I=-18:TP=-2:LRA=7',
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '96k',
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
        ...manifest,
        status: 'generated',
        provider: 'google-genai',
        model: MODEL,
        voice: VOICE,
        generatedAt: new Date().toISOString(),
        durationSeconds: stats.durationSeconds,
        humanListeningReview: 'pending_pt_pt_reviewer',
        validation: {
          decoded: true,
          sampleRate: SAMPLE_RATE,
          channels: CHANNELS,
          peakRatio: stats.peakRatio,
          rmsRatio: stats.rmsRatio,
          clippingRatio: stats.clippingRatio,
          loudnessTargetLufs: -18,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const bookPath = join(folder, 'book.json');
  const book = JSON.parse(await readFile(bookPath, 'utf8')) as {
    audioSample?: Record<string, unknown>;
    [key: string]: unknown;
  };
  if (!book.audioSample) throw new Error(`${slug} book.json is missing audioSample metadata.`);
  book.audioSample = {
    ...book.audioSample,
    status: 'generated',
    provider: 'google-genai',
    model: MODEL,
    voice: VOICE,
  };
  await writeFile(bookPath, `${JSON.stringify(book, null, 2)}\n`, 'utf8');
}

async function main() {
  dotenv.config({ path: join(process.cwd(), '.env.local'), quiet: true });
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is required.');
  const args = process.argv.slice(2);
  const bookIndex = args.indexOf('--book');
  const requested = bookIndex >= 0 ? args[bookIndex + 1] : undefined;
  const slugs = requested ? [requested] : [...DEFAULT_BOOKS];
  const ffmpeg = resolveFfmpeg();
  for (const slug of slugs) {
    if (!slug || !DEFAULT_BOOKS.includes(slug as (typeof DEFAULT_BOOKS)[number])) {
      throw new Error(`Unknown personalized-children sample book: ${slug}`);
    }
    await generateBookAudio(apiKey, ffmpeg, slug, args.includes('--overwrite'));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
