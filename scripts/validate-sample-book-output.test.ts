/** @jest-environment node */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, 'validate-sample-book-output.mjs');
const completePack = join(__dirname, '../public/sample-books/mia-e-a-pastelaria-da-lua');

let pack: string;

beforeEach(() => {
  pack = mkdtempSync(join(tmpdir(), 'mythoria-sample-book-'));
  cpSync(completePack, pack, { recursive: true });
});

afterEach(() => {
  rmSync(pack, { recursive: true, force: true });
});

type ImagePrompt = { status?: string; model?: string; promptPath: string };
type PackFiles = {
  'image-prompts.json': Record<'cover' | 'feature' | 'chapter', ImagePrompt>;
  'audio-sample.json': { status: string; generatedAt?: string };
  'manifest.json': { status: string };
};

function editJson<File extends keyof PackFiles>(
  file: File,
  update: (value: PackFiles[File]) => void,
) {
  const path = join(pack, file);
  const value: PackFiles[File] = JSON.parse(readFileSync(path, 'utf8'));
  update(value);
  writeFileSync(path, JSON.stringify(value));
}

function validate(...args: string[]) {
  return spawnSync(process.execPath, [script, pack, ...args], { encoding: 'utf8' });
}

it('reports known draft media gaps and fails release media validation', () => {
  editJson('image-prompts.json', (prompts) => {
    prompts.cover.status = 'generated_from_existing_asset';
    prompts.feature.status = 'generated_from_existing_asset';
    delete prompts.chapter.status;
    delete prompts.chapter.model;
  });
  editJson('audio-sample.json', (audio) => {
    audio.status = 'pending_generation';
    delete audio.generatedAt;
  });
  rmSync(join(pack, 'assets/audio-teaser.mp3'));

  const draft = validate('--draft');
  expect(draft.status).toBe(0);
  expect(draft.stderr).toContain('cover image uses an existing asset');
  expect(draft.stderr).toContain('feature image uses an existing asset');
  expect(draft.stderr).toContain('chapter image generation provenance is unrecorded');
  expect(draft.stderr).toContain('audio teaser is pending_generation');

  const release = validate();
  expect(release.status).toBe(1);
  expect(release.stderr).toContain('cover image status must be generated');
  expect(release.stderr).toContain('chapter image model must be gpt-image-2');
  expect(release.stderr).toContain('Missing assets/audio-teaser.mp3');
});

it('requires draft status to use draft validation', () => {
  editJson('manifest.json', (manifest) => {
    manifest.status = 'published';
  });

  const result = validate('--draft');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('--draft requires manifest.status to be draft');
  expect(validate().status).toBe(0);
});

it('rejects a referenced chapter image with a missing prompt in a draft', () => {
  editJson('image-prompts.json', (prompts) => {
    delete prompts.chapter.status;
    delete prompts.chapter.model;
    prompts.chapter.promptPath = 'assets/prompts/missing.prompt.md';
  });

  const result = validate('--draft');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('chapter image promptPath is missing or does not exist');
});
