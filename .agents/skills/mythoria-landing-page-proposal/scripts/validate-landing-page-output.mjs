#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const folder = process.argv[2];

const requiredFiles = [
  'manifest.json',
  'research-report.md',
  'page.md',
  'seo-brief.json',
  'books.json',
  'image-prompts.json',
  'audio-samples.json',
  'story-generation-plan.json',
  'review-checklist.md',
  'implementation-notes.md',
  'assets/covers/book-01-cover.prompt.md',
  'assets/covers/book-02-cover.prompt.md',
  'assets/covers/book-03-cover.prompt.md',
  'assets/covers/book-04-cover.prompt.md',
  'assets/covers/book-05-cover.prompt.md',
  'assets/use-cases/book-01-use-case.prompt.md',
  'assets/use-cases/book-02-use-case.prompt.md',
  'assets/use-cases/book-03-use-case.prompt.md',
  'assets/use-cases/book-04-use-case.prompt.md',
  'assets/use-cases/book-05-use-case.prompt.md',
];

const requiredManifestFields = [
  'schemaVersion',
  'status',
  'locale',
  'slug',
  'title',
  'primaryIntent',
  'targetCountry',
  'primaryGoal',
  'secondaryGoal',
  'primaryPersona',
  'secondaryPersonas',
  'recipientTypes',
  'riskRating',
  'sensitiveNiche',
  'requiresHumanApproval',
  'requiresExternalExpertReview',
  'createdAt',
  'updatedAt',
];

const allowedStatuses = new Set([
  'draft',
  'needs_review',
  'approved',
  'published',
  'retired',
]);
const allowedRiskRatings = new Set(['green', 'yellow', 'red']);
const forbiddenPhrases = [
  'trata o autismo',
  'cura',
  'diagnostica',
  'clinicamente comprovado',
  'melhora o comportamento',
  'substitui terapia',
  'garante resultados',
];
const finalAssetExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.mp3',
  '.wav',
  '.m4a',
  '.pdf',
]);

