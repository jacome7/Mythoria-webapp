/** Per-tab intent binding; credentials remain server-issued HttpOnly cookies. */
const KEY = 'mythoria-biographer-guest-intent';
export type GuestIntent = { projectId: string; participantId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function setGuestIntent(value: GuestIntent) {
  if (!uuid.test(value.projectId) || !uuid.test(value.participantId))
    throw new Error('Invalid guest intent');
  sessionStorage.setItem(KEY, JSON.stringify(value));
}
export function readGuestIntent(): GuestIntent | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null') as GuestIntent | null;
    return value && uuid.test(value.projectId) && uuid.test(value.participantId) ? value : null;
  } catch {
    return null;
  }
}
export function guestIntentHeaders(value: GuestIntent): Record<string, string> {
  return {
    'x-biographer-project': value.projectId,
    'x-biographer-participant': value.participantId,
  };
}
