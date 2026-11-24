import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const [folderArg, mode, ...extraArgs] = process.argv.slice(2);
if (!folderArg || folderArg.startsWith('-') || (mode && mode !== '--draft') || extraArgs.length) {
  console.error(
    'Usage: node scripts/validate-sample-book-output.mjs <sample-book-folder> [--draft]',
  );
  process.exit(1);
}

const folder = resolve(folderArg);
const requiredFiles = [
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
];
const targetAudiences = new Set([
  'children_0-2',
  'children_3-6',
  'children_7-10',
  'children_11-14',
  'young_adult_15-17',
  'adult_18+',
  'all_ages',
]);
const novelStyles = new Set([
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
const graphicalStyles = new Set([
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
  'claymation',
  'papercut',
]);
const forbiddenClaims = [
  'trata o autismo',
  'clinicamente comprovado',
  'melhora o comportamento',
  'substitui terapia',
  'garante resultados',
  'guarantees results',
  'clinically proven',
];
const errors = [];
const warnings = [];

function requireFile(relativePath) {
  const path = resolve(folder, relativePath);
  if (!existsSync(path) || !statSync(path).isFile()) {
    errors.push(`Missing ${relativePath}`);
  } else if (statSync(path).size === 0) {
    errors.push(`Empty ${relativePath}`);
  }
}

requiredFiles.forEach(requireFile);

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(resolve(folder, relativePath), 'utf8'));
  } catch (error) {
    errors.push(
      `Invalid ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {};
  }
}

const manifest = readJson('manifest.json');
const book = readJson('book.json');
const imagePrompts = readJson('image-prompts.json');
const audio = readJson('audio-sample.json');
const draft = mode === '--draft' && manifest.status === 'draft';
if (mode === '--draft' && !draft) {
  errors.push('--draft requires manifest.status to be draft');
}
const chapter = existsSync(resolve(folder, 'sample-chapter.md'))
  ? readFileSync(resolve(folder, 'sample-chapter.md'), 'utf8')
  : '';

if (manifest.schemaVersion !== '1.0') errors.push('manifest.schemaVersion must be 1.0');
if (!['draft', 'needs_review', 'approved', 'published', 'retired'].includes(manifest.status)) {
  errors.push('manifest.status is invalid');
}
if (manifest.language !== 'pt-PT') errors.push('manifest.language must be pt-PT');
if (!['green', 'yellow', 'red'].includes(manifest.riskRating)) {
  errors.push('manifest.riskRating is invalid');
}
const childAudience = String(book.targetAudience ?? '').startsWith('children_');
if (childAudience && manifest.riskRating !== 'yellow') {
  errors.push('child sample books must use a yellow risk rating');
}
if (manifest.riskRating === 'yellow' && manifest.sensitiveNiche !== true) {
  errors.push('yellow sample books must set sensitiveNiche to true');
}
if (manifest.riskRating === 'green' && manifest.sensitiveNiche !== false) {
  errors.push('green sample books must set sensitiveNiche to false');
}
if (manifest.requiresHumanApproval !== true)
  errors.push('manifest.requiresHumanApproval must be true');
if (manifest.slug !== book.slug) errors.push('manifest.slug must match book.slug');
if (manifest.title !== book.title) errors.push('manifest.title must match book.title');

if (!targetAudiences.has(book.targetAudience)) errors.push('book.targetAudience is not canonical');
if (!novelStyles.has(book.novelStyle)) errors.push('book.novelStyle is not canonical');
if (!graphicalStyles.has(book.graphicalStyle)) errors.push('book.graphicalStyle is not canonical');
if (
  !String(book.fictionalUserContext ?? '')
    .toLowerCase()
    .includes('ficcional')
) {
  errors.push('book.fictionalUserContext must explicitly be fictional');
}
if (!Array.isArray(book.safetyNotes) || book.safetyNotes.length < 3) {
  errors.push('book.safetyNotes must include at least three notes');
}

for (const key of ['cover', 'feature']) {
  const prompt = imagePrompts[key];
  if (!prompt) errors.push(`image-prompts.json is missing ${key}`);
  if (draft && prompt?.status === 'generated_from_existing_asset') {
    warnings.push(`${key} image uses an existing asset; confirm provenance before release`);
    continue;
  }
  if (prompt?.status !== 'generated') errors.push(`${key} image status must be generated`);
  if (prompt?.model !== 'gpt-image-2') errors.push(`${key} image model must be gpt-image-2`);
}

if (book.sampleChapterImage?.localPath) {
  requireFile(book.sampleChapterImage.localPath);

  const chapterPrompt = imagePrompts.chapter;
  if (!chapterPrompt) errors.push('image-prompts.json is missing chapter');
  if (
    draft &&
    chapterPrompt &&
    chapterPrompt.status === undefined &&
    chapterPrompt.model === undefined
  ) {
    warnings.push('chapter image generation provenance is unrecorded');
  } else {
    if (chapterPrompt?.status !== 'generated')
      errors.push('chapter image status must be generated');
    if (chapterPrompt?.model !== 'gpt-image-2')
      errors.push('chapter image model must be gpt-image-2');
  }
  if (!chapterPrompt?.promptPath || !existsSync(resolve(folder, chapterPrompt.promptPath))) {
    errors.push('chapter image promptPath is missing or does not exist');
  }
  if (chapterPrompt?.targetPath !== book.sampleChapterImage.localPath) {
    errors.push('chapter image targetPath must match book.sampleChapterImage.localPath');
  }
}

if (draft && ['pending_generation', 'blocked'].includes(audio.status)) {
  warnings.push(`audio teaser is ${audio.status}`);
} else {
  requireFile('assets/audio-teaser.mp3');
  if (audio.status !== 'generated') errors.push('audio status must be generated');
  if (!audio.generatedAt) errors.push('audio.generatedAt is required');
}
if (audio.language !== 'pt-PT') errors.push('audio language must be pt-PT');
if (audio.provider !== 'google-genai') errors.push('audio provider must be google-genai');

const chapterBody = chapter.replace(/^---[\s\S]*?---/, '').trim();
const wordCount = chapterBody.split(/\s+/u).filter(Boolean).length;
if (wordCount < 600 || wordCount > 900) {
  errors.push(`sample chapter must contain 600-900 words; found ${wordCount}`);
}

const publicText = JSON.stringify({ manifest, book, audio, chapter }).toLowerCase();
for (const phrase of forbiddenClaims) {
  if (publicText.includes(phrase)) errors.push(`forbidden claim found: ${phrase}`);
}

if (errors.length) {
  console.error(`Sample-book validation failed for ${folder}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Sample-book ${draft ? 'draft ' : ''}validation passed: ${folder} (${wordCount} chapter words)`,
);
warnings.forEach((warning) => console.warn(`- ${warning}`));
