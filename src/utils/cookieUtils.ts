/**
 * Cookie utility functions for managing anonymous user ratings
 */

interface AnonymousRating {
  rating: string;
  feedback?: string;
  createdAt: string;
}

const COOKIE_PREFIX = 'mythoria_rating_';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Get an anonymous rating from cookies for a specific story
 */
export function getAnonymousRating(storyId: string): AnonymousRating | null {
  if (typeof document === 'undefined') return null;
  
  const cookieName = `${COOKIE_PREFIX}${storyId}`;
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch (error) {
        console.error('Error parsing anonymous rating cookie:', error);
        // Remove invalid cookie
        removeAnonymousRating(storyId);
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Set an anonymous rating in cookies for a specific story
 */
export function setAnonymousRating(
  storyId: string, 
  rating: string, 
  feedback?: string
): void {
  if (typeof document === 'undefined') return;
  
  const ratingData: AnonymousRating = {
    rating,
    feedback: feedback || undefined,
    createdAt: new Date().toISOString(),
  };
  
  const cookieName = `${COOKIE_PREFIX}${storyId}`;
  const cookieValue = encodeURIComponent(JSON.stringify(ratingData));
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  
  document.cookie = `${cookieName}=${cookieValue}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Remove an anonymous rating cookie for a specific story
 */
export function removeAnonymousRating(storyId: string): void {
  if (typeof document === 'undefined') return;
  
  const cookieName = `${COOKIE_PREFIX}${storyId}`;
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Check if cookies are supported and enabled
 */
export function areCookiesSupported(): boolean {
  if (typeof document === 'undefined') return false;
  
  try {
    const testCookie = 'test_cookie_support';
    document.cookie = `${testCookie}=test; path=/`;
    const supported = document.cookie.indexOf(testCookie) !== -1;
    // Clean up test cookie
    document.cookie = `${testCookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    return supported;
  } catch {
    return false;
  }
}
