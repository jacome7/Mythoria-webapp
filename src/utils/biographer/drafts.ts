export interface AnswerDraft {
  id: string;
  text: string;
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
export async function saveAnswerDraft(
  authorId: string,
  projectId: string,
  draft: AnswerDraft | null,
): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      if (draft) store.put(draft, `${authorId}:${projectId}`);
      else store.delete(`${authorId}:${projectId}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
