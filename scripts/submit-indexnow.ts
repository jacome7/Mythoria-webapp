import { getIndexableLandingPages } from '@/content/landing-pages';
import { buildIndexNowPayload, INDEXNOW_ENDPOINT } from '@/lib/indexnow';
import { buildAbsoluteUrl, buildLocalizedUrl } from '@/lib/seo';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requestedValues = args.filter((arg) => arg !== '--dry-run');
  const landingUrls = getIndexableLandingPages().map((page) =>
    buildLocalizedUrl(page.locale, `/lp/${page.slug}`),
  );
  const allowedUrls = new Set(landingUrls);
  const requestedUrls = requestedValues.length
    ? requestedValues.map((value) => buildAbsoluteUrl(value))
    : landingUrls;

  for (const url of requestedUrls) {
    if (!allowedUrls.has(url)) {
      throw new Error(`URL is not an indexable registered landing page: ${url}`);
    }
  }

  const payload = buildIndexNowPayload(requestedUrls);

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200 && response.status !== 202) {
    const responseBody = await response.text();
    throw new Error(`IndexNow rejected the batch with ${response.status}: ${responseBody}`);
  }

  console.log(
    `IndexNow accepted ${payload.urlList.length} canonical landing page URLs (${response.status}).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
