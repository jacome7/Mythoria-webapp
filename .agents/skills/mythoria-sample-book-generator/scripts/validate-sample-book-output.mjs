import fs from 'node:fs';
import path from 'node:path';

const VALID_TARGET_AUDIENCES = new Set([
  'children_0-2',
  'children_3-6',
  'children_7-10',
  'children_11-14',
  'young_adult_15-17',
  'adult_18+',
  'all_ages',
]);

const VALID_NOVEL_STYLES = new Set([
  'adventure',
  'fantasy',
  'mystery',
  'romance',
  'science_fiction',
  'historical',
  'contemporary',
  'fairy_tale',
  'comedy',
  'drama',
  'horror',
  'thriller',
  'biography',
  'educational',
  'poetry',
  'sports_adventure',
]);

const VALID_GRAPHICAL_STYLES = new Set([
  'cartoon',
  'realistic',
  'watercolor',
  'digital_art',
  'hand_drawn',
  'minimalist',
  'vintage',
  'comic_book',
  'euro_comic_book',
  'anime',
  'pixar_style',
  'disney_style',
  'sketch',
  'oil_painting',
  'colored_pencil',
]);

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node validate-sample-book-output.mjs <sample-book-folder>');
  process.exit(2);
}

const root = path.resolve(folder);
const errors = [];
const warnings = [];

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath} is missing or invalid JSON: ${error.message}`);
    return null;
  }
}

for (const requiredFile of [
  'manifest.json',
  'book.json',
  'sample-chapter.md',
  'image-prompts.json',
  'audio-sample.json',
  'review-checklist.md',
  'assets/cover.jpeg',
  'assets/feature.jpeg',
  'assets/prompts/cover.prompt.md',
  'assets/prompts/feature.prompt.md',
]) {
  if (!fileExists(requiredFile)) errors.push(`Missing required file: ${requiredFile}`);
}

const manifest = readJson('manifest.json');
const book = readJson('book.json');
const imagePrompts = readJson('image-prompts.json');
const audio = readJson('audio-sample.json');

if (manifest) {
  for (const key of [
    'schemaVersion',
    'status',
    'slug',
    'title',
    'language',
    'placement',
    'usageTags',
    'riskRating',
    'sensitiveNiche',
    'requiresHumanApproval',
    'createdAt',
    'updatedAt',
  ]) {
    if (!(key in manifest)) errors.push(`manifest.json missing ${key}`);
  }
}

if (book) {
  for (const key of [
    'id',
    'title',
    'slug',
    'language',
    'targetAudience',
    'readerAgeBand',
    'buyerPersona',
    'recipientType',
    'storyIntent',
    'synopsis',
    'shortExcerpt',
    'sampleChapterPath',
    'audioTeaserText',
    'graphicalStyle',
    'novelStyle',
    'fictionalUserContext',
    'coverImage',
    'featureImage',
    'audioSample',
    'safetyNotes',
  ]) {
    if (!(key in book)) errors.push(`book.json missing ${key}`);
  }

  if (!VALID_TARGET_AUDIENCES.has(book.targetAudience)) {
    errors.push(`Invalid targetAudience: ${book.targetAudience}`);
  }
  if (!VALID_NOVEL_STYLES.has(book.novelStyle)) {
    errors.push(`Invalid novelStyle: ${book.novelStyle}`);
  }
  if (!VALID_GRAPHICAL_STYLES.has(book.graphicalStyle)) {
    errors.push(`Invalid graphicalStyle: ${book.graphicalStyle}`);
  }
  if (!String(book.fictionalUserContext ?? '').toLowerCase().includes('ficcional')) {
    warnings.push('fictionalUserContext should explicitly state that the scenario is fictional.');
  }
}

if (imagePrompts) {
  for (const key of ['cover', 'feature']) {
    if (!imagePrompts[key]) {
      errors.push(`image-prompts.json missing ${key}`);
      continue;
    }
    for (const field of ['promptPath', 'targetPath', 'status', 'model', 'size', 'quality']) {
      if (!(field in imagePrompts[key])) errors.push(`image-prompts.json ${key} missing ${field}`);
    }
  }
}

if (audio) {
  for (const key of [
    'status',
    'targetPath',
    'text',
    'voiceDirection',
    'language',
    'provider',
    'model',
    'voice',
    'recommendedDurationSeconds',
  ]) {
    if (!(key in audio)) errors.push(`audio-sample.json missing ${key}`);
  }

  if (audio.status === 'generated' && !fileExists(audio.targetPath)) {
    errors.push(`audio-sample.json is generated but ${audio.targetPath} is missing`);
  }
  if (audio.status === 'generated' && (!audio.gcsUri || !audio.publicUrl)) {
    warnings.push('Generated audio should include gcsUri and publicUrl after upload.');
  }
}

const forbiddenPatterns = [
  /trata o autismo/i,
  /cura/i,
  /diagnostica/i,
  /clinicamente comprovado/i,
  /melhora o comportamento/i,
  /substitui terapia/i,
  /garante resultados/i,
  /guarantees results/i,
  /clinically proven/i,
];

for (const relativePath of ['book.json', 'sample-chapter.md', 'review-checklist.md']) {
  if (!fileExists(relativePath)) continue;
  const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) errors.push(`${relativePath} contains forbidden claim: ${pattern}`);
  }
}

if (errors.length > 0) {
  console.error(JSON.stringify({ ok: false, errors, warnings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, warnings }, null, 2));
