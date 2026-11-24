/** @jest-environment node */

import { createHash } from 'node:crypto';
import fixture from './worker-manifest.fixture.json';
import { loadPublishedPremiumBook } from './storage';
import { toPremiumBookReaderData } from './reader';
import { readPremiumBookMarker } from './contract';

const mockDownload = jest.fn();
const mockFile = jest.fn(() => ({ download: mockDownload }));
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({ bucket: jest.fn(() => ({ file: mockFile })) })),
}));

function storedFixture(manifest: unknown = fixture) {
  const bytes = Buffer.from(JSON.stringify(manifest));
  mockDownload.mockResolvedValue([bytes]);
  return {
    premiumBook: {
      version: 1,
      type: 'premium_children',
      state: 'published',
      revision: fixture.revision,
      ownerId: fixture.ownerId,
      audience: 'children_3-6',
      manifest: {
        key: `${fixture.storyId}/premium/revisions/${fixture.revision}/manifest.json`,
        generation: '1876543210987654',
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
      },
    },
  };
}

describe('premium manifest storage and reader contract', () => {
  const initialBucket = process.env.PREMIUM_BOOK_BUCKET;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PREMIUM_BOOK_BUCKET = 'private-test-bucket';
  });
  afterAll(() => {
    if (initialBucket) process.env.PREMIUM_BOOK_BUCKET = initialBucket;
    else delete process.env.PREMIUM_BOOK_BUCKET;
  });

  it('reads the SGW-generated mixed-layout fixture and exposes only authorized derivative paths', async () => {
    const features = storedFixture();
    const book = await loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, features);
    expect(book?.pages).toHaveLength(33);
    expect(mockFile).toHaveBeenCalledWith(features.premiumBook.manifest.key, {
      generation: 1876543210987654,
    });
    expect(book?.spreads[0].master.key).toMatch(/\.png$/);
    if (!book) throw new Error('Fixture should load');
    const view = toPremiumBookReaderData(book, 'shared-token');
    const silentSpread = book.spreads.find((spread) => spread.textLayout === 'right_only');
    if (!silentSpread) throw new Error('Fixture should include a silent left page');
    expect(silentSpread.leftDescription).toContain('a Inês');
    expect(view.pages[silentSpread.leftPage - 1]).toMatchObject({
      text: '',
      imageDescription: silentSpread.leftDescription,
      image: expect.stringContaining('share=shared-token'),
    });
    expect(view.pages[silentSpread.rightPage - 1].text).toContain('à');
    expect(JSON.stringify(view)).not.toContain(fixture.spreads[0].master.sha256);
    expect(JSON.stringify(view)).not.toContain('/assets/');
    expect(JSON.stringify(view)).not.toContain(fixture.spreads[0].action);
  });

  it('accepts the legacy two-text spread default and rejects a textless legacy spread', async () => {
    const legacy = structuredClone(fixture);
    for (const spread of legacy.spreads) {
      if (spread.textLayout === 'right_only') {
        legacy.pages[spread.leftPage - 1].text = 'A Inês sorriu.';
        legacy.pages[spread.leftPage - 1].textBox = legacy.pages[spread.rightPage - 1].textBox;
      }
      Object.assign(spread, { textLayout: undefined });
    }
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(legacy)),
    ).resolves.not.toBeNull();
    legacy.pages[5].text = '';
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(legacy)),
    ).rejects.toThrow('Incomplete');
  });

  it('projects a registered opening design and preserves an omitted legacy design', async () => {
    const openingDesign = { background: '#f9efd9', motif: 'paper_boat' };
    const designed = await loadPublishedPremiumBook(
      fixture.storyId,
      fixture.ownerId,
      storedFixture({ ...fixture, openingDesign }),
    );
    if (!designed) throw new Error('Fixture should load');
    expect(toPremiumBookReaderData(designed).openingDesign).toEqual(openingDesign);
    expect(
      toPremiumBookReaderData({ ...designed, openingDesign: undefined }).openingDesign,
    ).toBeUndefined();
    await expect(
      loadPublishedPremiumBook(
        fixture.storyId,
        fixture.ownerId,
        storedFixture({
          ...fixture,
          openingDesign: { ...openingDesign, motif: 'https://example.test/motif.svg' },
        }),
      ),
    ).rejects.toThrow('Invalid premium book manifest');
  });

  it('rejects mismatched identity, incorrect bytes, cross-story assets, and unknown versions', async () => {
    const features = storedFixture();
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.storyId, features),
    ).rejects.toThrow('identity mismatch');
    mockDownload.mockResolvedValue([Buffer.from('altered')]);
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, features),
    ).rejects.toThrow('verification failed');
    const foreign = structuredClone(fixture);
    foreign.covers.front.key = foreign.covers.front.key.replace(fixture.storyId, fixture.ownerId);
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(foreign)),
    ).rejects.toThrow('image reference');
    expect(() => readPremiumBookMarker({ premiumBook: { version: 2 } })).toThrow(
      'Invalid premium book marker',
    );
    expect(readPremiumBookMarker({ ebook: true })).toBeNull();
  });

  it('rejects a generation the Storage SDK would round without reading the latest object', async () => {
    const features = storedFixture();
    features.premiumBook.manifest.generation = '9876543210987654';
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, features),
    ).rejects.toThrow('Invalid premium book asset generation');
    expect(mockFile).not.toHaveBeenCalled();
  });

  it('preserves historical 32-page editions and validates the new final invitation', async () => {
    const historical = {
      ...fixture,
      pages: fixture.pages.slice(0, 32),
      format: { ...fixture.format, pageCount: 32 },
    };
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(historical)),
    ).resolves.toMatchObject({
      format: { pageCount: 32 },
    });
    const invitation = {
      number: 33,
      kind: 'invitation',
      text: 'Gostaste desta história?\n\nAgora é a tua vez.',
      link: {
        href: 'https://mythoria.pt/pt-PT/tell-your-story',
        label: 'Cria a tua história na Mythoria',
      },
    };
    const modern = {
      ...fixture,
      pages: [...fixture.pages.slice(0, 32), invitation],
      format: { ...fixture.format, pageCount: 33 },
    };
    const view = await loadPublishedPremiumBook(
      fixture.storyId,
      fixture.ownerId,
      storedFixture(modern),
    );
    expect(view?.pages).toHaveLength(33);
    if (!view) throw new Error('Invitation fixture should load');
    expect(toPremiumBookReaderData(view).pages.at(-1)?.link).toEqual({
      ...invitation.link,
      href: '/pt-PT/tell-your-story',
    });

    await expect(
      loadPublishedPremiumBook(
        fixture.storyId,
        fixture.ownerId,
        storedFixture({
          ...modern,
          format: { ...modern.format, pageCount: 32 },
        }),
      ),
    ).rejects.toThrow('page count mismatch');
    invitation.link.href = 'https://example.test/pt-PT/tell-your-story';
    await expect(
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(modern)),
    ).rejects.toThrow('Invalid premium book invitation');
  });

  it('projects one private generated motif path and retains the curated fallback on older editions', async () => {
    const openingDesign = { background: '#f9efd9', motif: 'paper_boat' };
    const motifArtwork = fixture.pages[4].reading;
    const features = storedFixture({ ...fixture, openingDesign, motifArtwork });
    const designed = await loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, features);
    if (!designed) throw new Error('Fixture should load');
    expect(toPremiumBookReaderData(designed, 'viewer').motifImage).toBe(
      `/api/stories/${fixture.storyId}/premium/motif?revision=${fixture.revision}&share=viewer`,
    );
    expect(toPremiumBookReaderData({ ...designed, motifArtwork: undefined })).toMatchObject({
      openingDesign,
      motifImage: undefined,
    });
    await expect(
      loadPublishedPremiumBook(
        fixture.storyId,
        fixture.ownerId,
        storedFixture({ ...fixture, motifArtwork }),
      ),
    ).rejects.toThrow('missing an opening design');
  });
});
