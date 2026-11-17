import { isValidIntent, normalizeIntent, type StoryIntent } from '@/constants/intents';
import { isValidRecipient } from '@/constants/recipients';
import type { IntentContext } from '@/types/intent-context';
import { isStoryTemplateId } from '@/lib/story-templates/ids';
import { AD_CONTEXT_LIMITS } from '@/lib/openai-ads/types';

export const CAMPAIGN_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  '_gl',
  // OpenAI (ChatGPT Ads) click reference; read by the consent-gated Pixel SDK from the URL.
  'oppref',
] as const;

export const PUBLIC_REDIRECT_QUERY_KEYS = [...CAMPAIGN_QUERY_KEYS, 'ref'] as const;

export type CampaignQueryKey = (typeof CAMPAIGN_QUERY_KEYS)[number];
export type CampaignParams = Partial<Record<CampaignQueryKey, string>>;
export type CampaignSearchParams =
  { get(name: string): string | null } | Record<string, string | string[] | undefined>;

const MAX_QUERY_VALUE_LENGTH = 255;

/** OpenAI click references can exceed 255 characters; they get the same 512 cap as the server. */
function maxQueryValueLength(key: string): number {
  return key === 'oppref' ? AD_CONTEXT_LIMITS.oppref : MAX_QUERY_VALUE_LENGTH;
}

export function getFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getValidatedIntent(value: unknown): StoryIntent | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeIntent(value.trim());
  return isValidIntent(normalized) ? normalized : null;
}

export function parseIntentContext(value: string | undefined | null): IntentContext | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
    const intent = getValidatedIntent(parsed.intent);
    const recipient =
      typeof parsed.recipient === 'string' && isValidRecipient(parsed.recipient)
        ? parsed.recipient
        : undefined;

    if (!intent && !recipient) return null;
    return {
      ...(intent ? { intent } : {}),
      ...(recipient ? { recipient } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeIntentContext(context: IntentContext): string {
  return JSON.stringify(context);
}

export function readIntentContextFromDocumentCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): IntentContext | null {
  if (!cookieHeader) return null;
  const prefix = `${cookieName}=`;
  const entry = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  return entry ? parseIntentContext(entry.slice(prefix.length)) : null;
}

function readSearchParam(searchParams: CampaignSearchParams, key: string): string | undefined {
  return 'get' in searchParams && typeof searchParams.get === 'function'
    ? (searchParams.get(key) ?? undefined)
    : getFirstQueryValue((searchParams as Record<string, string | string[] | undefined>)[key]);
}

export function collectCampaignParams(searchParams: CampaignSearchParams): CampaignParams {
  return Object.fromEntries(
    CAMPAIGN_QUERY_KEYS.flatMap((key) => {
      const value = readSearchParam(searchParams, key)?.trim();
      return value && value.length <= maxQueryValueLength(key) ? [[key, value]] : [];
    }),
  ) as CampaignParams;
}

export function buildPublicRedirectSearch(
  searchParams: CampaignSearchParams,
  intent?: StoryIntent | null,
): URLSearchParams {
  const safe = new URLSearchParams();

  for (const key of PUBLIC_REDIRECT_QUERY_KEYS) {
    const value = readSearchParam(searchParams, key)?.trim();
    if (value && value.length <= maxQueryValueLength(key)) safe.set(key, value);
  }

  const validatedIntent = intent ?? getValidatedIntent(readSearchParam(searchParams, 'intent'));
  if (validatedIntent) safe.set('intent', validatedIntent);

  return safe;
}

export function buildStoryAuthReturnSearch(searchParams: CampaignSearchParams): URLSearchParams {
  const safe = new URLSearchParams();

  for (const key of ['landingSlug', 'ref', ...CAMPAIGN_QUERY_KEYS]) {
    const value = readSearchParam(searchParams, key)?.trim();
    if (value && value.length <= maxQueryValueLength(key)) safe.set(key, value);
  }

  const primaryIntent = getValidatedIntent(readSearchParam(searchParams, 'primaryIntent'));
  if (primaryIntent) safe.set('primaryIntent', primaryIntent);

  const templateId = readSearchParam(searchParams, 'templateId');
  if (isStoryTemplateId(templateId)) safe.set('templateId', templateId);

  return safe;
}
