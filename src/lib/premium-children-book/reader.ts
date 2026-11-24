import { premiumInvitationPath, type PremiumBookManifest } from './contract';

export interface PremiumBookReaderData {
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
    image?: string;
    imageDescription?: string;
    link?: { href: string; label: string };
    textBox?: { x: number; y: number; width: number; height: number };
  }[];
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
  shareToken?: string,
): PremiumBookReaderData {
  const options = { revision: book.revision, shareToken };
  const imagePath = (image: string) => premiumBookImagePath(book.storyId, image, options);
  return {
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
      image: page.reading ? imagePath(String(page.number)) : undefined,
      imageDescription:
        page.kind === 'spread' && !page.text
          ? book.spreads.find((spread) => spread.id === page.spreadId)?.leftDescription
          : undefined,
      textBox: page.textBox,
      link:
        page.kind === 'invitation' && page.link
          ? { href: premiumInvitationPath(book.opening.locale), label: page.link.label }
          : undefined,
    })),
  };
}
