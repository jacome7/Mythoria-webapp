import { premiumInvitationPath, type PremiumBookManifest } from './contract';

interface PremiumPageTextEdit {
  value: string;
  maxLength: number;
  allowEmpty?: boolean;
}

export interface PremiumBookReaderData {
  revision?: string;
  editionLayout?: PremiumBookManifest['editionLayout'];
  audience?: PremiumBookManifest['audience'];
  specification?: PremiumBookManifest['specification'];
  title: string;
  locale: string;
  synopsis: string;
  openingDesign?: PremiumBookManifest['openingDesign'];
  motifImage?: string;
  front: string;
  back: string;
  pages: {
    number: number;
    kind: PremiumBookManifest['pages'][number]['kind'];
    text: string;
    textEdit?: PremiumPageTextEdit;
    renderMode?: PremiumBookManifest['pages'][number]['renderMode'];
    composition?: PremiumBookManifest['spreads'][number]['composition'];
    image?: string;
    previewImage?: string;
    imageDescription?: string;
    link?: { href: string; label: string };
    textBox?: { x: number; y: number; width: number; height: number };
  }[];
}

function getTextEdit(
  book: PremiumBookManifest,
  page: PremiumBookManifest['pages'][number],
): PremiumPageTextEdit | undefined {
  if (page.kind === 'dedication') {
    return { value: book.opening.dedication, maxLength: 2000, allowEmpty: true };
  }
  if (page.kind === 'synopsis') return { value: book.opening.synopsis, maxLength: 600 };
  if (page.renderMode === 'typeset') return { value: page.text, maxLength: 420 };
  if (!book.editionLayout && page.renderMode === undefined && page.textBox && page.text) {
    return { value: page.text, maxLength: 110 };
  }
  return undefined;
}

export function premiumBookImagePath(
  storyId: string,
  image: string,
  options: { revision?: string; shareToken?: string } = {},
) {
  const query = new URLSearchParams();
  if (options.revision) query.set('revision', options.revision);
  if (options.shareToken) query.set('share', options.shareToken);
  return `/api/stories/${storyId}/premium/${image}${query.size ? `?${query}` : ''}`;
}

export function toPremiumBookReaderData(
  book: PremiumBookManifest,
  { shareToken, owned = false }: { shareToken?: string; owned?: boolean } = {},
): PremiumBookReaderData {
  const options = { revision: book.revision, shareToken };
  const imagePath = (image: string) => premiumBookImagePath(book.storyId, image, options);
  return {
    revision: book.revision,
    editionLayout: book.editionLayout,
    audience: book.audience,
    specification: book.specification,
    title: book.opening.title,
    locale: book.opening.locale,
    synopsis: book.opening.synopsis,
    openingDesign: book.openingDesign,
    motifImage: book.motifArtwork ? imagePath('motif') : undefined,
    front: imagePath('front'),
    back: imagePath('back'),
    pages: book.pages.map((page) => ({
      number: page.number,
      kind: page.kind,
      text: page.text,
      textEdit: owned ? getTextEdit(book, page) : undefined,
      renderMode: page.renderMode,
      composition: book.spreads.find((spread) => spread.id === page.spreadId)?.composition,
      image: page.reading && page.artwork ? imagePath(String(page.number)) : undefined,
      previewImage: page.reading ? imagePath(String(page.number)) : undefined,
      imageDescription:
        page.kind === 'spread' && !page.text
          ? page.number % 2 === 0
            ? book.spreads.find((spread) => spread.id === page.spreadId)?.leftDescription
            : book.spreads.find((spread) => spread.id === page.spreadId)?.rightDescription
          : undefined,
      textBox: page.textBox,
      link:
        page.kind === 'invitation' && page.link
          ? { href: premiumInvitationPath(book.opening.locale), label: page.link.label }
          : undefined,
    })),
  };
}
