import { GraphicalStyle } from '@/types/story-enums';
import type { SampleBook } from '@/types/sample-book';

const GRAPHICAL_STYLE_VALUES = new Set<string>(Object.values(GraphicalStyle));

/**
 * Returns the GraphicalStyles message key for a catalogued style. Free-form
 * labels are intentionally left undefined so callers can display them as-is.
 */
export function getGraphicalStyleMessageKey(
  book: Pick<SampleBook, 'style' | 'graphicalStyle'>,
): GraphicalStyle | undefined {
  const candidate = (book.graphicalStyle ?? book.style).trim().toLowerCase();

  // Some legacy sample books use this pre-enum spelling.
  if (candidate === 'pixar') return GraphicalStyle.PIXAR_STYLE;

  return GRAPHICAL_STYLE_VALUES.has(candidate) ? (candidate as GraphicalStyle) : undefined;
}
