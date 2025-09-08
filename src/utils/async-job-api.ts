/**
 * Async Job API Client
 * Utilities for creating and managing async AI editing jobs
 */

export interface AsyncJobResponse {
  success: boolean;
  jobId: string;
  estimatedDuration: number;
  message: string;
}

export interface JobStatusResponse {
  success: boolean;
  job: {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    elapsedTime: number;
    remainingTime: number;
    estimatedDuration: number;
    metadata?: { [key: string]: unknown };
    result?: { [key: string]: unknown };
    error?: string;
  };
}

/**
 * Create an async text editing job
 */
export async function createTextEditJob(params: {
  storyId: string;
  userRequest: string;
  scope: 'chapter' | 'story';
  chapterNumber?: number;
}): Promise<AsyncJobResponse> {
  const response = await fetch('/api/jobs/text-edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create an async image editing job
 */
export async function createImageEditJob(params: {
  storyId: string;
  imageUrl: string;
  imageType: 'cover' | 'backcover' | 'chapter';
  userRequest?: string;
  chapterNumber?: number;
  graphicalStyle?: string;
  userImageUri?: string;
  convertToStyle?: boolean; // NEW explicit flag: true => AI restyle using userImageUri as reference; false/undefined => standard edit
}): Promise<AsyncJobResponse> {
  const response = await fetch('/api/jobs/image-edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create an async full story translation job
 */
export async function createTranslateJob(params: {
  storyId: string;
  targetLocale: string;
}): Promise<AsyncJobResponse> {
  const response = await fetch('/api/jobs/translate-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Helper function to poll job status until completion
 */
export async function waitForJobCompletion(
  jobId: string,
  onProgress?: (progress: number, status: string) => void,
  pollInterval: number = 2000
): Promise<{ [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await getJobStatus(jobId);
        
        if (response.success && response.job) {
          const { status, progress, result, error } = response.job;
          
          // Call progress callback if provided
          if (onProgress) {
            onProgress(progress, status);
          }
          
          if (status === 'completed') {
            resolve(result || {});
          } else if (status === 'failed') {
            reject(new Error(error || 'Job failed'));
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } else {
          reject(new Error('Invalid job status response'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}
