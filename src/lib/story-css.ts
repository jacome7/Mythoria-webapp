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
  const existingStyle = document.querySelector('style[data-story-css]');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Load and scope the CSS
  fetch(cssPath)
    .then(response => response.text())
    .then(css => {
      // Scope the CSS to only apply within .mythoria-story-scope
      const scopedCSS = css.replace(
        /([^{}]+)\s*\{/g,
        (match, selector) => {
          // Skip @media queries and other at-rules
          if (selector.trim().startsWith('@')) {
            return match;
          }
          
          // Clean up selector
          const cleanSelector = selector.trim();
          
          // Add scoping prefix
          const scopedSelector = cleanSelector
            .split(',')
            .map((s: string) => `.mythoria-story-scope ${s.trim()}`)
            .join(', ');
          
          return `${scopedSelector} {`;
        }
      );
      
      // Create and append scoped CSS
      const style = document.createElement('style');
      style.textContent = scopedCSS;
      style.setAttribute('data-story-css', 'true');
      document.head.appendChild(style);
    })
    .catch(error => {
      console.warn('Failed to load story CSS:', error);
    });
}

export function removeStoryCSS(): void {
  const existingStyle = document.querySelector('style[data-story-css]');
  if (existingStyle) {
    existingStyle.remove();
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
