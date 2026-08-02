import { resolveLocaleFallback } from './heroManifest';

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
