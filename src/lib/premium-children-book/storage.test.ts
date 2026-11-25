/** @jest-environment node */

import { createHash } from 'node:crypto';
import fixture from './worker-manifest.fixture.json';
import { loadPublishedPremiumBook } from './storage';
import { toPremiumBookReaderData } from './reader';
import { readPremiumBookMarker } from './contract';
import { frozenPublicationDetails } from '@/test-utils/premium-publication';

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

  it('accepts a typeset left page facing a silent right illustration and rejects role mismatches', async () => {
    const mixed = {
      ...fixture,
      editionLayout: 'embedded-lettering-v2',
      spreadLayoutVersion: 1,
      audience: 'children_3-6',
      specification: frozenPublicationDetails,
      spreads: fixture.spreads.map((spread, index) =>
        index === 0
          ? {
              ...spread,
              composition: 'illustration_facing_text',
              textLayout: 'left_only',
              leftDescription: undefined,
              rightDescription: 'Uma raposa observa as estrelas.',
            }
          : { ...spread, composition: 'panorama' },
      ),
      pages: fixture.pages.map((page) => {
        const spread = fixture.spreads.find((item) => item.id === page.spreadId);
        const base = { ...page, textBox: undefined };
        if (page.number === 6)
          return {
            ...base,
            renderMode: 'typeset',
            artwork: undefined,
            text: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
          };
        if (page.number === 7) return { ...base, renderMode: 'illustration', text: '' };
        if (spread)
          return {
            ...base,
            renderMode:
              page.number === spread.leftPage && spread.textLayout === 'right_only'
                ? 'illustration'
                : 'embedded_art',
          };
        return base;
      }),
    };
    const load = (manifest: unknown) =>
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(manifest));
    const book = await load(mixed);
    if (!book) throw new Error('Fixture should load');
    for (const token of [undefined, 'shared-token']) {
      const view = toPremiumBookReaderData(book, token);
      expect(view.pages[5]).toMatchObject({
        renderMode: 'typeset',
        image: undefined,
        text: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
        previewImage: expect.stringContaining('/premium/6?'),
      });
      expect(view.pages[6]).toMatchObject({
        renderMode: 'illustration',
        text: '',
        imageDescription: 'Uma raposa observa as estrelas.',
        image: expect.stringContaining('/premium/7?'),
      });
    }
    const badPages = mixed.pages.map((page) =>
      page.number === 7 ? { ...page, renderMode: 'embedded_art' } : page,
    );
    await expect(load({ ...mixed, pages: badPages })).rejects.toThrow('page role');
    const missingReading = mixed.pages.map((page) =>
      page.number === 6 ? { ...page, reading: undefined } : page,
    );
    await expect(load({ ...mixed, pages: missingReading })).rejects.toThrow('Incomplete');
  });

  it('preserves a lower text panel and the canonical copy in the reader view', async () => {
    const updated = structuredClone(fixture);
    const page = updated.pages[updated.spreads[0].rightPage - 1];
    const box = { x: 0.1, y: 0.71, width: 0.8, height: 0.2 };
    page.textBox = box;
    const book = await loadPublishedPremiumBook(
      updated.storyId,
      updated.ownerId,
      storedFixture(updated),
    );
    if (!book) throw new Error('Fixture should load');
    const view = toPremiumBookReaderData(book);
    expect(view.pages[page.number - 1]).toMatchObject({ text: page.text, textBox: box });
    const left = fixture.pages[updated.spreads[0].leftPage - 1];
    expect(view.pages[left.number - 1].textBox).toEqual(left.textBox);
  });

  it('accepts illustrated lettering with a separate transcript, and rejects hybrid editions', async () => {
    const integrated = {
      ...fixture,
      editionLayout: 'embedded-lettering-v2',
      specification: frozenPublicationDetails,
      pages: fixture.pages.map((page) => ({ ...page, textBox: undefined })),
    };
    const load = (manifest: unknown) =>
      loadPublishedPremiumBook(fixture.storyId, fixture.ownerId, storedFixture(manifest));
    const book = await load(integrated);
    if (!book) throw new Error('Fixture should load');
    const view = toPremiumBookReaderData(book);
    expect(view.editionLayout).toEqual(integrated.editionLayout);
    expect(view.specification).toEqual(frozenPublicationDetails);
    expect(view.pages[4]).toMatchObject({ text: fixture.pages[4].text, textBox: undefined });
    expect(view.pages[1]).toMatchObject({ kind: 'copyright', image: undefined });
    await expect(load({ ...integrated, editionLayout: 'unknown' })).rejects.toThrow('manifest');
    await expect(
      load({ ...integrated, specification: { ...frozenPublicationDetails, rights: 'Edited' } }),
    ).rejects.toThrow('saved text');
    await expect(load({ ...integrated, pages: fixture.pages })).rejects.toThrow('Incomplete');
    await expect(load({ ...integrated, editionLayout: undefined })).rejects.toThrow('Incomplete');
    const specsWithPreview = integrated.pages.map((page) =>
      page.kind === 'copyright' ? { ...page, reading: fixture.pages[4].reading } : page,
    );
    const withPreview = await load({ ...integrated, pages: specsWithPreview });
    if (!withPreview) throw new Error('Fixture should load');
    expect(toPremiumBookReaderData(withPreview).pages[1]).toMatchObject({
      image: undefined,
      previewImage: `/api/stories/${fixture.storyId}/premium/2?revision=${fixture.revision}`,
    });
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
      reading: fixture.pages[4].reading,
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
    expect(toPremiumBookReaderData(view).pages.at(-1)?.previewImage).toContain('/premium/33?');

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
