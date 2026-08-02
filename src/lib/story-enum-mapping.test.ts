import { GraphicalStyle } from '@/types/story-enums';
import { isValidGraphicalStyle, mapToGraphicalStyle } from './story-enum-mapping';

describe('graphical style mapping', () => {
  it.each([
    ['claymation', GraphicalStyle.CLAYMATION],
    ['Clay animation', GraphicalStyle.CLAYMATION],
    ['plasticine', GraphicalStyle.CLAYMATION],
    ['PaperCut', GraphicalStyle.PAPERCUT],
    ['paper-cut', GraphicalStyle.PAPERCUT],
    ['layered paper', GraphicalStyle.PAPERCUT],
  ])('maps %s to its canonical graphical style', (input, expected) => {
    expect(mapToGraphicalStyle(input)).toBe(expected);
  });

  it('validates both new canonical identifiers', () => {
    expect(isValidGraphicalStyle('claymation')).toBe(true);
    expect(isValidGraphicalStyle('papercut')).toBe(true);
  });
});
