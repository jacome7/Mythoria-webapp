import { getSampleBooksCatalog } from './catalog';

describe('sample book catalog', () => {
  it('includes every legacy book and complete sample-book pack', async () => {
    const books = await getSampleBooksCatalog();

    expect(books).toHaveLength(79);
    expect(books.filter((book) => book.source === 'legacy')).toHaveLength(59);
    expect(books.filter((book) => book.source === 'sample-pack')).toHaveLength(20);
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
});
