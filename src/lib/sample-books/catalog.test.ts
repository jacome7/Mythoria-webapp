import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getSampleBooksCatalog } from './catalog';

const travelSlugs = [
  'a-leonor-e-o-segredo-do-oceanario',
  'o-verao-em-que-o-tomas-encontrou-uma-ilha',
  'o-mapa-dos-dias-que-eram-so-nossos',
  'a-road-trip-dos-planos-impossiveis',
  'o-quadro-que-piscou-o-olho',
  'o-dia-em-que-a-quinta-falou',
  'a-viagem-que-os-avos-tambem-viveram',
  'antes-que-a-estrada-acabe',
] as const;

const childrenSlugs = [
  'mia-e-a-pastelaria-da-lua',
  'tomas-e-o-mapa-das-portas-escondidas',
  'lia-e-o-jardim-das-palavras-perdidas',
  'a-equipa-que-marcou-um-golo-nas-estrelas',
  'ines-e-o-robo-feito-de-desenhos',
] as const;

describe('sample book catalog', () => {
  it('includes every legacy book and complete sample-book pack', async () => {
    const books = await getSampleBooksCatalog();

    expect(books).toHaveLength(92);
    expect(books.filter((book) => book.source === 'legacy')).toHaveLength(59);
    expect(books.filter((book) => book.source === 'sample-pack')).toHaveLength(33);
  });

  it('maps each Romance landing-page pack to the romance intent and exposes its audio', async () => {
    const books = await getSampleBooksCatalog();
    const romanceSlugs = [
      'duas-chavenas-uma-vida',
      'ines-e-diogo-um-amor-inesperado',
      'leonor-e-matilde-dois-paises-uma-casa',
      'o-nosso-primeiro-beijo-foi-so-o-principio',
      'rui-e-tomas-o-ultimo-capitulo-antes-do-sim',
    ];

    const romanceBooks = books.filter((book) => romanceSlugs.includes(book.slug));

    expect(romanceBooks).toHaveLength(5);
    expect(romanceBooks.every((book) => book.intent === 'romance')).toBe(true);
    expect(romanceBooks.every((book) => book.audioSampleSrc)).toBe(true);
  });

  it('does not expose an audio player for a pack without an audio file', async () => {
    const books = await getSampleBooksCatalog();
    const book = books.find((entry) => entry.slug === 'as-cartas-da-avo-rosa');

    expect(book?.audioSampleSrc).toBeUndefined();
  });

  it('maps all travel packs to canonical intents and exposes their complete media', async () => {
    const books = await getSampleBooksCatalog();
    const travelBooks = books.filter((book) =>
      travelSlugs.includes(book.slug as (typeof travelSlugs)[number]),
    );

    expect(travelBooks).toHaveLength(8);
    expect(
      travelBooks.every((book) =>
        ['family_travels', 'amusement_parks', 'learning_and_discovery', 'grandparents'].includes(
          book.intent,
        ),
      ),
    ).toBe(true);
    expect(travelBooks.every((book) => book.coverSrc.endsWith('/assets/cover.jpeg'))).toBe(true);
    expect(travelBooks.every((book) => book.featureSrc?.endsWith('/assets/feature.jpeg'))).toBe(
      true,
    );
    expect(travelBooks.every((book) => book.audioSampleSrc?.endsWith('/audio-teaser.mp3'))).toBe(
      true,
    );
    expect(travelBooks.every((book) => book.sampleChapterSrc?.endsWith('/sample-chapter.md'))).toBe(
      true,
    );
  });

  it('keeps every travel chapter within 600–900 words', async () => {
    for (const slug of travelSlugs) {
      const chapter = await readFile(
        join(process.cwd(), 'public', 'sample-books', slug, 'sample-chapter.md'),
        'utf8',
      );
      const body = chapter.replace(/^---[\s\S]*?---/, '').trim();
      const wordCount = body.split(/\s+/).length;

      expect(wordCount).toBeGreaterThanOrEqual(600);
      expect(wordCount).toBeLessThanOrEqual(900);
    }
  });

  it('exposes five complete Mythoria-created children books with their intended styles', async () => {
    const books = await getSampleBooksCatalog();
    const childrenBooks = books.filter((book) =>
      childrenSlugs.includes(book.slug as (typeof childrenSlugs)[number]),
    );

    expect(childrenBooks).toHaveLength(5);
    expect(childrenBooks.map((book) => book.graphicalStyle)).toEqual([
      'euro_comic_book',
      'colored_pencil',
      'watercolor',
      'claymation',
      'papercut',
    ]);
    expect(
      childrenBooks.every((book) => book.publicProvenance === 'mythoria_created_example'),
    ).toBe(true);
    expect(childrenBooks.every((book) => book.chapterImageSrc)).toBe(true);
    expect(childrenBooks.every((book) => book.audioSampleSrc)).toBe(true);
  });

  it('keeps every personalized-children chapter within 600–900 words', async () => {
    for (const slug of childrenSlugs) {
      const chapter = await readFile(
        join(process.cwd(), 'public', 'sample-books', slug, 'sample-chapter.md'),
        'utf8',
      );
      const body = chapter.replace(/^---[\s\S]*?---/, '').trim();
      const wordCount = body.split(/\s+/).length;

      expect(wordCount).toBeGreaterThanOrEqual(600);
      expect(wordCount).toBeLessThanOrEqual(900);
    }
  });
});
