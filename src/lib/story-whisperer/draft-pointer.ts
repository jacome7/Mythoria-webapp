export const whispererDraftKey = (owner: string) => `storyWhispererDraft:${owner}`;
export const recoveredWhispererDraftKey = (owner: string) =>
  `recoveredStoryWhispererDraft:${owner}`;
const lastDraftKey = (owner: string) => `lastStoryWhispererDraft:${owner}`;

export function lastWhispererDraft(owner: string): string | null {
  try {
    return localStorage.getItem(lastDraftKey(owner));
  } catch {
    return null;
  }
}

export function rememberWhispererDraft(owner: string, draftId: string) {
  try {
    sessionStorage.setItem(whispererDraftKey(owner), draftId);
  } catch {
    // Server interview persistence is independent of the browser tab pointer.
  }
  try {
    localStorage.setItem(lastDraftKey(owner), draftId);
  } catch {
    // Browser storage can be unavailable. Server interview persistence is independent.
  }
}

export function forgetWhispererDraft(owner: string, draftId: string, includeTab = false) {
  try {
    const key = lastDraftKey(owner);
    if (localStorage.getItem(key) === draftId) localStorage.removeItem(key);
  } catch {
    // A browser storage failure must not interrupt a successful reset or submission.
  }
  if (!includeTab) return;
  try {
    for (const key of [whispererDraftKey(owner), recoveredWhispererDraftKey(owner)]) {
      if (sessionStorage.getItem(key) === draftId) sessionStorage.removeItem(key);
    }
  } catch {
    // Session storage is optional for an already submitted draft.
  }
}
