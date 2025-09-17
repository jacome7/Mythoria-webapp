// In-memory store for pending image edit jobs metadata.
// Process-local only; acceptable interim solution to avoid schema changes.
// Keyed by jobId.
export interface PendingImageJobMeta {
  authorId: string;
  storyId: string;
  imageType?: string;
  chapterNumber?: number;
  userRequest?: string;
  createdAt: number; // epoch ms
}

// Using a plain object for predictable JSON serialization in tests.
export const pendingImageJobs: Record<string, PendingImageJobMeta> = {};

// Helper to add/update a job entry.
export function setPendingImageJob(jobId: string, meta: PendingImageJobMeta) {
  pendingImageJobs[jobId] = meta;
}

// Helper to read (without deleting) a job entry.
export function getPendingImageJob(jobId: string) {
  return pendingImageJobs[jobId];
}

// Helper to delete a job entry when completed.
export function deletePendingImageJob(jobId: string) {
  delete pendingImageJobs[jobId];
}
