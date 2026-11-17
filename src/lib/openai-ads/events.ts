/**
 * Shared contract for OpenAI (ChatGPT Ads) conversion events.
 *
 * Isomorphic: imported by both the browser Pixel helper and the server Conversions API outbox, so
 * it must stay free of Node-only and React imports. Browser and server must build conversions with
 * the `conversions.*` constructors below, so both channels send the same event name, `event_id`
 * and data shape and OpenAI can deduplicate them.
 */

export const OPENAI_STANDARD_EVENTS = [
  'page_viewed',
  'contents_viewed',
  'items_added',
  'checkout_started',
  'order_created',
  'lead_created',
  'registration_completed',
  'appointment_scheduled',
  'subscription_created',
  'trial_started',
] as const;

export type OpenAiStandardEvent = (typeof OPENAI_STANDARD_EVENTS)[number];

/** Closed allowlist of the custom events Mythoria sends. */
export const OPENAI_CUSTOM_EVENTS = [
  'story_creation_started',
  'story_generated',
  'story_shared',
  'audiobook_requested',
  'self_print_requested',
  'print_order_requested',
  'promo_code_redeemed',
  'partner_application_submitted',
  'contact_submitted',
] as const;

export type OpenAiCustomEventName = (typeof OPENAI_CUSTOM_EVENTS)[number];

export const OPENAI_CUSTOM_EVENT_TYPE = 'custom';

export type OpenAiEventType = OpenAiStandardEvent | typeof OPENAI_CUSTOM_EVENT_TYPE;

export type OpenAiEventDataType = 'contents' | 'customer_action' | 'plan_enrollment' | 'custom';

export const OPENAI_EVENT_DATA_TYPE = {
  page_viewed: 'contents',
  contents_viewed: 'contents',
  items_added: 'contents',
  checkout_started: 'contents',
  order_created: 'contents',
  lead_created: 'customer_action',
  registration_completed: 'customer_action',
  appointment_scheduled: 'customer_action',
  subscription_created: 'plan_enrollment',
  trial_started: 'plan_enrollment',
} as const satisfies Record<OpenAiStandardEvent, OpenAiEventDataType>;

/** One entry of `data.contents`. `amount` is the per-unit price in integer minor units. */
export interface OpenAiContentItem {
  id: string;
  name?: string;
  content_type?: string;
  quantity?: number;
  amount?: number;
  /** ISO-4217, uppercase. Required whenever `amount` is set. */
  currency?: string;
  /** Conversions API only. */
  group_id?: string;
  /** Conversions API only. */
  variant_dict?: Record<string, string>;
}

interface OpenAiAmountFields {
  /** Integer minor units (e.g. EUR cents). */
  amount?: number;
  /** ISO-4217, uppercase. Required whenever `amount` is set. */
  currency?: string;
}

export interface OpenAiContentsData extends OpenAiAmountFields {
  type: 'contents';
  contents?: OpenAiContentItem[];
}

/** `customer_action` events accept an amount, but never `contents`. */
export interface OpenAiCustomerActionData extends OpenAiAmountFields {
  type: 'customer_action';
}

export interface OpenAiPlanEnrollmentData extends OpenAiAmountFields {
  type: 'plan_enrollment';
  plan_id?: string;
}

export interface OpenAiCustomData extends OpenAiAmountFields {
  type: 'custom';
  plan_id?: string;
  contents?: OpenAiContentItem[];
}

export type OpenAiEventData =
  OpenAiContentsData | OpenAiCustomerActionData | OpenAiPlanEnrollmentData | OpenAiCustomData;

/** A conversion ready to be sent by the Pixel or enqueued for the Conversions API. */
export interface OpenAiConversion {
  eventType: OpenAiEventType;
  /** Required when (and only when) `eventType` is `'custom'`. */
  customEventName?: OpenAiCustomEventName;
  /** Deduplication id; must be identical on the browser and the server for the same action. */
  eventId: string;
  data: OpenAiEventData;
}

export const OPENAI_EVENT_ID_MAX_LENGTH = 255;

