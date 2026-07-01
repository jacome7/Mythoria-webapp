import { z } from 'zod';

import { getKeyInvoiceApiUrl, requireKeyInvoiceApiKey } from './config';

const authenticateSchema = z.object({
  Status: z.literal(1),
  Sid: z.string().min(1),
});

const keyInvoiceErrorSchema = z.object({
  Status: z.literal(0),
  ErrorMessage: z.string().optional(),
});

const baseSuccessSchema = z.object({
  Status: z.literal(1),
  Data: z.unknown().optional(),
});

export const insertDocumentResultSchema = z.object({
  DocType: z.union([z.string(), z.number()]).transform(String),
  DocSeries: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => value?.toString()),
  DocNum: z.union([z.string(), z.number()]).transform(String),
  FullDocNumber: z.string().optional(),
});

export const getDocumentResultSchema = z.object({
  DocType: z.union([z.string(), z.number()]).transform(String),
  DocSeries: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => value?.toString()),
  DocNum: z.union([z.string(), z.number()]).transform(String),
  FullDocNumber: z.string().optional(),
  Date: z.string().optional(),
  IdClient: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => value?.toString()),
  VATIN: z.string().optional(),
  ClientName: z.string().optional(),
  NetTotal: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => value?.toString()),
  TaxTotal: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => value?.toString()),
  GrossTotal: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => value?.toString()),
  ATDocCodeID: z.string().optional(),
  Voided: z.unknown().optional(),
});

export const getDocumentPdfResultSchema = z.object({
  DocumentBinary: z.string().min(1),
});

export const insertClientResultSchema = z.object({
  Id: z.union([z.string(), z.number()]).transform(String),
});

export const getClientResultSchema = z.object({
  IdClient: z.union([z.string(), z.number()]).transform(String),
  VATIN: z.string(),
  Name: z.string(),
  Address: z.string().optional(),
  Locality: z.string().optional(),
  PostalCode: z.string().optional(),
  Phone: z.string().optional(),
  Email: z.string().optional(),
  CountryCode: z.string().optional(),
});

export const companyResultSchema = z.object({
  VATIN: z.string().optional(),
  Name: z.string().optional(),
  Email: z.string().optional(),
});

export const taxesResultSchema = z.object({
  Taxes: z
    .array(
      z.object({
        Id: z.union([z.string(), z.number()]).transform(String),
        Value: z.union([z.string(), z.number()]).transform(String),
        ExemptionReason: z.string().optional(),
        ExemptionReasonCode: z.string().optional(),
      }),
    )
    .default([]),
});

export const documentSeriesResultSchema = z.object({
  Series: z
    .array(
      z.object({
        IdSerie: z.union([z.string(), z.number()]).transform(String),
        Name: z.string().optional(),
        Ref: z.string().optional(),
      }),
    )
    .default([]),
});

export const paymentMethodsResultSchema = z.object({
  Payments: z
    .array(
      z.object({
        IdPayment: z.union([z.string(), z.number()]).transform(String),
        Name: z.string().optional(),
      }),
    )
    .default([]),
});

export type InsertDocumentResult = z.infer<typeof insertDocumentResultSchema>;
export type GetDocumentResult = z.infer<typeof getDocumentResultSchema>;
export type GetDocumentPdfResult = z.infer<typeof getDocumentPdfResultSchema>;
export type InsertClientResult = z.infer<typeof insertClientResultSchema>;
export type GetClientResult = z.infer<typeof getClientResultSchema>;

type KeyInvoicePayload = Record<string, unknown>;

interface SessionCache {
  sid: string;
  expiresAt: number;
}

let sessionCache: SessionCache | null = null;

const TRANSPORT_RETRY_ATTEMPTS = 3;
const TRANSPORT_RETRY_BASE_DELAY_MS = 100;

export class KeyInvoiceApiError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly statusCode?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'KeyInvoiceApiError';
  }
}

function getCachedSid(): string | null {
  if (!sessionCache) return null;
  if (Date.now() + 300_000 >= sessionCache.expiresAt) {
    sessionCache = null;
    return null;
  }
  return sessionCache.sid;
}

function sanitizeHeaders(headers: HeadersInit): HeadersInit {
  const safeHeaders = new Headers(headers);
  safeHeaders.delete('Apikey');
  safeHeaders.delete('Sid');
  return safeHeaders;
}

function errorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
}

function nestedCause(error: unknown): unknown {
  return errorRecord(error)?.cause;
}

function transportErrorCode(error: unknown): string | undefined {
  const directCode = errorRecord(error)?.code;
  if (typeof directCode === 'string') return directCode;

  const causeCode = errorRecord(nestedCause(error))?.code;
  return typeof causeCode === 'string' ? causeCode : undefined;
}

function transportErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'unknown transport error';
}

function serializeTransportError(error: unknown): Record<string, unknown> {
  const cause = nestedCause(error);
  return {
    name: error instanceof Error ? error.name : undefined,
    message: transportErrorMessage(error),
    code: transportErrorCode(error),
    cause:
      cause instanceof Error
        ? {
            name: cause.name,
            message: cause.message,
            code: transportErrorCode(cause),
          }
        : cause,
  };
}

function isRetryableTransportError(error: unknown): boolean {
  const code = transportErrorCode(error);
  if (
    code &&
    [
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_SOCKET',
      'ECONNRESET',
      'ETIMEDOUT',
      'EAI_AGAIN',
    ].includes(code)
  ) {
    return true;
  }

  return error instanceof TypeError && /fetch failed|network/i.test(error.message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postKeyInvoice(
  body: KeyInvoicePayload,
  headers: HeadersInit,
  options: { retryTransport?: boolean } = {},
): Promise<{ status: number; json: unknown }> {
  const method = String(body.method || 'unknown');
  const attempts = options.retryTransport === false ? 1 : TRANSPORT_RETRY_ATTEMPTS;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetch(getKeyInvoiceApiUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      break;
    } catch (error) {
      if (attempt < attempts && isRetryableTransportError(error)) {
        await sleep(TRANSPORT_RETRY_BASE_DELAY_MS * attempt);
        continue;
      }

      const code = transportErrorCode(error);
      const codeSuffix = code ? ` (${code})` : '';
      throw new KeyInvoiceApiError(
        `KeyInvoice ${method} transport failed${codeSuffix}: ${transportErrorMessage(error)}`,
        method,
        undefined,
        {
          headers: sanitizeHeaders(headers),
          attempt,
          attempts,
          cause: serializeTransportError(error),
        },
      );
    }
  }

  if (!response) {
    throw new KeyInvoiceApiError(`KeyInvoice ${method} transport failed`, method);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new KeyInvoiceApiError(
      `KeyInvoice returned a non-JSON response (${response.status})`,
      method,
      response.status,
      { headers: sanitizeHeaders(headers) },
    );
  }

  return { status: response.status, json };
}

async function authenticate(force = false): Promise<string> {
  if (!force) {
    const cached = getCachedSid();
    if (cached) return cached;
  }

  const apiKey = requireKeyInvoiceApiKey();
  const { status, json } = await postKeyInvoice(
    { method: 'authenticate' },
    {
      Apikey: apiKey,
      'Content-Type': 'application/json',
    },
    { retryTransport: true },
  );

  if (status < 200 || status >= 300) {
    throw new KeyInvoiceApiError(
      'KeyInvoice authentication transport failed',
      'authenticate',
      status,
    );
  }

  const parsed = authenticateSchema.safeParse(json);
  if (!parsed.success) {
    const keyInvoiceError = keyInvoiceErrorSchema.safeParse(json);
    throw new KeyInvoiceApiError(
      keyInvoiceError.success
        ? keyInvoiceError.data.ErrorMessage || 'KeyInvoice authentication failed'
        : 'Invalid KeyInvoice authentication response',
      'authenticate',
      status,
      json,
    );
  }

  sessionCache = {
    sid: parsed.data.Sid,
    expiresAt: Date.now() + 3_600_000,
  };

  return parsed.data.Sid;
}

async function callRaw(
  method: string,
  payload: KeyInvoicePayload = {},
  options: { retryAuth?: boolean; allowStatus0?: boolean; retryTransport?: boolean } = {},
): Promise<unknown> {
  const sid = await authenticate();
  const { status, json } = await postKeyInvoice(
    { ...payload, method },
    {
      Sid: sid,
      'Content-Type': 'application/json',
    },
    { retryTransport: options.retryTransport !== false },
  );

  if (status < 200 || status >= 300) {
    throw new KeyInvoiceApiError(`KeyInvoice ${method} transport failed`, method, status);
  }

  const success = baseSuccessSchema.safeParse(json);
  if (success.success) return success.data.Data;

  const keyInvoiceError = keyInvoiceErrorSchema.safeParse(json);
  if (keyInvoiceError.success) {
    if (options.allowStatus0) return null;
    const message = keyInvoiceError.data.ErrorMessage || `KeyInvoice ${method} failed`;
    const shouldRetryAuth =
      options.retryAuth !== false && /sess|sid|auth|expir/i.test(message || '');

    if (shouldRetryAuth) {
      sessionCache = null;
      await authenticate(true);
      return callRaw(method, payload, { ...options, retryAuth: false });
    }

    throw new KeyInvoiceApiError(message, method, status, json);
  }

  throw new KeyInvoiceApiError(`Invalid KeyInvoice ${method} response`, method, status, json);
}

async function callData<T>(
  method: string,
  payload: KeyInvoicePayload,
  schema: z.ZodType<T>,
  options: { retryTransport?: boolean } = {},
): Promise<T> {
  const data = await callRaw(method, payload, options);
  return schema.parse(data);
}

export function resetKeyInvoiceSessionForTests(): void {
  sessionCache = null;
}

export const keyInvoiceClient = {
  authenticate,

  async verifyUserInsertionPricesWithVAT(): Promise<boolean> {
    const data = await callRaw('verifyUserInsertionPricesWithVAT');
    const parsed = z
      .object({ PricesWithVAT: z.union([z.boolean(), z.string(), z.number()]) })
      .parse(data);
    return (
      parsed.PricesWithVAT === true || parsed.PricesWithVAT === '1' || parsed.PricesWithVAT === 1
    );
  },

  async company() {
    return callData('company', {}, companyResultSchema);
  },

  async getTaxes() {
    return callData('getTaxes', {}, taxesResultSchema);
  },

  async listDocumentSeries(docType: string) {
    return callData('listDocumentSeries', { DocType: docType }, documentSeriesResultSchema);
  },

  async listPaymentMethods() {
    return callData('listPaymentMethods', {}, paymentMethodsResultSchema);
  },

  async productExists(idProduct: string): Promise<boolean> {
    const data = await callRaw('productExists', { IdProduct: idProduct }, { allowStatus0: true });
    return data !== null;
  },

  async clientExists(vatin: string): Promise<boolean> {
    const data = await callRaw('clientExists', { VATIN: vatin }, { allowStatus0: true });
    return data !== null;
  },

  async getClient(vatin: string): Promise<GetClientResult> {
    return callData('getClient', { VATIN: vatin }, getClientResultSchema);
  },

  async insertClient(payload: KeyInvoicePayload): Promise<InsertClientResult> {
    return callData('insertClient', payload, insertClientResultSchema);
  },

  async insertDocument(payload: KeyInvoicePayload): Promise<InsertDocumentResult> {
    return callData('insertDocument', payload, insertDocumentResultSchema, {
      retryTransport: false,
    });
  },

  async getDocument(params: {
    docType: string;
    docNum: string;
    docSeries?: string | null;
  }): Promise<GetDocumentResult> {
    return callData(
      'getDocument',
      {
        DocType: params.docType,
        DocNum: params.docNum,
        ...(params.docSeries ? { DocSeries: params.docSeries } : {}),
      },
      getDocumentResultSchema,
    );
  },

  async getDocumentPDF(params: {
    docType: string;
    docNum: string;
    docSeries?: string | null;
    signed?: boolean;
  }): Promise<GetDocumentPdfResult> {
    return callData(
      'getDocumentPDF',
      {
        DocType: params.docType,
        DocNum: params.docNum,
        Format: 'A4',
        ...(params.signed === false ? {} : { Signed: 1 }),
        ...(params.docSeries ? { DocSeries: params.docSeries } : {}),
      },
      getDocumentPdfResultSchema,
    );
  },

  async registerInvoiceAT(params: {
    docType: string;
    docNum: string;
    docSeries?: string | null;
  }): Promise<unknown> {
    return callRaw('registerInvoiceAT', {
      DocType: params.docType,
      DocNum: params.docNum,
      ...(params.docSeries ? { DocSeries: params.docSeries } : {}),
    });
  },
};
