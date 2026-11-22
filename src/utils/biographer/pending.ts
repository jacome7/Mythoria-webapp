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
  capturedAt: string;
  purpose?: 'dictation';
}
const DATABASE = 'mythoria-biographer-capture';
const STORE = 'segments';
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isPendingAudioExpired(segment: PendingSegment): boolean {
  const time = Date.parse(segment.capturedAt);
  return !Number.isFinite(time) || Date.now() - time >= MAX_AGE_MS;
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function write<T>(
  operation: (store: IDBObjectStore, result: (value: T) => void, abort: () => void) => void,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? new Error('Pending audio write failed'));
      tx.onerror = () => reject(tx.error);
      operation(
        tx.objectStore(STORE),
        (next) => {
          value = next;
        },
        () => tx.abort(),
      );
    });
  } finally {
    db.close();
  }
}

function unexpired(store: IDBObjectStore, handle: (segments: PendingSegment[]) => void) {
  const request = store.getAll();
  request.onsuccess = () => {
    const segments = (request.result as PendingSegment[]).filter((segment) => {
      if (!isPendingAudioExpired(segment)) return true;
      store.delete(segment.id);
      return false;
    });
    handle(segments);
  };
}

export function pendingSegments(
  authorId: string,
  projectId: string,
  purpose?: PendingSegment['purpose'],
): Promise<PendingSegment[]> {
  return write((store, result) => {
    unexpired(store, (segments) => {
      result(
        segments
          .filter(
            (s) => s.authorId === authorId && s.projectId === projectId && s.purpose === purpose,
          )
          .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt) || a.sequence - b.sequence),
      );
    });
  });
}

export function savePending(segment: PendingSegment): Promise<void> {
  if (isPendingAudioExpired(segment)) return removePending(segment.id);
  return write((store, _result, abort) => {
    unexpired(store, (segments) => {
      const bytes = segments.reduce(
        (total, item) => total + (item.id === segment.id ? 0 : item.data.byteLength),
        0,
      );
      if (bytes + segment.data.byteLength > MAX_BYTES) abort();
      else store.put(segment);
    });
  });
}

export function removePending(id: string): Promise<void> {
  return write((store) => {
    store.delete(id);
  });
}

export function clearPending(
  authorId: string,
  projectId: string,
  purpose?: PendingSegment['purpose'],
): Promise<void> {
  return write((store) => {
    unexpired(store, (segments) => {
      for (const segment of segments) {
        if (
          segment.authorId === authorId &&
          segment.projectId === projectId &&
          segment.purpose === purpose
        )
          store.delete(segment.id);
      }
    });
  });
}