const STANDARD_EVENT_SET: ReadonlySet<string> = new Set(OPENAI_STANDARD_EVENTS);
const CUSTOM_EVENT_SET: ReadonlySet<string> = new Set(OPENAI_CUSTOM_EVENTS);
const CUSTOM_EVENT_NAME_PATTERN = /^[a-z0-9]([a-z0-9_-]{0,62}[a-z0-9])?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isOpenAiStandardEvent(name: unknown): name is OpenAiStandardEvent {
  return typeof name === 'string' && STANDARD_EVENT_SET.has(name);
}

/** True when `name` is one of the custom events Mythoria is allowed to send. */
export function isOpenAiCustomEventName(name: unknown): name is OpenAiCustomEventName {
  return typeof name === 'string' && CUSTOM_EVENT_SET.has(name);
}

/**
 * OpenAI's syntactic rule for custom event names: 1-64 chars of lowercase `[a-z0-9_-]`, starting
 * and ending with a letter or digit, and never equal to a standard event name (or `custom`).
 */
export function isValidCustomEventName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    CUSTOM_EVENT_NAME_PATTERN.test(name) &&
    !STANDARD_EVENT_SET.has(name) &&
    name !== OPENAI_CUSTOM_EVENT_TYPE
  );
}

/** The name OpenAI deduplicates on: the custom event name, or the standard event type. */
export function conversionDedupeName(
  conversion: Pick<OpenAiConversion, 'eventType' | 'customEventName'>,
): string {
  return conversion.customEventName ?? conversion.eventType;
}

/** Builders for every `event_id` format. Never build these strings by hand. */
export const adEventId = {
  signup: (clerkUserId: string) => `signup_${clerkUserId}`,
  storyStart: (storyId: string) => `story_start_${storyId}`,
  storyLead: (runId: string) => `story_${runId}`,
  storyGenerated: (runId: string) => `story_generated_${runId}`,
  checkout: (orderId: string) => `checkout_${orderId}`,
  order: (orderId: string) => `order_${orderId}`,
  share: (ref: string) => `share_${ref}`,
  audiobook: (runId: string) => `audiobook_${runId}`,
  selfPrint: (runId: string) => `self_print_${runId}`,
  print: (printRequestId: string) => `print_${printRequestId}`,
  promo: (redemptionId: string) => `promo_${redemptionId}`,
  partner: (ticketId: string) => `partner_${ticketId}`,
  contact: (ticketId: string) => `contact_${ticketId}`,
  /** For browser-only events that have no server counterpart to deduplicate against. */
  random: () => globalThis.crypto.randomUUID(),
} as const;

function validateAmount(
  subject: string,
  value: { amount?: unknown; currency?: unknown },
  errors: string[],
): void {
  if (value.amount !== undefined) {
    if (typeof value.amount !== 'number' || !Number.isInteger(value.amount) || value.amount < 0) {
      errors.push(`${subject}.amount must be a non-negative integer in minor units`);
    }
    if (value.currency === undefined) {
      errors.push(`${subject}.currency is required when amount is set`);
    }
  }
  if (
    value.currency !== undefined &&
    (typeof value.currency !== 'string' || !CURRENCY_PATTERN.test(value.currency))
  ) {
    errors.push(`${subject}.currency must be an uppercase ISO-4217 code`);
  }
}

function validateContents(contents: unknown, errors: string[]): void {
  if (!Array.isArray(contents)) {
    errors.push('data.contents must be an array');
    return;
  }
  contents.forEach((item: unknown, index) => {
    const subject = `data.contents[${index}]`;
    if (typeof item !== 'object' || item === null) {
      errors.push(`${subject} must be an object`);
      return;
    }
    const content = item as Record<string, unknown>;
    if (typeof content.id !== 'string' || content.id.length === 0) {
      errors.push(`${subject}.id must be a non-empty string`);
    }
    if (
      content.quantity !== undefined &&
      (typeof content.quantity !== 'number' ||
        !Number.isInteger(content.quantity) ||
        content.quantity < 1)
    ) {
      errors.push(`${subject}.quantity must be a positive integer`);
    }
    validateAmount(subject, content, errors);
  });
}

