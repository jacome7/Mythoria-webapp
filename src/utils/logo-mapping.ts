/**
 * Utility functions for mapping story graphical styles to logo images
 */

export type GraphicalStyle =
  | 'cartoon'
  | 'realistic'
  | 'watercolor'
  | 'digital_art'
  | 'hand_drawn'
  | 'minimalist'
  | 'vintage'
  | 'comic_book'
  | 'anime'
  | 'pixar_style'
  | 'disney_style'
  | 'sketch'
  | 'oil_painting'
  | 'colored_pencil';

/**
 * Maps graphical styles to their corresponding logo filenames
 */
const GRAPHICAL_STYLE_TO_LOGO: Record<GraphicalStyle, string> = {
  cartoon: 'cartoon.jpg',
  realistic: 'realistic.jpg',
  watercolor: 'watercolor.jpg',
  digital_art: 'digital_art.jpg',
  hand_drawn: 'hand_drawn.jpg',
  minimalist: 'minimalist.jpg',
  vintage: 'vintage.jpg',
  comic_book: 'comic_book.jpg',
  anime: 'anime.jpg',
  pixar_style: 'pixar.jpg',
  disney_style: 'disney.jpg',
  sketch: 'sketch.jpg',
  oil_painting: 'oil-painting.jpg',
  colored_pencil: 'colored_pencil.jpg',
};

/**
 * Gets the logo URL for a given graphical style
 * @param graphicalStyle - The graphical style of the story
 * @returns The full URL to the logo image
 */
export function getLogoForGraphicalStyle(graphicalStyle?: string): string {
  const baseUrl = 'https://mythoria.pt/images/logo/';

  if (!graphicalStyle) {
    return `${baseUrl}Logo.jpg`; // Default logo
  }

  const logoFilename = GRAPHICAL_STYLE_TO_LOGO[graphicalStyle as GraphicalStyle];
  return `${baseUrl}${logoFilename || 'Logo.jpg'}`;
}

/**
 * Gets the logo filename for a given graphical style (without full URL)
 * @param graphicalStyle - The graphical style of the story
 * @returns The logo filename
 */
export function getLogoFilename(graphicalStyle?: string): string {
  if (!graphicalStyle) {
    return 'Logo.jpg'; // Default logo
  }

  return GRAPHICAL_STYLE_TO_LOGO[graphicalStyle as GraphicalStyle] || 'Logo.jpg';
}
