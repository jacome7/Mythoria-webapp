import assert from 'node:assert/strict';

const baseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = new URL(baseArg?.slice('--base-url='.length) || 'http://localhost:3000');
baseUrl.pathname = '';
const expectedGitShaArg = process.argv.find((arg) => arg.startsWith('--expected-git-sha='));
const expectedGitSha = expectedGitShaArg?.slice('--expected-git-sha='.length).trim();

type RobotsGroup = {
  userAgents: string[];
  allows: string[];
  disallows: string[];
};

const crawlerUserAgents = [
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
];

function absolute(pathname: string): string {
  return new URL(pathname, baseUrl).toString();
}

function targetUrl(canonicalUrl: string): string {
  const url = new URL(canonicalUrl);
  return absolute(`${url.pathname}${url.search}`);
}

async function fetchNoRedirect(url: string) {
  return fetch(url, {
    redirect: 'manual',
    headers: {
      'accept-encoding': 'identity',
      'user-agent': 'Mythoria-SEO-Smoke/1.0',
    },
  });
}

async function assertRedirect(source: string, expectedPath: string) {
  const first = await fetchNoRedirect(absolute(source));
  assert.equal(first.status, 308, `${source} should return 308`);
  const location = first.headers.get('location');
  assert(location, `${source} did not include Location`);
  const destination = new URL(location, baseUrl);
  assert.equal(destination.origin, baseUrl.origin, `${source} redirects to a non-public origin`);
  assert.equal(`${destination.pathname}${destination.search}`, expectedPath);
  const final = await fetchNoRedirect(destination.toString());
  assert.equal(final.status, 200, `${source} did not terminate at 200`);
}

function xmlDecode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractCanonical(html: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => /\brel=["']canonical["']/i.test(candidate));
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? null;
}

function extractRobots(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => /\bname=["']robots["']/i.test(candidate));
  return tag?.match(/\bcontent=["']([^"']+)["']/i)?.[1] ?? null;
}

function extractHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
}

export function pathMatchesRobotsPattern(pathname: string, pattern: string): boolean {
  if (!pattern) return false;
  const anchored = pattern.endsWith('$');
  const patternBody = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = patternBody
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(pathname);
}

export function parseRobotsGroups(robotsText: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;

  const finishGroup = () => {
    if (current?.userAgents.length) groups.push(current);
    current = undefined;
  };

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) {
      if (current && (current.allows.length > 0 || current.disallows.length > 0)) finishGroup();
      continue;
    }
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (current && (current.allows.length > 0 || current.disallows.length > 0)) finishGroup();
      current ??= { userAgents: [], allows: [], disallows: [] };
      current.userAgents.push(value);
    } else if (field === 'allow' || field === 'disallow') {
      current ??= { userAgents: [], allows: [], disallows: [] };
      if (value) current[field === 'allow' ? 'allows' : 'disallows'].push(value);
    }
  }
  finishGroup();
  return groups;
}

export function isAllowedByRobots(
  groups: RobotsGroup[],
  userAgent: string,
  pathname: string,
): boolean {
  const normalizedUserAgent = userAgent.toLowerCase();
  const matchingGroups = groups
    .map((group) => {
      const specificity = Math.max(
        ...group.userAgents.map((token) => {
          const normalizedToken = token.toLowerCase();
          return normalizedToken === '*' || !normalizedUserAgent.includes(normalizedToken)
            ? normalizedToken === '*'
              ? 0
              : -1
            : normalizedToken.length;
        }),
      );
      return { group, specificity };
    })
    .filter(({ specificity }) => specificity >= 0);
  if (matchingGroups.length === 0) return true;

  const highestSpecificity = Math.max(...matchingGroups.map(({ specificity }) => specificity));
  const matches = matchingGroups
    .filter(({ specificity }) => specificity === highestSpecificity)
    .flatMap(({ group }) => [
      ...group.allows.map((pattern) => ({ allow: true, pattern })),
      ...group.disallows.map((pattern) => ({ allow: false, pattern })),
    ])
    .filter(({ pattern }) => pathMatchesRobotsPattern(pathname, pattern));
  if (matches.length === 0) return true;

  const longest = Math.max(...matches.map(({ pattern }) => pattern.replace(/[*$]/g, '').length));
  return matches
    .filter(({ pattern }) => pattern.replace(/[*$]/g, '').length === longest)
    .some(({ allow }) => allow);
}

