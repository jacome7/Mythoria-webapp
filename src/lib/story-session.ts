// Utility functions for managing story session data across steps

export interface Character {
  characterId?: string;
  name: string;
  type: string;
  role?: string;
  passions?: string;
  superpowers?: string;
  physicalDescription?: string;
  photoUrl?: string;
}

export interface StorySessionData {
  storyId: string;
  step1Data?: {
    dedicationMessage: string;
  };
  step2Data?: {
    text: string;
    hasImage: boolean;
    hasAudio: boolean;
    activeTab: 'text' | 'image' | 'audio';
  };
  step3Data?: {
    characters: Character[];
  };
}

/**
 * Get the current story ID from localStorage
 */
export function getCurrentStoryId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('currentStoryId');
}

/**
 * Set the current story ID in localStorage
 */
export function setCurrentStoryId(storyId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('currentStoryId', storyId);
}

/**
 * Set step 1 data in localStorage
 */
export function setStep1Data(data: StorySessionData['step1Data']): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('step1Data', JSON.stringify(data));
}

/**
 * Get step 1 data from localStorage
 */
export function getStep1Data(): StorySessionData['step1Data'] | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem('step1Data');
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing step1Data:', error);
    return null;
  }
}

/**
 * Get step 2 data from localStorage
 */
export function getStep2Data(): StorySessionData['step2Data'] | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem('step2Data');
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing step2Data:', error);
    return null;
  }
}

/**
 * Set step 3 data in localStorage
 */
export function setStep3Data(data: StorySessionData['step3Data']): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('step3Data', JSON.stringify(data));
}

/**
 * Get step 3 data from localStorage
 */
export function getStep3Data(): StorySessionData['step3Data'] | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem('step3Data');
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing step3Data:', error);
    return null;
  }
}

/**
 * Load existing story data for editing
 */
export async function loadExistingStoryData(storyId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    // Fetch story data
    const response = await fetch(`/api/my-stories/${storyId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch story data');
    }
    
    await response.json(); // just to consume the response
    // Set the story ID
    setCurrentStoryId(storyId);
    
    // Load existing step data if available
    // For now, we'll focus on step 3 (characters)
    // You can extend this to load step 2 data as well
    
    return true;
  } catch (error) {
    console.error('Error loading existing story data:', error);
    return false;
  }
}

/**
 * Check if we're in edit mode
 */
export function isEditMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isEditMode') === 'true';
}

/**
 * Set edit mode
 */
export function setEditMode(isEdit: boolean): void {
  if (typeof window === 'undefined') return;
  if (isEdit) {
    localStorage.setItem('isEditMode', 'true');
  } else {
    localStorage.removeItem('isEditMode');
  }
}

/**
 * Clear all story session data including edit mode
 */
export function clearStorySession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('currentStoryId');
  localStorage.removeItem('step1Data');
  localStorage.removeItem('step2Data');
  localStorage.removeItem('step3Data');
  localStorage.removeItem('isEditMode');
}

/**
 * Check if we have a valid story session
 */
export function hasValidStorySession(): boolean {
  return getCurrentStoryId() !== null;
}
