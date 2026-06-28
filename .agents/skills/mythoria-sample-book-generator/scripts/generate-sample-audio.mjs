import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node generate-sample-audio.mjs <sample-book-folder>');
  process.exit(2);
}

const repoRoot = process.cwd();
const sampleRoot = path.resolve(folder);
const sgwRoot = path.resolve(repoRoot, '..', 'story-generation-workflow');
const audioPath = path.join(sampleRoot, 'audio-sample.json');
const bookPath = path.join(sampleRoot, 'book.json');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(sgwRoot, '.env.local'));
loadEnvFile(path.join(sgwRoot, '.env'));
loadEnvFile(path.join(repoRoot, '.env.local'));

const audio = JSON.parse(fs.readFileSync(audioPath, 'utf8'));
const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));

if (!process.env.GOOGLE_GENAI_API_KEY) {
  audio.status = 'pending_generation';
  audio.blockedReason = 'GOOGLE_GENAI_API_KEY is not available in local environment files.';
  fs.writeFileSync(audioPath, `${JSON.stringify(audio, null, 2)}\n`);
  console.log(JSON.stringify({ ok: false, reason: audio.blockedReason }, null, 2));
  process.exit(0);
}

const requireFromSgw = createRequire(path.join(sgwRoot, 'package.json'));
const { GoogleGenAITTSService } = requireFromSgw('./dist/ai/providers/google-genai/tts.js');

const languagePromptPath = path.join(sgwRoot, 'src', 'prompts', 'audio', `${audio.language}.json`);
let systemPrompt = `Read in ${audio.language} with expressive, age-appropriate narration.`;
if (fs.existsSync(languagePromptPath)) {
  const promptConfig = JSON.parse(fs.readFileSync(languagePromptPath, 'utf8'));
  const targetAge = book.targetAudience === 'children_3-6'
    ? 'criancas pequenas'
    : book.targetAudience === 'children_7-10' || book.targetAudience === 'children_11-14'
      ? 'criancas'
      : 'jovens';
  systemPrompt = String(promptConfig.systemPrompt ?? systemPrompt).replace(
    '{{story-target-age}}',
    targetAge,
  );
}

const tts = new GoogleGenAITTSService({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  model: audio.model || process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview',
  defaultVoice: audio.voice || process.env.TTS_VOICE || 'Charon',
  defaultSpeed: Number(process.env.TTS_SPEED || '1'),
});

const result = await tts.synthesize(audio.text, {
  voice: audio.voice,
  model: audio.model,
  language: audio.language,
  systemPrompt: `${systemPrompt}\n\n${audio.voiceDirection}`,
});

const target = path.join(sampleRoot, audio.targetPath);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, result.buffer);

audio.status = 'generated';
audio.provider = result.provider;
audio.model = result.model;
audio.voice = result.voice;
audio.generatedAt = new Date().toISOString();
delete audio.blockedReason;

book.audioSample = {
  ...(book.audioSample ?? {}),
  localPath: audio.targetPath,
  provider: audio.provider,
  model: audio.model,
  voice: audio.voice,
};

fs.writeFileSync(audioPath, `${JSON.stringify(audio, null, 2)}\n`);
fs.writeFileSync(bookPath, `${JSON.stringify(book, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      ok: true,
      target,
      bytes: result.buffer.length,
      provider: result.provider,
      model: result.model,
      voice: result.voice,
    },
    null,
    2,
  ),
);
