import { resolveLocaleFallback, resolvePersons } from './heroManifest';

describe('resolveLocaleFallback', () => {
  const variants = [
    { file: 'person_en-US.webp', locale: 'en-US' },
    { file: 'person_es-ES.webp', locale: 'es-ES' },
    { file: 'person_pt-PT.webp', locale: 'pt-PT' },
  ];

  it('prefers the exact locale, then en-US', () => {
    expect(resolveLocaleFallback(variants, 'es-ES')?.file).toBe('person_es-ES.webp');
    expect(resolveLocaleFallback(variants, 'de-DE')?.file).toBe('person_en-US.webp');
  });

  it('uses pt-PT before another available locale when en-US is absent', () => {
    const withoutEnglish = variants.filter((variant) => variant.locale !== 'en-US');

    expect(resolveLocaleFallback(withoutEnglish, 'de-DE')?.file).toBe('person_pt-PT.webp');
  });
});

describe('hero portraits', () => {
  it('shows the sports portrait once per locale', () => {
    for (const locale of ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']) {
      expect(resolvePersons('sports_teams', locale).map(({ src }) => src)).toEqual([
        '/homepage/sports_teams/person1_pt-PT.webp',
      ]);
    }
  });

  it('limits the third fantasy portrait to the languages printed on its covers', () => {
    const thirdPortraits = (locale: string) =>
      resolvePersons('kids_fantasy', locale)
        .map(({ src }) => src)
        .filter((src) => src.includes('/person3_'));
    expect(thirdPortraits('es-ES')).toEqual(['/homepage/kids_fantasy/person3_es-ES.webp']);
    expect(thirdPortraits('pt-PT')).toEqual(['/homepage/kids_fantasy/person3_pt-PT.webp']);
    for (const locale of ['en-US', 'fr-FR', 'de-DE']) {
      expect(thirdPortraits(locale)).toEqual([]);
    }
  });
});
