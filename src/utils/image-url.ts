/**
 * Utility functions for handling image URLs
 * This is the centralized utility for all image URL handling in the application
 */

const STORAGE_BASE_URL = 'https://storage.googleapis.com/mythoria-generated-stories';
const MYTHORIA_SITE_URL = 'https://mythoria.pt';

/**
 * Converts a relative image path to an absolute URL
 * This is the main function that should be used throughout the application for image URLs
 * @param relativePath - The relative path from the database (e.g., "storyId/images/chapter_1_v001.jpg")
 * @returns The absolute URL or null if the path is invalid
 */
export function toAbsoluteImageUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;

  // If it's a mythoria.pt URL, convert to relative path for local assets
  // This prevents Next.js Image from fetching from itself (causing loops/500 errors)
  if (relativePath.startsWith(MYTHORIA_SITE_URL)) {
    return relativePath.replace(MYTHORIA_SITE_URL, '');
  }

  // If it's already an absolute URL (e.g., GCS), return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // If it starts with /, it's a local asset - return as is
  if (relativePath.startsWith('/')) {
    return relativePath;
  }

  // Convert relative path to absolute GCS URL
  return `${STORAGE_BASE_URL}/${relativePath}`;
}

/**
 * Alias for toAbsoluteImageUrl to maintain compatibility with existing code
 * @deprecated Use toAbsoluteImageUrl instead
 */
export const formatImageUrl = toAbsoluteImageUrl;

/**
 * Converts an absolute URL back to a relative path for database storage
 * @param absoluteUrl - The absolute URL
 * @returns The relative path or the original URL if it doesn't match our storage pattern
 */
export function toRelativeImagePath(absoluteUrl: string | null | undefined): string | null {
  if (!absoluteUrl) return null;

  // If it's already a relative path, return as is
  if (!absoluteUrl.startsWith('http://') && !absoluteUrl.startsWith('https://')) {
    return absoluteUrl;
  }

  // Convert GCS absolute URL to relative path
  if (absoluteUrl.startsWith(STORAGE_BASE_URL)) {
    return absoluteUrl.replace(`${STORAGE_BASE_URL}/`, '');
  }

  // Convert mythoria.pt URLs to relative paths (prevents self-referential image optimization)
  if (absoluteUrl.startsWith(MYTHORIA_SITE_URL)) {
    return absoluteUrl.replace(MYTHORIA_SITE_URL, '');
  }

  // If it's an external URL, return as is
  return absoluteUrl;
}
