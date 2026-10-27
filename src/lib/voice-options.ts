/**
 * Voice Options Utility
 * Provides voice options based on the configured TTS provider
 */

export type TTSProvider = 'openai' | 'google-genai';

export interface VoiceOption {
  value: string;
  labelKey: string; // Translation key for the voice name
  descriptionKey: string; // Translation key for the voice description
}

/**
 * OpenAI TTS voices - all 11 voices available
 */
const OPENAI_VOICES: VoiceOption[] = [
  { value: 'alloy', labelKey: 'names.alloy', descriptionKey: 'descriptions.alloy' },
  { value: 'ash', labelKey: 'names.ash', descriptionKey: 'descriptions.ash' },
  { value: 'ballad', labelKey: 'names.ballad', descriptionKey: 'descriptions.ballad' },
  { value: 'coral', labelKey: 'names.coral', descriptionKey: 'descriptions.coral' },
  { value: 'echo', labelKey: 'names.echo', descriptionKey: 'descriptions.echo' },
  { value: 'fable', labelKey: 'names.fable', descriptionKey: 'descriptions.fable' },
  { value: 'nova', labelKey: 'names.nova', descriptionKey: 'descriptions.nova' },
  { value: 'onyx', labelKey: 'names.onyx', descriptionKey: 'descriptions.onyx' },
  { value: 'sage', labelKey: 'names.sage', descriptionKey: 'descriptions.sage' },
  { value: 'shimmer', labelKey: 'names.shimmer', descriptionKey: 'descriptions.shimmer' },
  { value: 'verse', labelKey: 'names.verse', descriptionKey: 'descriptions.verse' },
];

/**
 * Google Gemini TTS voices - curated 8 voices for storytelling
 * Selected for diverse characteristics suitable for audiobooks
 */
const GEMINI_VOICES: VoiceOption[] = [
  { value: 'Charon', labelKey: 'names.charon', descriptionKey: 'descriptions.charon' },
  { value: 'Aoede', labelKey: 'names.aoede', descriptionKey: 'descriptions.aoede' },
  { value: 'Puck', labelKey: 'names.puck', descriptionKey: 'descriptions.puck' },
  { value: 'Kore', labelKey: 'names.kore', descriptionKey: 'descriptions.kore' },
  { value: 'Fenrir', labelKey: 'names.fenrir', descriptionKey: 'descriptions.fenrir' },
  { value: 'Orus', labelKey: 'names.orus', descriptionKey: 'descriptions.orus' },
  { value: 'Zephyr', labelKey: 'names.zephyr', descriptionKey: 'descriptions.zephyr' },
  { value: 'Sulafat', labelKey: 'names.sulafat', descriptionKey: 'descriptions.sulafat' },
];

/**
 * Default voices per provider
 */
const DEFAULT_VOICES: Record<TTSProvider, string> = {
  openai: 'coral',
  'google-genai': 'Sulafat',
};

/**
 * Get the configured TTS provider from environment
 */
export function getTTSProvider(): TTSProvider {
  const provider = process.env.NEXT_PUBLIC_TTS_PROVIDER;
  if (provider === 'google-genai') {
    return 'google-genai';
  }
  if (provider === 'openai') {
    return 'openai';
  }
  return 'google-genai'; // Default to Gemini TTS
}

/**
 * Recommended Gemini voice per audience group.
 * Mirrors SGW `voice-registry` `resolveDefaultVoice` and must be kept in sync.
 * Groups follow SGW `extractTargetAge` (src/shared/utils.ts):
 * toddlers (children_0-2), children (children_3-6, 7-10, 11-14),
 * young adults (young_adult_15-17), adults (adult_18+), all_ages / unknown.
 */
export const GEMINI_RECOMMENDED_VOICE_BY_AUDIENCE: Record<string, string> = {
  'children_0-2': 'Sulafat',
  'children_3-6': 'Puck',
  'children_7-10': 'Puck',
  'children_11-14': 'Puck',
  'young_adult_15-17': 'Zephyr',
  'adult_18+': 'Charon',
  all_ages: 'Sulafat',
};

/**
 * Get the recommended voice for a provider and story target audience
 */
export function getRecommendedVoice(
  provider?: TTSProvider,
  targetAudience?: string | null,
): string {
  const activeProvider = provider ?? getTTSProvider();
  if (activeProvider !== 'google-genai') {
    return DEFAULT_VOICES[activeProvider] ?? DEFAULT_VOICES['openai'];
  }
  return (
    (targetAudience && GEMINI_RECOMMENDED_VOICE_BY_AUDIENCE[targetAudience]) ||
    DEFAULT_VOICES['google-genai']
  );
}

/**
 * Get available voice options for the configured TTS provider
 */
export function getAvailableVoices(provider?: TTSProvider): VoiceOption[] {
  const activeProvider = provider ?? getTTSProvider();
  switch (activeProvider) {
    case 'google-genai':
      return GEMINI_VOICES;
    case 'openai':
    default:
      return OPENAI_VOICES;
  }
}

/**
 * Get the default voice for the configured TTS provider
 */
export function getDefaultVoice(provider?: TTSProvider): string {
  const activeProvider = provider ?? getTTSProvider();
  return DEFAULT_VOICES[activeProvider] ?? DEFAULT_VOICES['openai'];
}

/**
 * Check if a voice is valid for the given provider
 */
export function isValidVoice(voice: string, provider?: TTSProvider): boolean {
  const voices = getAvailableVoices(provider);
  return voices.some((v) => v.value === voice);
}

/**
 * Get voice option by value
 */
export function getVoiceOption(voice: string, provider?: TTSProvider): VoiceOption | undefined {
  const voices = getAvailableVoices(provider);
  return voices.find((v) => v.value === voice);
}
