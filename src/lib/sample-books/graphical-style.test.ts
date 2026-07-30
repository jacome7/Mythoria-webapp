import { GraphicalStyle } from '@/types/story-enums';
import { getGraphicalStyleMessageKey } from './graphical-style';

describe('getGraphicalStyleMessageKey', () => {
  it('returns translation keys for graphical-style identifiers, regardless of case', () => {
    expect(getGraphicalStyleMessageKey({ style: 'REALISTIC' })).toBe(GraphicalStyle.REALISTIC);
    expect(getGraphicalStyleMessageKey({ style: 'digital_art' })).toBe(GraphicalStyle.DIGITAL_ART);
    expect(getGraphicalStyleMessageKey({ style: 'pixar' })).toBe(GraphicalStyle.PIXAR_STYLE);
  });

  it('keeps free-form labels available for direct display', () => {
    expect(getGraphicalStyleMessageKey({ style: 'Aguarela minimalista' })).toBeUndefined();
  });
});