/**
 * Validates a conversion against the OpenAI event rules. Returns a list of human-readable errors;
 * an empty list means the conversion is safe to send. Accepts untrusted input at runtime.
 */
export function validateConversion(conversion: OpenAiConversion): string[] {
  const errors: string[] = [];
  const { eventType, customEventName, eventId } = conversion;
  const data = conversion.data as OpenAiEventData | undefined;

  if (typeof eventId !== 'string' || eventId.length === 0) {
    errors.push('eventId must be a non-empty string');
  } else if (eventId.length > OPENAI_EVENT_ID_MAX_LENGTH) {
    errors.push(`eventId must be at most ${OPENAI_EVENT_ID_MAX_LENGTH} characters`);
  }

  let expectedDataType: OpenAiEventDataType | undefined;
  if (eventType === OPENAI_CUSTOM_EVENT_TYPE) {
    expectedDataType = 'custom';
    if (customEventName === undefined) {
      errors.push('customEventName is required for custom events');
    } else if (!isValidCustomEventName(customEventName)) {
      errors.push('customEventName is not a valid custom event name');
    } else if (!isOpenAiCustomEventName(customEventName)) {
      errors.push(`customEventName "${customEventName}" is not in the allowlist`);
    }
  } else if (isOpenAiStandardEvent(eventType)) {
    expectedDataType = OPENAI_EVENT_DATA_TYPE[eventType];
    if (customEventName !== undefined) {
      errors.push('customEventName is only allowed for custom events');
    }
  } else {
    errors.push(`eventType "${String(eventType)}" is not a supported event`);
  }

  if (typeof data !== 'object' || data === null) {
    errors.push('data must be an object');
    return errors;
  }

  if (expectedDataType !== undefined && data.type !== expectedDataType) {
    errors.push(`data.type must be "${expectedDataType}" for this event`);
  }

  validateAmount('data', data, errors);

  const contents = (data as { contents?: unknown }).contents;
  if (contents !== undefined) {
    if (data.type === 'customer_action' || data.type === 'plan_enrollment') {
      errors.push(`data.contents is not allowed on ${data.type} events`);
    } else {
      validateContents(contents, errors);
    }
  }

  return errors;
}

/** Content ids for credit-funded services (no `amount`: credits are not money). */
export const OPENAI_SERVICE_CONTENT = {
  story: { id: 'story_generation', name: 'Story generation' },
  storyShare: { id: 'story_share', name: 'Story share' },
  audiobook: { id: 'audiobook_generation', name: 'Audiobook generation' },
  selfPrint: { id: 'self_print', name: 'Self-print PDF' },
  printOrder: { id: 'print_order', name: 'Printed book' },
} as const;

function serviceContent(service: { id: string; name: string }, quantity = 1): OpenAiContentItem[] {
  return [{ id: service.id, name: service.name, content_type: 'service', quantity }];
}

function customConversion(
  customEventName: OpenAiCustomEventName,
  eventId: string,
  contents?: OpenAiContentItem[],
): OpenAiConversion {
  return {
    eventType: OPENAI_CUSTOM_EVENT_TYPE,
    customEventName,
    eventId,
    data: contents ? { type: 'custom', contents } : { type: 'custom' },
  };
}

export interface CreditPackageConversionInput {
  orderId: string;
  /** Order total in integer minor units (e.g. EUR cents). */
  amountCents: number;
  /** ISO-4217; normalized to uppercase. */
  currency: string;
  packageKey: string;
  packageName: string;
  /** Credits granted by the package. Not sent to OpenAI; kept so callers pass one shared shape. */
  credits: number;
}

function creditPackageData(input: CreditPackageConversionInput): OpenAiContentsData {
  const currency = input.currency.toUpperCase();
  return {
    type: 'contents',
    amount: input.amountCents,
    currency,
    contents: [
      {
        id: input.packageKey,
        name: input.packageName,
        content_type: 'product',
        quantity: 1,
        amount: input.amountCents,
        currency,
      },
    ],
  };
}

