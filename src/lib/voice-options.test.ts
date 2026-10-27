import { getRecommendedVoice, getTTSProvider, isValidVoice } from './voice-options';

describe('voice-options', () => {
  const original = process.env.NEXT_PUBLIC_TTS_PROVIDER;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_TTS_PROVIDER;
    else process.env.NEXT_PUBLIC_TTS_PROVIDER = original;
  });

  it('defaults the provider to google-genai and honors the openai override', () => {
    delete process.env.NEXT_PUBLIC_TTS_PROVIDER;
    expect(getTTSProvider()).toBe('google-genai');
    process.env.NEXT_PUBLIC_TTS_PROVIDER = 'openai';
    expect(getTTSProvider()).toBe('openai');
  });

  it.each([
    ['children_0-2', 'Sulafat'],
    ['children_3-6', 'Puck'],
    ['children_7-10', 'Puck'],
    ['children_11-14', 'Puck'],
    ['young_adult_15-17', 'Zephyr'],
    ['adult_18+', 'Charon'],
    ['all_ages', 'Sulafat'],
    ['unknown', 'Sulafat'],
    [null, 'Sulafat'],
  ])('recommends for %s on gemini', (audience, voice) => {
    expect(getRecommendedVoice('google-genai', audience)).toBe(voice);
    expect(isValidVoice(voice, 'google-genai')).toBe(true);
  });

  it('returns coral for openai', () => {
    expect(getRecommendedVoice('openai', 'adult_18+')).toBe('coral');
  });
});