function parseSitemapEntries(xml: string) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    assert(locMatch, 'sitemap entry is missing loc');
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    const alternates = [...block.matchAll(/<xhtml:link\b[^>]*\/>/g)].map((linkMatch) => {
      const tag = linkMatch[0];
      const locale = tag.match(/hreflang="([^"]+)"/)?.[1];
      const href = tag.match(/href="([^"]+)"/)?.[1];
      assert(locale && href, 'sitemap alternate is malformed');
      return { locale: xmlDecode(locale), href: xmlDecode(href) };
    });
    return {
      loc: xmlDecode(locMatch[1]),
      lastmod: lastmod ? xmlDecode(lastmod) : undefined,
      alternates,
    };
  });
}

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(run));
  }
}

async function main() {
  const healthResponse = await fetchNoRedirect(absolute('/api/health'));
  assert.equal(healthResponse.status, 200, 'health endpoint is not ready');
  const health = (await healthResponse.json()) as { gitSha?: string };
  assert(health.gitSha && health.gitSha !== 'unknown', 'health endpoint does not expose a Git SHA');
  if (expectedGitSha) {
    assert.equal(
      health.gitSha,
      expectedGitSha,
      `health endpoint Git SHA ${health.gitSha} does not match ${expectedGitSha}`,
    );
  }
  console.log(`Deployed Git SHA: ${health.gitSha}`);

  await assertRedirect('/', '/en-US');
  await assertRedirect('/en-US/', '/en-US');
  await assertRedirect('/en-us/', '/en-US');
  await assertRedirect(
    '/aboutUs?utm_source=seo-smoke&email=private@example.com',
    '/en-US/aboutUs?utm_source=seo-smoke',
  );
  await assertRedirect('/pt-PT/lp/', '/pt-PT/lp');
  await assertRedirect(
    '/lp/livro-personalizado-para-casais?utm_source=seo-smoke',
    '/pt-PT/lp/livro-personalizado-para-casais?utm_source=seo-smoke',
  );
  await assertRedirect(
    '/guias/como-transformar-memorias-num-livro-personalizado-para-casal?gclid=click-1&state=secret',
    '/pt-PT/guias/como-transformar-memorias-num-livro-personalizado-para-casal?gclid=click-1',
  );
  await assertRedirect(
    '/sample-books/a-primeira-manha-corajosa-da-sofia?ref=seo-smoke',
    '/pt-PT/sample-books/a-primeira-manha-corajosa-da-sofia?ref=seo-smoke',
  );

  for (const campaignPath of [
    '/pt-PT?intent=romance&utm_source=seo-smoke&gclid=click-1',
    '/pt-PT?intent=grandparents&utm_source=seo-smoke&wbraid=click-2',
  ]) {
    const response = await fetchNoRedirect(absolute(campaignPath));
    assert.equal(response.status, 200, `${campaignPath} should be an immediate 200`);
    assert.equal(response.headers.get('location'), null, `${campaignPath} unexpectedly redirects`);
    assert(
      response.headers.get('set-cookie')?.includes('mythoria_intent_context='),
      `${campaignPath} does not persist its intent`,
    );
  }
  if (baseUrl.hostname === 'mythoria.pt') {
    await assertRedirect(
      '/i/romance?locale=pt-PT&utm_campaign=seo-smoke&gclid=legacy-click&email=private@example.com',
      '/pt-PT?utm_campaign=seo-smoke&gclid=legacy-click&intent=romance',
    );
  }

  const sitemapResponse = await fetchNoRedirect(absolute('/sitemap.xml'));
  assert.equal(sitemapResponse.status, 200, 'sitemap is unavailable');
  const sitemap = await sitemapResponse.text();
  const entries = parseSitemapEntries(sitemap);
  const locs = entries.map((entry) => entry.loc);
  assert(locs.length > 0, 'sitemap contains no URLs');
  assert.equal(new Set(locs).size, locs.length, 'sitemap contains duplicate URLs');
  const entryByLoc = new Map(entries.map((entry) => [entry.loc, entry]));
  const requiredClusterPaths = [
    '/pt-PT/guias/como-transformar-memorias-num-livro-personalizado-para-casal',
    '/pt-PT/guias/como-criar-uma-historia-de-apoio-para-uma-mudanca',
    '/pt-PT/sample-books/duas-chavenas-uma-vida',
    '/pt-PT/sample-books/a-primeira-manha-corajosa-da-sofia',
  ];
  for (const pathname of requiredClusterPaths) {
    const matches = locs.filter((loc) => new URL(loc).pathname === pathname);
    assert.equal(matches.length, 1, `${pathname} must occur once in the sitemap`);
  }
  const hubEntry = entryByLoc.get('https://mythoria.pt/pt-PT/lp');
  assert.equal(
    hubEntry?.lastmod,
    '2026-07-30T00:00:00.000Z',
    '/pt-PT/lp has an unstable or incorrect lastmod',
  );

  for (const entry of entries) {
    for (const alternate of entry.alternates) {
      if (alternate.locale === 'x-default') continue;
      const target = entryByLoc.get(alternate.href);
      assert(target, `${entry.loc} points to a missing alternate ${alternate.href}`);
      assert(
        target.alternates.some((candidate) => candidate.href === entry.loc),
        `${alternate.href} does not reciprocate ${entry.loc}`,
      );
    }
  }

  const robotsResponse = await fetchNoRedirect(absolute('/robots.txt'));
  assert.equal(robotsResponse.status, 200, 'robots.txt is unavailable');
  const robotsText = await robotsResponse.text();
  const canonicalOrigin = new URL(locs[0]!).origin;
  assert(
    robotsText.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`),
    'robots.txt is missing the canonical sitemap',
  );
  const robotsGroups = parseRobotsGroups(robotsText);
  assert.equal(robotsGroups.length, 1, 'robots.txt must expose one shared crawler policy');
  assert.deepEqual(
    robotsGroups[0]?.userAgents.map((userAgent) => userAgent.toLowerCase()),
    ['*'],
    'robots.txt must use one wildcard user-agent group',
  );
  const supportedLocales = [
    ...new Set(
      locs
        .map((loc) => new URL(loc).pathname.split('/')[1])
        .filter((locale): locale is string => Boolean(locale)),
    ),
  ];
  for (const userAgent of crawlerUserAgents) {
    for (const loc of locs) {
      const pathname = new URL(loc).pathname;
      assert(
        isAllowedByRobots(robotsGroups, userAgent, pathname),
        `${userAgent} is disallowed from sitemap URL ${loc}`,
      );
    }
    for (const locale of supportedLocales) {
      for (const privatePath of [
        `/${locale}/s`,
        `/${locale}/s/private-story-id`,
        `/${locale}/sign-in`,
        `/${locale}/sign-up`,
        `/${locale}/my-stories`,
        `/${locale}/profile`,
        `/${locale}/buy-credits`,
      ]) {
        assert(
          !isAllowedByRobots(robotsGroups, userAgent, privatePath),
          `${userAgent} is allowed into private path ${privatePath}`,
        );
      }
      for (const publicPath of [
        `/${locale}/sample-books/example-book`,
        `/${locale}/lp/example`,
        `/${locale}/blog/example`,
      ]) {
        assert(
          isAllowedByRobots(robotsGroups, userAgent, publicPath),
          `${userAgent} is disallowed from public path ${publicPath}`,
        );
      }
    }
    const landingResponse = await fetch(absolute('/pt-PT/lp/livro-personalizado-para-casais'), {
      redirect: 'manual',
      headers: { 'accept-encoding': 'identity', 'user-agent': userAgent },
    });
    assert.equal(landingResponse.status, 200, `${userAgent} cannot access the landing pages`);
  }

  const indexNowKey = 'f14200a38cc04a14b331a8460f7267be';
  const keyResponse = await fetchNoRedirect(absolute(`/${indexNowKey}.txt`));
  assert.equal(keyResponse.status, 200, 'IndexNow key is unavailable');
  assert.equal((await keyResponse.text()).trim(), indexNowKey, 'IndexNow key is invalid');

  const landingLocs = locs.filter((loc) => loc.includes('/pt-PT/lp/'));
  const [homepageHtml, landingHubHtml] = await Promise.all([
    fetchNoRedirect(absolute('/pt-PT')).then((response) => response.text()),
    fetchNoRedirect(absolute('/pt-PT/lp')).then((response) => response.text()),
  ]);
  const homepageHrefs = extractHrefs(homepageHtml);
  const hubHrefs = extractHrefs(landingHubHtml);
  assert(landingHubHtml.includes('CollectionPage'), 'landing page hub lacks CollectionPage data');
  for (const pathname of requiredClusterPaths) {
    assert(hubHrefs.includes(pathname), `${pathname} is not linked from the landing page hub`);
  }

  const clusterPairs = [
    {
      guide: requiredClusterPaths[0],
      sample: requiredClusterPaths[2],
      landing: '/pt-PT/lp/livro-personalizado-para-casais',
    },
    {
      guide: requiredClusterPaths[1],
      sample: requiredClusterPaths[3],
      landing: '/pt-PT/lp/historias-de-apoio',
    },
  ];
  for (const cluster of clusterPairs) {
    const [guideHtml, sampleHtml, landingHtml] = await Promise.all(
      [cluster.guide, cluster.sample, cluster.landing].map((pathname) =>
        fetchNoRedirect(absolute(pathname)).then((response) => {
          assert.equal(response.status, 200, `${pathname} is not an immediate 200`);
          return response.text();
        }),
      ),
    );
    const guideHrefs = extractHrefs(guideHtml);
    const sampleHrefs = extractHrefs(sampleHtml);
    const landingHrefs = extractHrefs(landingHtml);
    assert(guideHrefs.includes(cluster.sample), `${cluster.guide} does not link its sample`);
    assert(guideHrefs.includes(cluster.landing), `${cluster.guide} does not link its landing`);
    assert(sampleHrefs.includes(cluster.guide), `${cluster.sample} does not link its guide`);
    assert(sampleHrefs.includes(cluster.landing), `${cluster.sample} does not link its landing`);
    assert(landingHrefs.includes(cluster.guide), `${cluster.landing} does not link its guide`);
    assert(landingHrefs.includes(cluster.sample), `${cluster.landing} does not link its sample`);
    assert(guideHtml.includes('FAQPage'), `${cluster.guide} lacks visible FAQ structured data`);
    assert(guideHtml.includes('BreadcrumbList'), `${cluster.guide} lacks breadcrumb data`);
    assert(guideHtml.includes('"Article"'), `${cluster.guide} lacks Article data`);
  }

  for (const loc of landingLocs) {
    const pathname = new URL(loc).pathname;
    assert(homepageHrefs.includes(pathname), `${pathname} is not linked from the homepage`);
    assert(hubHrefs.includes(pathname), `${pathname} is not linked from the landing page hub`);

    const html = await fetchNoRedirect(absolute(pathname)).then((response) => response.text());
    const relatedLandingLinks = new Set(
      extractHrefs(html).filter((href) => href.startsWith('/pt-PT/lp/') && href !== pathname),
    );
    assert(
      relatedLandingLinks.size >= 2,
      `${pathname} has fewer than two related landing page links`,
    );
  }

  await inBatches(locs, 1, async (loc) => {
    const response = await fetchNoRedirect(targetUrl(loc));
    assert.equal(response.status, 200, `${loc} is not an immediate 200`);
    const html = await response.text();
    const canonical = extractCanonical(html);
    assert.equal(canonical, loc, `${loc} has an incorrect or missing canonical`);
    const robots = extractRobots(html)?.toLowerCase();
    assert(robots?.includes('index') && !robots.includes('noindex'), `${loc} is not indexable`);
  });

  for (const path of [
    '/en-US/sign-in',
    '/en-US/my-stories',
    '/en-US/buy-credits',
    '/en-US/partners',
  ]) {
    const response = await fetchNoRedirect(absolute(path));
    const html = await response.text();
    assert(extractRobots(html)?.toLowerCase().includes('noindex'), `${path} is missing noindex`);
    assert(!locs.includes(absolute(path)), `${path} appears in the sitemap`);
  }

  const missingBlog = await fetchNoRedirect(absolute('/en-US/blog/__seo-smoke-missing__'));
  assert.equal(missingBlog.status, 404, 'unknown blog slug must return 404');

  const knownBlog = locs.find((loc) => loc.includes('/blog/'));
  if (knownBlog) {
    const url = new URL(knownBlog);
    await assertRedirect(`${url.pathname}/`, url.pathname);
  }

  const translatedBlog = entries.find((entry) => {
    if (!entry.loc.includes('/blog/')) return false;
    const source = new URL(entry.loc);
    return entry.alternates.some((alternate) => {
      if (alternate.locale === 'x-default') return false;
      const target = new URL(alternate.href);
      return target.pathname.split('/').at(-1) !== source.pathname.split('/').at(-1);
    });
  });
  if (translatedBlog) {
    const source = new URL(translatedBlog.loc);
    const alternate = translatedBlog.alternates.find((candidate) => {
      if (candidate.locale === 'x-default') return false;
      return (
        new URL(candidate.href).pathname.split('/').at(-1) !== source.pathname.split('/').at(-1)
      );
    });
    assert(alternate);
    const alternateUrl = new URL(alternate.href);
    const wrongLocale = alternateUrl.pathname.split('/')[1];
    const sourceSlug = source.pathname.split('/').at(-1);
    await assertRedirect(`/${wrongLocale}/blog/${sourceSlug}`, alternateUrl.pathname);
  }

  console.log(`SEO smoke passed for ${locs.length} canonical URLs at ${baseUrl.origin}`);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
