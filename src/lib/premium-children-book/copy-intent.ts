/** Retain a copy command across a lost response so retry opens the same copy. */
export function premiumCopyIntent(storyId: string) {
  const key = 'premium-copy:' + storyId;
  let intentId = sessionStorage.getItem(key);
  if (!intentId) {
    intentId = crypto.randomUUID();
    sessionStorage.setItem(key, intentId);
  }
  return {
    intentId,
    complete: () => {
      if (sessionStorage.getItem(key) === intentId) sessionStorage.removeItem(key);
    },
  };
}