/**
 * Conversion constructors shared by the browser and the server. Each one fixes the event name, the
 * `event_id` format and the data shape for one row of the event map.
 */
export const conversions = {
  registrationCompleted: (clerkUserId: string): OpenAiConversion => ({
    eventType: 'registration_completed',
    eventId: adEventId.signup(clerkUserId),
    data: { type: 'customer_action' },
  }),

  storyCreationStarted: (storyId: string): OpenAiConversion =>
    customConversion('story_creation_started', adEventId.storyStart(storyId)),

  /** "Completes story creation": standard `lead_created`, so campaigns can optimize for it. */
  storyLead: (runId: string): OpenAiConversion => ({
    eventType: 'lead_created',
    eventId: adEventId.storyLead(runId),
    data: { type: 'customer_action' },
  }),

  storyGenerated: (runId: string): OpenAiConversion =>
    customConversion(
      'story_generated',
      adEventId.storyGenerated(runId),
      serviceContent(OPENAI_SERVICE_CONTENT.story),
    ),

  checkoutStarted: (input: CreditPackageConversionInput): OpenAiConversion => ({
    eventType: 'checkout_started',
    eventId: adEventId.checkout(input.orderId),
    data: creditPackageData(input),
  }),

  orderCreated: (input: CreditPackageConversionInput): OpenAiConversion => ({
    eventType: 'order_created',
    eventId: adEventId.order(input.orderId),
    data: creditPackageData(input),
  }),

  /**
   * `ref` is the share link id for private links, or `<storyId>-public` for public sharing.
   * `scope` (e.g. `'private'` / `'public'`) is appended to the content id.
   */
  storyShared: (ref: string, scope?: string): OpenAiConversion =>
    customConversion(
      'story_shared',
      adEventId.share(ref),
      serviceContent({
        id: scope
          ? `${OPENAI_SERVICE_CONTENT.storyShare.id}_${scope}`
          : OPENAI_SERVICE_CONTENT.storyShare.id,
        name: OPENAI_SERVICE_CONTENT.storyShare.name,
      }),
    ),

  audiobookRequested: (runId: string): OpenAiConversion =>
    customConversion(
      'audiobook_requested',
      adEventId.audiobook(runId),
      serviceContent(OPENAI_SERVICE_CONTENT.audiobook),
    ),

  selfPrintRequested: (runId: string): OpenAiConversion =>
    customConversion(
      'self_print_requested',
      adEventId.selfPrint(runId),
      serviceContent(OPENAI_SERVICE_CONTENT.selfPrint),
    ),

  printOrderRequested: (printRequestId: string, copies = 1): OpenAiConversion =>
    customConversion(
      'print_order_requested',
      adEventId.print(printRequestId),
      serviceContent(
        OPENAI_SERVICE_CONTENT.printOrder,
        Number.isInteger(copies) && copies > 0 ? copies : 1,
      ),
    ),

  promoCodeRedeemed: (redemptionId: string): OpenAiConversion =>
    customConversion('promo_code_redeemed', adEventId.promo(redemptionId)),

  partnerApplication: (ticketId: string): OpenAiConversion =>
    customConversion('partner_application_submitted', adEventId.partner(ticketId)),

  contactSubmitted: (ticketId: string): OpenAiConversion =>
    customConversion('contact_submitted', adEventId.contact(ticketId)),

  // Browser-only events (no server counterpart, random event id).

  /** `routeTemplate` must be the path with ids, tokens and slugs replaced. */
  pageViewed: (routeTemplate: string): OpenAiConversion => ({
    eventType: 'page_viewed',
    eventId: adEventId.random(),
    data: { type: 'contents', contents: [{ id: routeTemplate, content_type: 'page' }] },
  }),

  contentsViewed: (contents: OpenAiContentItem[]): OpenAiConversion => ({
    eventType: 'contents_viewed',
    eventId: adEventId.random(),
    data: { type: 'contents', contents },
  }),

  itemsAdded: (contents: OpenAiContentItem[]): OpenAiConversion => ({
    eventType: 'items_added',
    eventId: adEventId.random(),
    data: { type: 'contents', contents },
  }),
} as const;
