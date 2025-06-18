// Utility functions for story CSS template loading

export interface StoryMetadata {
  targetAudience: string;
  graphicalStyle?: string; // Made optional since we're not using it anymore
}

export function getStoryCSSPath(targetAudience: string): string {
  // Return the path to the CSS file based only on target audience
  return `/templates/${targetAudience}.css`;
}

export function loadStoryCSS(targetAudience: string): void {
  const cssPath = getStoryCSSPath(targetAudience);
  
  // Remove any existing story CSS
  const existingLink = document.querySelector('link[data-story-css]');
  if (existingLink) {
    existingLink.remove();
  }
  
  // Create and append new CSS link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssPath;
  link.setAttribute('data-story-css', 'true');
  document.head.appendChild(link);
}

export function removeStoryCSS(): void {
  const existingLink = document.querySelector('link[data-story-css]');
  if (existingLink) {
    existingLink.remove();
  }
}

export const AVAILABLE_AUDIENCES = [
  'children_0-2',
  'children_3-6',   'children_7-10',
  'children_11-14',
  'young_adult_15-17',
  'adult_18+',
  'all_ages'
];
