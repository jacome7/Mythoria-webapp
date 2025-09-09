export interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  storyGenerationStatus?: 'queued' | 'running' | 'failed' | 'completed' | 'cancelled' | null;
  storyGenerationCompletedPercentage?: number;
  isPublic?: boolean;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

export type SortField = 'title' | 'createdAt' | 'updatedAt' | 'status';
export type SortDirection = 'asc' | 'desc';
