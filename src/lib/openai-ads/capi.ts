/**
 * OpenAI (ChatGPT Ads) Conversions API transport. Server-only.
 *
 * `POST https://bzr.openai.com/v1/events?pid=<PIXEL_ID>` with `Authorization: Bearer <CAPI key>`.
 * One invalid event fails the whole batch (HTTP 400), so callers isolate bad events themselves.
 */
import type { OpenAiCustomEventName, OpenAiEventData, OpenAiEventType } from './events';

export const OPENAI_CAPI_ENDPOINT = 'https://bzr.openai.com/v1/events';
export const OPENAI_CAPI_INTEGRATION_SOURCE = 'mythoria-webapp';
export const OPENAI_CAPI_MAX_BATCH = 1000;
export const OPENAI_CAPI_TIMEOUT_MS = 10_000;
const ERROR_BODY_MAX_LENGTH = 500;

/** `user` object of a Conversions API event. Hashed fields are SHA-256 hex, at most 3 values. */
export interface OpenAiCapiUser {
  emails_sha256?: string[];
  phone_numbers_sha256?: string[];
  external_ids_sha256?: string[];
  first_names_sha256?: string[];
  last_names_sha256?: string[];
  /** Raw ISO 3166-1 alpha-2 codes, uppercase. */
  countries?: string[];
  /** Raw `__obref` cookie value. */
  obref?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface OpenAiCapiEvent {
  id: string;
  type: OpenAiEventType;
  custom_event_name?: OpenAiCustomEventName;
  timestamp_ms: number;
  action_source: 'web';
  source_url: string;
  oppref?: string;
  user?: OpenAiCapiUser;
  opt_out?: boolean;
  data: OpenAiEventData;
}

export interface OpenAiCapiRequestBody {
  integration_source: string;
  events: OpenAiCapiEvent[];
}

export type OpenAiCapiResult =
  { ok: true } | { ok: false; status?: number; retryable: boolean; error: string };

function capiCredentials(): { apiKey: string; pixelId: string } | null {
  const apiKey = process.env.OPENAI_ADS_CAPI_KEY?.trim();
  const pixelId = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID?.trim();
  return apiKey && pixelId ? { apiKey, pixelId } : null;
}

/** True when both the Conversions API key and the Pixel ID are configured. */
export function isOpenAiCapiConfigured(): boolean {
  return capiCredentials() !== null;
}

export function buildOpenAiCapiRequestBody(events: OpenAiCapiEvent[]): OpenAiCapiRequestBody {
  return {
    integration_source: OPENAI_CAPI_INTEGRATION_SOURCE,
    events,
  };
}

const isRetryableStatus = (status: number): boolean => status === 429 || status >= 500;

async function readErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, ERROR_BODY_MAX_LENGTH);
  } catch {
    return '';
  }
}

/** Sends one batch (1-1000 events). Never throws. */
export async function sendOpenAiEvents(events: OpenAiCapiEvent[]): Promise<OpenAiCapiResult> {
  if (events.length === 0) return { ok: true };
  if (events.length > OPENAI_CAPI_MAX_BATCH) {
    return {
      ok: false,
      retryable: false,
      error: `Batch exceeds ${OPENAI_CAPI_MAX_BATCH} events`,
    };
  }
  const credentials = capiCredentials();
  if (!credentials) {
    return { ok: false, retryable: true, error: 'OpenAI Conversions API is not configured' };
  }

  const url = `${OPENAI_CAPI_ENDPOINT}?pid=${encodeURIComponent(credentials.pixelId)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_CAPI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOpenAiCapiRequestBody(events)),
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    const body = await readErrorBody(response);
    return {
      ok: false,
      status: response.status,
      retryable: isRetryableStatus(response.status),
      error: `HTTP ${response.status}${body ? ` ${body}` : ''}`.slice(0, ERROR_BODY_MAX_LENGTH),
    };
  } catch (error) {
    const aborted = controller.signal.aborted;
    return {
      ok: false,
      retryable: true,
      error: aborted
        ? `Request timed out after ${OPENAI_CAPI_TIMEOUT_MS}ms`
        : (error instanceof Error ? error.message : String(error)).slice(0, ERROR_BODY_MAX_LENGTH),
    };
  } finally {
    clearTimeout(timeout);
  }
}
