/** Recovery queue is scoped to a signed-in author. It is never an authentication store. */
export interface PendingSegment {
  id: string;
  authorId: string;
  projectId: string;
  sessionId: string;
  turnId: string;
  sequence: number;
  durationMs: number;
  data: ArrayBuffer;
}
const DATABASE = 'mythoria-biographer-capture';
const STORE = 'segments';
const MAX_BYTES = 32 * 1024 * 1024;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
export async function pendingSegments(
  authorId: string,
  projectId: string,
): Promise<PendingSegment[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () =>
        resolve(
          (request.result as PendingSegment[])
            .filter((s) => s.authorId === authorId && s.projectId === projectId)
            .sort((a, b) => a.sequence - b.sequence),
        );
    });
  } finally {
    db.close();
  }
}
export async function savePending(segment: PendingSegment): Promise<void> {
  const existing = await pendingSegments(segment.authorId, segment.projectId);
  if (
    existing.reduce((sum, item) => sum + item.data.byteLength, 0) + segment.data.byteLength >
    MAX_BYTES
  )
    throw new Error('Local recording limit reached');
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(segment);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function removePending(id: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
