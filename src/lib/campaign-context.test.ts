import {
  buildPublicRedirectSearch,
  buildStoryAuthReturnSearch,
  collectCampaignParams,
  getValidatedIntent,
  parseIntentContext,
  readIntentContextFromDocumentCookie,
  serializeIntentContext,
} from './campaign-context';

describe('campaign context', () => {
  it('normalizes supported intents and rejects unknown values', () => {
    expect(getValidatedIntent(' Romance ')).toBe('romance');
    expect(getValidatedIntent('kids-transitions')).toBe('kids_transitions');
    expect(getValidatedIntent('diagnosis')).toBeNull();
    expect(getValidatedIntent(['romance'])).toBeNull();
  });

  it('round-trips a validated intent cookie and drops invalid fields', () => {
    const serialized = serializeIntentContext({
      intent: 'grandparents',
      recipient: 'grandparent',
    });
    expect(parseIntentContext(serialized)).toEqual({
      intent: 'grandparents',
      recipient: 'grandparent',
    });
    expect(parseIntentContext('{"intent":"not-real","recipient":"not-real"}')).toBeNull();
    expect(parseIntentContext('%not-json')).toBeNull();
  });

  it('reads an encoded browser cookie without trusting malformed intent data', () => {
    const value = encodeURIComponent('{"intent":"romance"}');
    expect(
      readIntentContextFromDocumentCookie(
        `other=1; mythoria_intent_context=${value}; session=2`,
        'mythoria_intent_context',
      ),
    ).toEqual({ intent: 'romance' });
    expect(
      readIntentContextFromDocumentCookie(
        'mythoria_intent_context=%7B%22intent%22%3A%22fake%22%7D',
        'mythoria_intent_context',
      ),
    ).toBeNull();
  });

  it('captures only bounded campaign parameters', () => {
    const params = new URLSearchParams({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'romance',
      utm_id: 'summer-26',
      utm_term: 'livro casal',
      utm_content: 'hero-a',
      gclid: 'g-123',
      gbraid: 'gb-123',
      wbraid: 'wb-123',
      email: 'private@example.com',
      token: 'secret',
    });
    expect(collectCampaignParams(params)).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'romance',
      utm_id: 'summer-26',
      utm_term: 'livro casal',
      utm_content: 'hero-a',
      gclid: 'g-123',
      gbraid: 'gb-123',
      wbraid: 'wb-123',
    });

    params.set('utm_source', 'x'.repeat(256));
    expect(collectCampaignParams(params)).not.toHaveProperty('utm_source');
  });

  it('preserves safe redirect context and removes auth and PII-like parameters', () => {
    const safe = buildPublicRedirectSearch(
      new URLSearchParams({
        intent: 'Grandparents',
        utm_source: 'newsletter',
        gclid: 'click-1',
        ref: 'partner',
        email: 'private@example.com',
        code: 'oauth-code',
        state: 'oauth-state',
        token: 'secret',
        unknown: 'discard',
      }),
    );

    expect(safe.toString()).toBe(
      'utm_source=newsletter&gclid=click-1&ref=partner&intent=grandparents',
    );
  });

  it('keeps complete valid story-share tags through a canonical public-story redirect', () => {
    const safe = buildPublicRedirectSearch(
      new URLSearchParams({
        utm_source: 'copy_link',
        utm_medium: 'referral',
        utm_campaign: 'story_share',
        utm_id: '5346dfa5d333',
        utm_content: 'public',
        private_token: 'must-not-survive',
      }),
    );

    expect(safe.toString()).toBe(
      'utm_source=copy_link&utm_medium=referral&utm_campaign=story_share&utm_id=5346dfa5d333&utm_content=public',
    );
    expect(safe.has('private_token')).toBe(false);
  });

  it('keeps the complete campaign and canonical intent through authentication', () => {
    const safe = buildStoryAuthReturnSearch(
      new URLSearchParams({
        landingSlug: 'homepage',
        primaryIntent: 'kids-transitions',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'support',
        utm_id: 'campaign-1',
        utm_term: 'mudanca escola',
        utm_content: 'hero',
        gclid: 'g-1',
        gbraid: 'gb-1',
        wbraid: 'wb-1',
        ref: 'partner',
        token: 'secret',
        code: 'oauth',
        state: 'private',
        email: 'private@example.com',
      }),
    );
    expect(safe.get('primaryIntent')).toBe('kids_transitions');
    expect(Object.fromEntries(safe)).toMatchObject({
      landingSlug: 'homepage',
      primaryIntent: 'kids_transitions',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'support',
      utm_id: 'campaign-1',
      utm_term: 'mudanca escola',
      utm_content: 'hero',
      gclid: 'g-1',
      gbraid: 'gb-1',
      wbraid: 'wb-1',
      ref: 'partner',
    });
    expect(safe.has('token')).toBe(false);
    expect(safe.has('code')).toBe(false);
    expect(safe.has('state')).toBe(false);
    expect(safe.has('email')).toBe(false);
  });
});
