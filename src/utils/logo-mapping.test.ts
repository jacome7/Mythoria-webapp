import { GraphicalStyle } from '@/types/story-enums';
import { getLogoFilename, getLogoForGraphicalStyle } from './logo-mapping';

describe('graphical-style logo mapping', () => {
  it.each([
    [GraphicalStyle.CLAYMATION, 'claymation.jpg'],
    [GraphicalStyle.PAPERCUT, 'papercut.jpg'],
  ])('maps %s to its style-specific logo', (style, filename) => {
    expect(getLogoFilename(style)).toBe(filename);
    expect(getLogoForGraphicalStyle(style)).toBe(`https://mythoria.pt/images/logo/${filename}`);
  });

  it('keeps the default logo fallback for unknown values', () => {
    expect(getLogoFilename('unknown')).toBe('Logo.jpg');
  });
});
