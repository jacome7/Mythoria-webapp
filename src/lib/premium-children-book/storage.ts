import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import {
  maxPremiumAudiobookBytes,
  PremiumBookContractError,
  premiumBookManifestSchema,
  premiumInvitationPath,
  premiumRevisionPrefix,
  readPremiumBookMarker,
  type PremiumBookAsset,
  type PremiumBookManifest,
} from './contract';

const storage = new Storage({ timeout: 15_000 });
const maxManifestBytes = 1024 * 1024;
const maxImageBytes = 24 * 1024 * 1024;
const openingKinds = ['title', 'copyright', 'dedication', 'synopsis', 'opener'];

async function downloadVerifiedAsset(asset: PremiumBookAsset, maxBytes: number): Promise<Buffer> {
  const bucket = process.env.PREMIUM_BOOK_BUCKET?.trim();
  if (!bucket) throw new PremiumBookContractError('Premium book storage is unavailable');
  if (asset.bytes > maxBytes) throw new PremiumBookContractError('Premium book asset is too large');
  // The Storage SDK internally converts generation strings to numbers.
  const generation = Number(asset.generation);
  if (
    !Number.isSafeInteger(generation) ||
    generation <= 0 ||
    String(generation) !== asset.generation
  ) {
    throw new PremiumBookContractError('Invalid premium book asset generation');
  }
  const file = storage.bucket(bucket).file(asset.key, { generation });
  const [bytes] = await file.download({ start: 0, end: asset.bytes }).catch(() => {
    throw new PremiumBookContractError('Premium book asset unavailable');
  });
  if (
    bytes.length !== asset.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== asset.sha256
  ) {
    throw new PremiumBookContractError('Premium book asset verification failed');
  }
  return bytes;
}

function assertStoryImage(storyId: string, asset: PremiumBookAsset, extension: 'jpg' | 'png') {
  const [story, premium, revisions, revision, assets, file, extra] = asset.key.split('/');
  if (
    story !== storyId ||
    premium !== 'premium' ||
    revisions !== 'revisions' ||
    !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(revision ?? '') ||
    assets !== 'assets' ||
    file !== `${asset.sha256}.${extension}` ||
    extra !== undefined ||
    asset.bytes > maxImageBytes
  ) {
    throw new PremiumBookContractError('Invalid premium book image reference');
  }
}

export async function loadPublishedPremiumBook(
  storyId: string,
  ownerId: string,
  features: unknown,
): Promise<PremiumBookManifest | null> {
  const marker = readPremiumBookMarker(features);
  if (!marker || marker.state !== 'published') return null;
  if (
    marker.manifest.key !== `${premiumRevisionPrefix(storyId, marker.revision)}manifest.json` ||
    (marker.ownerId && marker.ownerId !== ownerId)
  ) {
    throw new PremiumBookContractError('Premium book manifest identity mismatch');
  }
  const bytes = await downloadVerifiedAsset(marker.manifest, maxManifestBytes);
  let json: unknown;
  try {
    json = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new PremiumBookContractError('Invalid premium book manifest');
  }
  const result = premiumBookManifestSchema.safeParse(json);
  if (!result.success) throw new PremiumBookContractError('Invalid premium book manifest');
  const book = result.data;
  if (book.storyId !== storyId || book.ownerId !== ownerId || book.revision !== marker.revision) {
    throw new PremiumBookContractError('Premium book manifest identity mismatch');
  }
  const integrated = book.editionLayout === 'embedded-lettering-v2';
  if (book.pages.length !== book.format.pageCount || (integrated && book.pages.length !== 33)) {
    throw new PremiumBookContractError('Premium book page count mismatch');
  }
  if (integrated) {
    const spec = book.specification;
    if (
      !spec ||
      spec.title.value !== book.opening.title ||
      spec.details[0].value !== book.opening.author
    ) {
      throw new PremiumBookContractError('Missing or inconsistent premium publication details');
    }
    const canonical = [
      ...[spec.title, ...spec.details].map(({ label, value }) => `${label}: ${value}`),
      spec.copyright,
      spec.rights,
      spec.promotion,
    ].join('\n');
    if (canonical !== book.pages[1].text) {
      throw new PremiumBookContractError('Premium publication details differ from the saved text');
    }
  }

  for (const [index, page] of book.pages.entries()) {
    const expected =
      openingKinds[index] ?? (index === 32 ? 'invitation' : index === 31 ? 'ending' : 'spread');
    if (page.number !== index + 1 || page.kind !== expected) {
      throw new PremiumBookContractError('Invalid premium book page order');
    }
    if (page.kind === 'invitation') {
      const [title, body] = page.text.split('\n\n');
      if (
        page.link?.href !== `https://mythoria.pt${premiumInvitationPath(book.opening.locale)}` ||
        !title?.trim() ||
        !body?.trim() ||
        page.artwork ||
        page.textBox
      ) {
        throw new PremiumBookContractError('Invalid premium book invitation');
      }
      if (page.reading) assertStoryImage(storyId, page.reading, 'png');
      continue;
    }
    if (page.link) throw new PremiumBookContractError('Unexpected premium book page link');
    if (index < 4) {
      if (integrated && (page.artwork || page.textBox)) {
        throw new PremiumBookContractError('Unexpected artwork on a premium opening text page');
      }
      if (page.reading) assertStoryImage(storyId, page.reading, 'png');
      continue;
    }
    const box = page.textBox;
    const isSilentLeft =
      page.kind === 'spread' &&
      page.number % 2 === 0 &&
      book.spreads[(page.number - 6) / 2]?.textLayout === 'right_only';
    const hasValidText = isSilentLeft ? page.text === '' : Boolean(page.text.trim());
    const hasValidBox =
      integrated || isSilentLeft
        ? box === undefined
        : box &&
          box.width > 0 &&
          box.height > 0 &&
          box.x + box.width <= 1 &&
          box.y + box.height <= 1;
    if (!page.reading || !page.artwork || !hasValidText || !hasValidBox) {
      throw new PremiumBookContractError('Incomplete premium book illustrated page');
    }
    assertStoryImage(storyId, page.reading, 'png');
    assertStoryImage(storyId, page.artwork, 'jpg');
  }
  const spreadIds = new Set<string>();
  for (const [index, spread] of book.spreads.entries()) {
    const left = 6 + index * 2;
    if (
      spreadIds.has(spread.id) ||
      spread.leftPage !== left ||
      spread.rightPage !== left + 1 ||
      book.pages[left - 1].spreadId !== spread.id ||
      book.pages[left].spreadId !== spread.id
    ) {
      throw new PremiumBookContractError('Invalid premium book spread order');
    }
    spreadIds.add(spread.id);
    assertStoryImage(storyId, spread.master, 'png');
  }
  assertStoryImage(storyId, book.covers.front, 'jpg');
  assertStoryImage(storyId, book.covers.back, 'jpg');
  if (book.motifArtwork) {
    if (!book.openingDesign)
      throw new PremiumBookContractError('Premium motif is missing an opening design');
    assertStoryImage(storyId, book.motifArtwork, 'png');
  }
  return book;
}

export async function downloadPremiumReadingImage(storyId: string, asset: PremiumBookAsset) {
  const extension = asset.key.endsWith('.png') ? 'png' : 'jpg';
  assertStoryImage(storyId, asset, extension);
  return {
    bytes: await downloadVerifiedAsset(asset, maxImageBytes),
    contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
  };
}

export function downloadPremiumAudio(asset: PremiumBookAsset) {
  return downloadVerifiedAsset(asset, maxPremiumAudiobookBytes);
}
