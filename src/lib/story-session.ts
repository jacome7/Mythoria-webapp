// Utility functions for managing story session data across steps

export interface Character {
  characterId?: string;
  name: string;
  type: string;
  passions?: string;
  superpowers?: string;
  physicalDescription?: string;
  photoUrl?: string;
  role?: string;
}

export interface StorySessionData {
  storyId: string;
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
 * Clear all story session data
 */
export function clearStorySession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('currentStoryId');
  localStorage.removeItem('step2Data');
  localStorage.removeItem('step3Data');
}

/**
 * Check if we have a valid story session
 */
export function hasValidStorySession(): boolean {
  return getCurrentStoryId() !== null;
}
