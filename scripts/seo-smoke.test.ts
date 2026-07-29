/** @jest-environment node */

import { isAllowedByRobots, parseRobotsGroups, pathMatchesRobotsPattern } from './seo-smoke';

describe('SEO smoke robots parser', () => {
  const groups = parseRobotsGroups(`
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /pt-PT/s/
Disallow: /pt-PT/s$
`);

  it('reproduces prefix and end-of-path matching semantics', () => {
    expect(pathMatchesRobotsPattern('/pt-PT/s/private-story-id', '/pt-PT/s/')).toBe(true);
    expect(pathMatchesRobotsPattern('/pt-PT/s', '/pt-PT/s$')).toBe(true);
    expect(pathMatchesRobotsPattern('/pt-PT/sample-books/example', '/pt-PT/s/')).toBe(false);
    expect(pathMatchesRobotsPattern('/pt-PT/sample-books/example', '/pt-PT/s$')).toBe(false);
  });

  it.each([
    'Googlebot',
    'Bingbot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'Claude-SearchBot',
    'Claude-User',
    'ClaudeBot',
    'Google-Extended',
    'PerplexityBot',
    'Applebot',
    'Applebot-Extended',
  ])('applies the wildcard policy to %s', (userAgent) => {
    expect(isAllowedByRobots(groups, userAgent, '/pt-PT/sample-books/example')).toBe(true);
    expect(isAllowedByRobots(groups, userAgent, '/pt-PT/lp/example')).toBe(true);
    expect(isAllowedByRobots(groups, userAgent, '/pt-PT/blog/example')).toBe(true);
    expect(isAllowedByRobots(groups, userAgent, '/pt-PT/s')).toBe(false);
    expect(isAllowedByRobots(groups, userAgent, '/pt-PT/s/private-story-id')).toBe(false);
  });
});
