import {
  OPENAI_CUSTOM_EVENTS,
  OPENAI_EVENT_DATA_TYPE,
  OPENAI_STANDARD_EVENTS,
  adEventId,
  conversionDedupeName,
  conversions,
  isOpenAiCustomEventName,
  isOpenAiStandardEvent,
  isValidCustomEventName,
  validateConversion,
  type OpenAiConversion,
} from './events';

const ORDER = {
  orderId: 'order-1',
  amountCents: 990,
  currency: 'eur',
  packageKey: 'credits-10',
  packageName: '10 credits',
  credits: 10,
};

describe('OpenAI Ads event contract', () => {
  it('maps every standard event to its data type', () => {
    expect(Object.keys(OPENAI_EVENT_DATA_TYPE).sort()).toEqual([...OPENAI_STANDARD_EVENTS].sort());
    expect(OPENAI_EVENT_DATA_TYPE.order_created).toBe('contents');
    expect(OPENAI_EVENT_DATA_TYPE.lead_created).toBe('customer_action');
    expect(OPENAI_EVENT_DATA_TYPE.registration_completed).toBe('customer_action');
    expect(OPENAI_EVENT_DATA_TYPE.trial_started).toBe('plan_enrollment');
  });

  it('keeps the custom allowlist closed and syntactically valid', () => {
    expect(OPENAI_CUSTOM_EVENTS).toEqual([
      'story_creation_started',
      'story_generated',
      'story_shared',
      'audiobook_requested',
      'self_print_requested',
      'print_order_requested',
      'promo_code_redeemed',
      'partner_application_submitted',
      'contact_submitted',
    ]);
    for (const name of OPENAI_CUSTOM_EVENTS) {
      expect(isValidCustomEventName(name)).toBe(true);
      expect(isOpenAiCustomEventName(name)).toBe(true);
    }
    expect(isOpenAiCustomEventName('something_else')).toBe(false);
    expect(isOpenAiStandardEvent('order_created')).toBe(true);
    expect(isOpenAiStandardEvent('story_shared')).toBe(false);
  });

  it('applies the custom event name rules', () => {
    expect(isValidCustomEventName('a')).toBe(true);
    expect(isValidCustomEventName('a1')).toBe(true);
    expect(isValidCustomEventName('story-shared_2')).toBe(true);
    expect(isValidCustomEventName('a'.repeat(64))).toBe(true);
    expect(isValidCustomEventName('a'.repeat(65))).toBe(false);
    expect(isValidCustomEventName('')).toBe(false);
    expect(isValidCustomEventName('Story_Shared')).toBe(false);
    expect(isValidCustomEventName('_story')).toBe(false);
    expect(isValidCustomEventName('story-')).toBe(false);
    expect(isValidCustomEventName('story shared')).toBe(false);
    expect(isValidCustomEventName('order_created')).toBe(false);
    expect(isValidCustomEventName('custom')).toBe(false);
    expect(isValidCustomEventName(undefined)).toBe(false);
  });

  it('builds the documented event ids', () => {
    expect(adEventId.signup('user_1')).toBe('signup_user_1');
    expect(adEventId.storyStart('s1')).toBe('story_start_s1');
    expect(adEventId.storyLead('r1')).toBe('story_r1');
    expect(adEventId.storyGenerated('r1')).toBe('story_generated_r1');
    expect(adEventId.checkout('o1')).toBe('checkout_o1');
    expect(adEventId.order('o1')).toBe('order_o1');
    expect(adEventId.share('s1-public')).toBe('share_s1-public');
    expect(adEventId.audiobook('r1')).toBe('audiobook_r1');
    expect(adEventId.selfPrint('r1')).toBe('self_print_r1');
    expect(adEventId.print('p1')).toBe('print_p1');
    expect(adEventId.promo('x1')).toBe('promo_x1');
    expect(adEventId.partner('t1')).toBe('partner_t1');
    expect(adEventId.contact('t1')).toBe('contact_t1');
    const first = adEventId.random();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(adEventId.random()).not.toBe(first);
  });

  it('builds valid conversions from every constructor', () => {
    const all: OpenAiConversion[] = [
      conversions.registrationCompleted('user_1'),
      conversions.storyCreationStarted('s1'),
      conversions.storyLead('r1'),
      conversions.storyGenerated('r1'),
      conversions.checkoutStarted(ORDER),
      conversions.orderCreated(ORDER),
      conversions.storyShared('link1', 'private'),
      conversions.storyShared('s1-public'),
      conversions.audiobookRequested('r1'),
      conversions.selfPrintRequested('r1'),
      conversions.printOrderRequested('p1', 3),
      conversions.promoCodeRedeemed('x1'),
      conversions.partnerApplication('t1'),
      conversions.contactSubmitted('t1'),
      conversions.pageViewed('/[locale]/stories/[id]'),
      conversions.contentsViewed([{ id: 'credits-10', content_type: 'product' }]),
      conversions.itemsAdded([{ id: 'credits-10', quantity: 1, amount: 990, currency: 'EUR' }]),
    ];
    for (const conversion of all) {
      expect(validateConversion(conversion)).toEqual([]);
    }
  });

  it('sends purchases as money and credit-funded actions without an amount', () => {
    expect(conversions.orderCreated(ORDER)).toEqual({
      eventType: 'order_created',
      eventId: 'order_order-1',
      data: {
        type: 'contents',
        amount: 990,
        currency: 'EUR',
        contents: [
          {
            id: 'credits-10',
            name: '10 credits',
            content_type: 'product',
            quantity: 1,
            amount: 990,
            currency: 'EUR',
          },
        ],
      },
    });
    expect(conversions.checkoutStarted(ORDER).eventId).toBe('checkout_order-1');
    expect(conversions.checkoutStarted(ORDER).data).toEqual(conversions.orderCreated(ORDER).data);

    expect(conversions.printOrderRequested('p1', 2)).toEqual({
      eventType: 'custom',
      customEventName: 'print_order_requested',
      eventId: 'print_p1',
      data: {
        type: 'custom',
        contents: [
          { id: 'print_order', name: 'Printed book', content_type: 'service', quantity: 2 },
        ],
      },
    });
    expect(conversions.audiobookRequested('r1').data).toEqual({
      type: 'custom',
      contents: [
        {
          id: 'audiobook_generation',
          name: 'Audiobook generation',
          content_type: 'service',
          quantity: 1,
        },
      ],
    });
    expect(conversions.selfPrintRequested('r1').data).toEqual({
      type: 'custom',
      contents: [
        { id: 'self_print', name: 'Self-print PDF', content_type: 'service', quantity: 1 },
      ],
    });
    expect(conversions.printOrderRequested('p1', 0).data).toMatchObject({
      contents: [{ quantity: 1 }],
    });
    expect(conversions.storyShared('link1', 'private').data).toMatchObject({
      contents: [{ id: 'story_share_private' }],
    });
  });

  it('uses standard events for registration and the story lead', () => {
    expect(conversions.registrationCompleted('user_1')).toEqual({
      eventType: 'registration_completed',
      eventId: 'signup_user_1',
      data: { type: 'customer_action' },
    });
    expect(conversions.storyLead('r1')).toEqual({
      eventType: 'lead_created',
      eventId: 'story_r1',
      data: { type: 'customer_action' },
    });
    expect(conversionDedupeName(conversions.storyLead('r1'))).toBe('lead_created');
    expect(conversionDedupeName(conversions.storyGenerated('r1'))).toBe('story_generated');
  });

  it('rejects invalid conversions', () => {
    const invalid = (conversion: unknown) =>
      validateConversion(conversion as OpenAiConversion).length > 0;
    const contents = (data: Record<string, unknown>) => ({
      eventType: 'order_created',
      eventId: 'e',
      data: { type: 'contents', ...data },
    });
    const custom = (customEventName?: string) => ({
      eventType: 'custom',
      customEventName,
      eventId: 'e',
      data: { type: 'custom' },
    });

    // data.type mismatch
    expect(invalid({ eventType: 'order_created', eventId: 'e', data: { type: 'custom' } })).toBe(
      true,
    );
    // contents on customer_action
    expect(
      invalid({
        eventType: 'lead_created',
        eventId: 'e',
        data: { type: 'customer_action', contents: [{ id: 'x' }] },
      }),
    ).toBe(true);
    // amounts and currencies
    expect(invalid(contents({ amount: 9.9, currency: 'EUR' }))).toBe(true);
    expect(invalid(contents({ amount: 990 }))).toBe(true);
    expect(invalid(contents({ amount: 990, currency: 'eur' }))).toBe(true);
    expect(invalid(contents({ amount: 990, currency: 'EUR' }))).toBe(false);
    // content items
    expect(invalid(contents({ contents: [{ id: 'x', amount: 5 }] }))).toBe(true);
    expect(invalid(contents({ contents: [{ id: 'x', quantity: 1.5 }] }))).toBe(true);
    expect(invalid(contents({ contents: [{ name: 'no id' }] }))).toBe(true);
    expect(invalid(contents({ contents: 'x' }))).toBe(true);
    // custom name rules
    expect(invalid(custom())).toBe(true);
    expect(invalid(custom('Bad Name'))).toBe(true);
    expect(invalid(custom('not_allowlisted'))).toBe(true);
    expect(invalid(custom('story_shared'))).toBe(false);
    expect(
      invalid({
        eventType: 'lead_created',
        customEventName: 'story_shared',
        eventId: 'e',
        data: { type: 'customer_action' },
      }),
    ).toBe(true);
    // unknown event, missing id, missing data
    expect(invalid({ eventType: 'purchase', eventId: 'e', data: { type: 'contents' } })).toBe(true);
    expect(invalid({ eventType: 'page_viewed', eventId: '', data: { type: 'contents' } })).toBe(
      true,
    );
    expect(invalid({ eventType: 'page_viewed', eventId: 'e' })).toBe(true);
  });
});
