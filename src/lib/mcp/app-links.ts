export const APP_BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt').replace(
  /\/+$/,
  '',
);

export function resolveStoryWebUrl(locale: string, slug: string): string {
  return `${APP_BASE_URL}/${locale}/p/${slug}`;
}

export function resolveStoryApiUrl(slug: string): string {
  return `${APP_BASE_URL}/api/p/${slug}`;
}

export function resolveStoryAudioPreviewUrl(slug: string, chapterIndex = 0): string {
  return `${APP_BASE_URL}/api/p/${slug}/audio/${chapterIndex}`;
}

export function resolveAuthorStoryReadUrl(locale: string, storyId: string): string {
  return `${APP_BASE_URL}/${locale}/stories/read/${storyId}`;
}

export function resolveAuthorStoryListenUrl(locale: string, storyId: string): string {
  return `${APP_BASE_URL}/${locale}/stories/listen/${storyId}`;
}