const errors = [];
const warnings = [];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsForbiddenPhrase(content, phrase) {
  const escapedPhrase = escapeRegExp(phrase);

  if (!phrase.includes(' ')) {
    return new RegExp(`(^|[^\\p{L}])${escapedPhrase}(?=$|[^\\p{L}])`, 'iu').test(content);
  }

  return content.includes(phrase);
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function readJson(relativePath) {
  const absolutePath = path.join(folder, relativePath);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    addError(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function listFilesRecursive(baseDir) {
  if (!existsSync(baseDir)) return [];

  const entries = readdirSync(baseDir);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(baseDir, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...listFilesRecursive(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

if (!folder) {
  addError('Usage: node validate-landing-page-output.mjs <proposal-folder>');
} else if (!existsSync(folder) || !statSync(folder).isDirectory()) {
  addError(`Proposal folder does not exist: ${folder}`);
}

if (errors.length === 0) {
  for (const relativePath of requiredFiles) {
    if (!existsSync(path.join(folder, relativePath))) {
      addError(`Missing required file: ${relativePath}`);
    }
  }
}

let manifest = null;
let books = null;
let imagePrompts = null;
let audioSamples = null;
let storyPlan = null;

if (errors.length === 0) {
  manifest = readJson('manifest.json');
  books = readJson('books.json');
  imagePrompts = readJson('image-prompts.json');
  audioSamples = readJson('audio-samples.json');
  storyPlan = readJson('story-generation-plan.json');
  readJson('seo-brief.json');
}

if (manifest) {
  for (const field of requiredManifestFields) {
    if (!(field in manifest)) {
      addError(`manifest.json missing required field: ${field}`);
    }
  }

  if (manifest.schemaVersion !== '1.0') {
    addError('manifest.json schemaVersion must be "1.0"');
  }

  if (manifest.locale !== 'pt-PT') {
    addError('manifest.json locale must be "pt-PT"');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.slug ?? '')) {
    addError('manifest.json slug must be lowercase URL-safe hyphen-case');
  }

  if (!allowedStatuses.has(manifest.status)) {
    addError(`manifest.json status must be one of: ${[...allowedStatuses].join(', ')}`);
  }

  if (manifest.status !== 'draft') {
    addWarning('manifest.json status should default to draft for generated proposals');
  }

  if (!allowedRiskRatings.has(manifest.riskRating)) {
    addError('manifest.json riskRating must be green, yellow, or red');
  }

  if (manifest.requiresHumanApproval !== true) {
    addError('manifest.json requiresHumanApproval must be true');
  }
}

if (books) {
  if (!Array.isArray(books.books)) {
    addError('books.json must contain a books array');
  } else if (books.books.length !== 5) {
    addError(`books.json must contain exactly 5 books, found ${books.books.length}`);
  } else {
    books.books.forEach((book, index) => {
      const expectedId = `book-${String(index + 1).padStart(2, '0')}`;

      if (book.id !== expectedId) {
        addError(`books.json book at index ${index} must have id ${expectedId}`);
      }

      if (!book.title || !book.synopsis || !book.shortExcerpt) {
        addError(`${expectedId} must include title, synopsis, and shortExcerpt`);
      }

      if (!book.graphicalStyle || !book.novelStyle) {
        addError(`${expectedId} must include graphicalStyle and novelStyle`);
      }

      if (!book.coverImage?.promptPath || !existsSync(path.join(folder, book.coverImage.promptPath))) {
        addError(`${expectedId} coverImage.promptPath is missing or does not exist`);
      }

      if (!book.useCaseImage?.promptPath || !existsSync(path.join(folder, book.useCaseImage.promptPath))) {
        addError(`${expectedId} useCaseImage.promptPath is missing or does not exist`);
      }

      if (!book.audioSample?.text || book.audioSample.text.trim().length < 40) {
        addError(`${expectedId} audioSample.text must be present and audio-ready`);
      }

      if (book.publicStory?.status !== 'pending_story_generation') {
        addError(`${expectedId} publicStory.status must be pending_story_generation`);
      }
    });
  }
}

if (imagePrompts) {
  if (!Array.isArray(imagePrompts.imagePrompts)) {
    addError('image-prompts.json must contain imagePrompts array');
  } else if (imagePrompts.imagePrompts.length !== 10) {
    addError(`image-prompts.json must contain 10 prompts, found ${imagePrompts.imagePrompts.length}`);
  }
}

if (audioSamples) {
  if (!Array.isArray(audioSamples.audioSamples)) {
    addError('audio-samples.json must contain audioSamples array');
  } else if (audioSamples.audioSamples.length !== 5) {
    addError(`audio-samples.json must contain 5 audio samples, found ${audioSamples.audioSamples.length}`);
  }
}

if (storyPlan) {
  if (!Array.isArray(storyPlan.storiesToCreate)) {
    addError('story-generation-plan.json must contain storiesToCreate array');
  } else if (storyPlan.storiesToCreate.length !== 5) {
    addError(`story-generation-plan.json must contain 5 stories, found ${storyPlan.storiesToCreate.length}`);
  }
}

if (errors.length === 0) {
  const allFiles = listFilesRecursive(folder);

  for (const file of allFiles) {
    const relativePath = path.relative(folder, file).replaceAll(path.sep, '/');
    const extension = path.extname(file).toLowerCase();

    if (finalAssetExtensions.has(extension)) {
      addError(`Final media asset is not allowed in proposal folder: ${relativePath}`);
    }

    const content = readFileSync(file, 'utf8').toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (containsForbiddenPhrase(content, phrase)) {
        addError(`Forbidden phrase "${phrase}" found in ${relativePath}`);
      }
    }
  }
}

for (const warning of warnings) {
  console.warn(`WARNING: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log(`OK: landing-page proposal validates (${folder})`);
