import { anonymousRequestSurface } from './anonymous';

describe('anonymous request counters', () => {
  it.each([
    ['/', 'home'],
    ['/en-US/lp/arbitrary-landing-sentinel', 'landing'],
    ['/pt-PT/s/private-sentinel/edit', 'reader'],
    ['/en-US/stories/read/private-sentinel/chapter/2', 'reader'],
    ['/pt-PT/tell-your-story/step-2', 'creation'],
    ['/fr-FR/sign-in/auth-sentinel', 'auth'],
    ['/es-ES/pricing', 'commerce'],
    ['/de-DE/unknown-private-path-sentinel', 'other'],
    ['/api/private-sentinel', undefined],
  ])('maps %s only to its bounded route class', (route, surface) => {
    expect(anonymousRequestSurface(route)).toBe(surface);
  });
});
