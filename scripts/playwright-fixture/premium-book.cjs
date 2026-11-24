const { createHash } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const { dirname, join } = require('node:path');
const sharp = require('sharp');
const source = require('../../src/lib/premium-children-book/worker-manifest.fixture.json');

const storyId = source.storyId;
const ownerId = '00000000-0000-4000-8000-000000000001';
const prefix = `${storyId}/premium/revisions/${source.revision}`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";

async function store(key, bytes) {
  const name = join(process.env.PLAYWRIGHT_PREMIUM_STORAGE_DIR, key);
  await mkdir(dirname(name), { recursive: true });
  await writeFile(name, bytes);
  return { key, generation: '101', sha256: hash(bytes), bytes: bytes.length };
}

async function image(extension, background) {
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background } })
    .toFormat(extension)
    .toBuffer();
  return store(`${prefix}/assets/${hash(bytes)}.${extension}`, bytes);
}

async function main() {
  const reading = await image('png', '#ebbb73');
  const printed = await image('jpg', '#226071');
  const manifest = {
    ...source,
    ownerId,
    openingDesign: { background: '#f9efd9', motif: 'paper_boat' },
    motifArtwork: reading,
    covers: { front: printed, back: printed },
    pages: source.pages.map((page) =>
      page.number < 5 || page.kind === 'invitation' ? page : { ...page, reading, artwork: printed },
    ),
    spreads: source.spreads.map((spread) => ({ ...spread, master: reading })),
  };
  const ref = await store(`${prefix}/manifest.json`, Buffer.from(JSON.stringify(manifest)));
  const marker = {
    version: 1,
    type: 'premium_children',
    state: 'published',
    revision: source.revision,
    ownerId,
    audience: 'children_3-6',
    manifest: ref,
  };
  console.log(`INSERT INTO stories (story_id, author_id, title, synopsis, story_language, target_audience,
    status, story_generation_status, story_generation_completed_percentage, features)
    VALUES (${[
      storyId,
      ownerId,
      source.opening.title,
      source.opening.synopsis,
      source.opening.locale,
      'children_3-6',
      'published',
      'completed',
    ]
      .map(quote)
      .join(', ')}, 100, ${quote(JSON.stringify({ ebook: true, premiumBook: marker }))});`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
