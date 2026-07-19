import assert from 'node:assert/strict';

const baseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = new URL(baseArg?.slice('--base-url='.length) || 'http://localhost:3000');
baseUrl.pathname = '';

function absolute(pathname: string): string {
  return new URL(pathname, baseUrl).toString();
}

function targetUrl(canonicalUrl: string): string {
  const url = new URL(canonicalUrl);
  return absolute(`${url.pathname}${url.search}`);
}

async function fetchNoRedirect(url: string) {
  return fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mythoria-SEO-Smoke/1.0' } });
}

async function assertRedirect(source: string, expectedPath: string) {
  const first = await fetchNoRedirect(absolute(source));
  assert.equal(first.status, 308, `${source} should return 308`);
  const location = first.headers.get('location');
  assert(location, `${source} did not include Location`);
  const destination = new URL(location, baseUrl);
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

function parseSitemapEntries(xml: string) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    assert(locMatch, 'sitemap entry is missing loc');
    const alternates = [...block.matchAll(/<xhtml:link\b[^>]*\/>/g)].map((linkMatch) => {
      const tag = linkMatch[0];
      const locale = tag.match(/hreflang="([^"]+)"/)?.[1];
      const href = tag.match(/href="([^"]+)"/)?.[1];
      assert(locale && href, 'sitemap alternate is malformed');
      return { locale: xmlDecode(locale), href: xmlDecode(href) };
    });
    return { loc: xmlDecode(locMatch[1]), alternates };
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
  console.log(`Deployed Git SHA: ${health.gitSha}`);

  await assertRedirect('/', '/en-US');
  await assertRedirect('/en-US/', '/en-US');
  await assertRedirect('/en-us/', '/en-US');
  await assertRedirect('/pt-PT/lp/', '/pt-PT/lp');
  await assertRedirect(
    '/lp/livro-personalizado-para-casais?utm_source=seo-smoke',
    '/pt-PT/lp/livro-personalizado-para-casais?utm_source=seo-smoke',
  );

  const sitemapResponse = await fetchNoRedirect(absolute('/sitemap.xml'));
  assert.equal(sitemapResponse.status, 200, 'sitemap is unavailable');
  const sitemap = await sitemapResponse.text();
  const entries = parseSitemapEntries(sitemap);
  const locs = entries.map((entry) => entry.loc);
  assert(locs.length > 0, 'sitemap contains no URLs');
  assert.equal(new Set(locs).size, locs.length, 'sitemap contains duplicate URLs');
  const entryByLoc = new Map(entries.map((entry) => [entry.loc, entry]));

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

  const robotsText = await (await fetchNoRedirect(absolute('/robots.txt'))).text();
  for (const userAgent of ['GPTBot', 'ClaudeBot', 'Google-Extended']) {
    assert(robotsText.includes(`User-Agent: ${userAgent}`), `${userAgent} has no explicit policy`);
  }
  const disallows = [...robotsText.matchAll(/^Disallow:\s*(.+)$/gim)].map((match) =>
    match[1].trim(),
  );
  for (const userAgent of [
    'OAI-SearchBot',
    'GPTBot',
    'Claude-SearchBot',
    'ClaudeBot',
    'PerplexityBot',
  ]) {
    const landingResponse = await fetch(absolute('/pt-PT/lp/livro-personalizado-para-casais'), {
      redirect: 'manual',
      headers: { 'user-agent': userAgent },
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

  await inBatches(locs, 10, async (loc) => {
    const response = await fetchNoRedirect(targetUrl(loc));
    assert.equal(response.status, 200, `${loc} is not an immediate 200`);
    const html = await response.text();
    const canonical = extractCanonical(html);
    assert.equal(canonical, loc, `${loc} has an incorrect or missing canonical`);
    const robots = extractRobots(html)?.toLowerCase();
    assert(robots?.includes('index') && !robots.includes('noindex'), `${loc} is not indexable`);
    const pathname = new URL(loc).pathname;
    assert(!disallows.some((rule) => pathname.startsWith(rule.replace(/\*.*$/, ''))));
  });

  for (const path of [
    '/en-US/sign-in',
    '/en-US/my-stories',
    '/en-US/buy-credits',
    '/en-US/partners',
  ]) {
    const response = await fetch(absolute(path));
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
