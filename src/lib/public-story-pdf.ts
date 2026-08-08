export type PublicStoryPdfDocument = 'cover' | 'interior';

export interface PublicStoryPdfEligibility {
  isPublic: boolean | null | undefined;
  isFeatured: boolean | null | undefined;
  coverPdfUri: string | null | undefined;
  interiorPdfUri: string | null | undefined;
}

const hasUri = (uri: string | null | undefined): uri is string => Boolean(uri?.trim());

export const hasFeaturedStoryPdfDownloads = (story: PublicStoryPdfEligibility): boolean =>
  Boolean(
    story.isPublic && story.isFeatured && hasUri(story.coverPdfUri) && hasUri(story.interiorPdfUri),
  );

export const isPublicStoryPdfDocument = (document: string): document is PublicStoryPdfDocument =>
  document === 'cover' || document === 'interior';

export const getFeaturedStoryPdfUri = (
  story: PublicStoryPdfEligibility,
  document: PublicStoryPdfDocument,
): string | null => {
  if (!hasFeaturedStoryPdfDownloads(story)) return null;
  if (!hasUri(story.coverPdfUri) || !hasUri(story.interiorPdfUri)) return null;

  return document === 'cover' ? story.coverPdfUri.trim() : story.interiorPdfUri.trim();
};

export const getFeaturedStoryPdfFilename = (
  title: string,
  document: PublicStoryPdfDocument,
): string => {
  const safeTitle =
    title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'historia';

  return `${safeTitle}-${document === 'cover' ? 'capa' : 'livro'}.pdf`;
};

/**
 * Converts the supported internal GCS references into an HTTPS URL suitable for
 * server-side streaming. Only the configured story bucket is accepted.
 */
export const getConfiguredStorageUrl = (uri: string): string | null => {
  const bucket = (process.env.STORAGE_BUCKET_NAME || 'mythoria-generated-stories').trim();
  const trimmedUri = uri.trim();
  const gsPrefix = `gs://${bucket}/`;

  if (trimmedUri.startsWith(gsPrefix)) {
    const objectPath = trimmedUri.slice(gsPrefix.length);
    if (!objectPath) return null;
    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
    return `https://storage.googleapis.com/${bucket}/${encodedPath}`;
  }

  try {
    const url = new URL(trimmedUri);
    const pathPrefix = `/${bucket}/`;

    if (url.protocol === 'https:' && url.hostname === 'storage.googleapis.com') {
      return url.pathname.startsWith(pathPrefix) ? url.toString() : null;
    }

    if (url.protocol === 'https:' && url.hostname === `${bucket}.storage.googleapis.com`) {
      const objectPath = url.pathname.replace(/^\//, '');
      return objectPath
        ? `https://storage.googleapis.com/${bucket}/${objectPath}${url.search}`
        : null;
    }
  } catch {
    return null;
  }

  return null;
};
