import { BASE_URL, normalizePathname } from './seo';

export const INDEXNOW_KEY = 'f14200a38cc04a14b331a8460f7267be';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export function buildIndexNowPayload(urls: string[]): IndexNowPayload {
  const canonicalUrls = [...new Set(urls)].map((value) => {
    const url = new URL(value);

    if (url.origin !== BASE_URL || url.protocol !== 'https:' || url.hostname !== 'mythoria.pt') {
      throw new Error(`IndexNow only accepts canonical Mythoria URLs: ${value}`);
    }
    if (url.search || url.hash || url.pathname !== normalizePathname(url.pathname)) {
      throw new Error(`IndexNow URL is not canonical: ${value}`);
    }

    return url.toString();
  });

  if (!canonicalUrls.length) throw new Error('IndexNow requires at least one URL');
  if (canonicalUrls.length > 10_000) throw new Error('IndexNow accepts at most 10,000 URLs');

  return {
    host: 'mythoria.pt',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: canonicalUrls,
  };
}
