export const SELF_PRINTING_SERVICE_CODE = 'selfPrinting' as const;

export function initialAuthorGrant(configured?: number) {
  return configured || 5;
}
