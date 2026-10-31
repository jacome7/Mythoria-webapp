export function createDocumentWorker(): Worker {
  return new Worker(new URL('./document-worker.ts', import.meta.url), { type: 'module' });
}
