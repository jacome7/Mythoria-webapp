import { getAlternateLocalePath, swapLocaleInPath } from './language-switcher';

describe('language switcher helpers', () => {
  it('uses the exact alternate locale path when available', () => {
    expect(getAlternateLocalePath('https://mythoria.pt/de-DE/blog/mythoria-ki-maschinenraum')).toBe(
      '/de-DE/blog/mythoria-ki-maschinenraum',
    );
  });

  it('preserves search and hash from alternate locale URLs', () => {
    expect(getAlternateLocalePath('/fr-FR/blog/fabrication-dun-livre?ref=header#top')).toBe(
      '/fr-FR/blog/fabrication-dun-livre?ref=header#top',
    );
  });

  it('falls back to swapping only the locale segment when no alternate exists', () => {
    expect(
      swapLocaleInPath('/pt-PT/blog/fabrication-dun-livre', 'de-DE', ['en-US', 'pt-PT', 'de-DE']),
    ).toBe('/de-DE/blog/fabrication-dun-livre');
  });
});
