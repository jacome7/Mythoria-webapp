export interface AnswerDraft {
  id: string;
  text: string;
  dictationIds?: string[];
}
const DATABASE = 'mythoria-biographer-drafts';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
export async function answerDraft(
  authorId: string,
  projectId: string,
): Promise<AnswerDraft | undefined> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction('drafts')
        .objectStore('drafts')
        .get(`${authorId}:${projectId}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function updateAnswerDraft(
  authorId: string,
  projectId: string,
  update: (current: AnswerDraft | undefined) => AnswerDraft | null,
): Promise<AnswerDraft | null> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite', { durability: 'strict' });
      const store = tx.objectStore('drafts');
      const key = `${authorId}:${projectId}`;
      let saved: AnswerDraft | null;
      const request = store.get(key);
      request.onsuccess = () => {
        saved = update(request.result);
        if (saved) store.put(saved, key);
        else store.delete(key);
      };
      tx.oncomplete = () => resolve(saved);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveAnswerDraft(
  authorId: string,
  projectId: string,
  draft: AnswerDraft | null,
): Promise<void> {
  await updateAnswerDraft(authorId, projectId, (current) => {
    if (!draft) return null;
    return { ...draft, dictationIds: current?.dictationIds };
  });
}

/** Commit the editable text and receipt together before the recording is removed. */
export function appendAnswerDictation(
  authorId: string,
  projectId: string,
  segmentId: string,
  transcript: string,
  draftId: string,
): Promise<AnswerDraft | null> {
  return updateAnswerDraft(authorId, projectId, (current) => {
    if (current?.dictationIds?.includes(segmentId)) return current;
    return {
      id: draftId,
      text: [current?.text.trimEnd(), transcript].filter(Boolean).join(' '),
      dictationIds: [...(current?.dictationIds ?? []), segmentId],
    };
  });
}
