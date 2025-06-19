/**
 * Mythoria CSS Class Preservation Utility
 * 
 * This utility ensures that Mythoria-specific CSS class names are preserved
 * during story editing operations, maintaining the visual styling defined
 * in /public/templates/*.css files.
 */

import { JSDOM } from 'jsdom';

// Mythoria CSS class names that should be preserved
export const MYTHORIA_CLASS_NAMES = [
  'mythoria-story-title',
  'mythoria-author-name', 
  'mythoria-chapter-title',
  'mythoria-chapter',
  'mythoria-chapter-content',
  'mythoria-chapter-paragraph',
  'mythoria-chapter-image',
  'mythoria-chapter-img',
  'mythoria-table-of-contents',
  'mythoria-toc-title',
  'mythoria-toc-list',
  'mythoria-toc-item',
  'mythoria-toc-link',
  'mythoria-page-break',
  'mythoria-front-cover',
  'mythoria-back-cover',
  'mythoria-cover-image',
  'mythoria-message',
  'mythoria-message-text',
  'mythoria-author-emphasis',
  'mythoria-logo',
  'mythoria-dedicatory',
  'mythoria-credits',
  'mythoria-credits-text'
] as const;

export type MythoriaClassName = typeof MYTHORIA_CLASS_NAMES[number];

const isBrowser = typeof window !== 'undefined';

/**
 * Creates a DOM element for HTML parsing, compatible with both browser and server environments
 */
const createDOMElement = (html: string): { element: HTMLElement; cleanup?: () => void } => {
  if (isBrowser) {
    // Browser environment - use native DOM
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return { element: tempDiv };
  } else {
    // Server environment - use JSDOM
    const dom = new JSDOM(`<div>${html}</div>`);
    const element = dom.window.document.querySelector('div') as HTMLElement;
    return { 
      element,
      cleanup: () => dom.window.close?.()
    };
  }
};

/**
 * Preserves Mythoria CSS class names in HTML content
 * @param html - The HTML content to process
 * @returns HTML content with preserved Mythoria class names
 */
export const preserveMythoriaClasses = (html: string): string => {
  // If there's no HTML content, return as-is
  if (!html || html.trim() === '') {
    return html;
  }

  // Create a temporary DOM element to parse the HTML
  const { element: tempDiv, cleanup } = createDOMElement(html);

  try {
    // Find all elements with Mythoria classes and ensure they're preserved
    MYTHORIA_CLASS_NAMES.forEach(className => {
      const elements = tempDiv.querySelectorAll(`.${className}`);
      elements.forEach(element => {
        // Ensure the class is present (in case it was stripped)
        if (!element.classList.contains(className)) {
          element.classList.add(className);
        }
      });
    });
    
    // Special handling for common story structure elements
    preserveStoryStructure(tempDiv);

    const result = tempDiv.innerHTML;
    return result;
  } finally {
    // Clean up JSDOM instance if we're on the server
    if (cleanup) {
      cleanup();
    }
  }
};

/**
 * Preserves story structure by adding appropriate Mythoria classes
 * to elements that match expected patterns
 */
const preserveStoryStructure = (container: HTMLElement): void => {
  // Preserve story title class
  const h1Elements = container.querySelectorAll('h1');
  h1Elements.forEach((h1, index) => {
    if (!h1.className || !MYTHORIA_CLASS_NAMES.some(cls => h1.classList.contains(cls))) {
      // If it's the first h1 and doesn't have a Mythoria class, it's likely the story title
      if (index === 0) {
        h1.classList.add('mythoria-story-title');
      }
    }
  });

  // Preserve chapter structure
  const h2Elements = container.querySelectorAll('h2');
  h2Elements.forEach(h2 => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => h2.classList.contains(cls))) {
      // Check if it's a table of contents title
      if (h2.textContent?.toLowerCase().includes('table of contents')) {
        h2.classList.add('mythoria-toc-title');
      } else {
        h2.classList.add('mythoria-chapter-title');
      }
    }
  });

  const h3Elements = container.querySelectorAll('h3');
  h3Elements.forEach(h3 => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => h3.classList.contains(cls))) {
      h3.classList.add('mythoria-chapter-title');
    }
  });

  // Preserve structural div elements
  const divElements = container.querySelectorAll('div');
  divElements.forEach(div => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => div.classList.contains(cls))) {
      // Identify div type based on content patterns
      const text = div.textContent?.toLowerCase() || '';
      
      // Author name pattern
      if (text.includes('by ') && text.length < 100) {
        div.classList.add('mythoria-author-name');
      }
      // Dedicatory pattern
      else if (text.includes('dedicated') || text.includes('dedication')) {
        div.classList.add('mythoria-dedicatory');
      }
      // Message pattern (contains "imagined by" or "crafted with")
      else if (text.includes('imagined by') || text.includes('crafted with')) {
        div.classList.add('mythoria-message');
      }
      // Credits pattern
      else if (text.includes('credits') || text.includes('generated') || text.includes('created')) {
        div.classList.add('mythoria-credits');
      }
      // Table of contents pattern
      else if (div.querySelector('h2') && text.includes('table of contents')) {
        div.classList.add('mythoria-table-of-contents');
      }
      // Chapter pattern
      else if (div.querySelector('h2') && !text.includes('table of contents')) {
        div.classList.add('mythoria-chapter');
      }
      // Cover pattern (contains single image)
      else if (div.querySelector('img') && !div.querySelector('p, h1, h2, h3')) {
        const img = div.querySelector('img');
        const alt = img?.getAttribute('alt')?.toLowerCase() || '';
        if (alt.includes('front cover')) {
          div.classList.add('mythoria-front-cover');
        } else if (alt.includes('back cover')) {
          div.classList.add('mythoria-back-cover');
        } else if (alt.includes('chapter')) {
          div.classList.add('mythoria-chapter-image');
        }
      }
      // Chapter content pattern (contains paragraphs within chapter)
      else if (div.querySelector('p') && div.closest('.mythoria-chapter')) {
        div.classList.add('mythoria-chapter-content');
      }
      // Page break pattern (empty div or hr-like)
      else if (div.children.length === 0 && div.textContent?.trim() === '') {
        div.classList.add('mythoria-page-break');
      }
    }
  });

  // Preserve paragraph classes
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => p.classList.contains(cls))) {
      const parent = p.closest('div');
      const text = p.textContent?.toLowerCase() || '';
      
      // Message text pattern
      if (parent && parent.classList.contains('mythoria-message')) {
        p.classList.add('mythoria-message-text');
      }
      // Credits text pattern
      else if (parent && parent.classList.contains('mythoria-credits')) {
        p.classList.add('mythoria-credits-text');
      }
      // Default to chapter paragraph
      else {
        p.classList.add('mythoria-chapter-paragraph');
      }
    }
  });

  // Preserve list structure
  const ulElements = container.querySelectorAll('ul');
  ulElements.forEach(ul => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => ul.classList.contains(cls))) {
      const parent = ul.closest('div');
      if (parent && parent.classList.contains('mythoria-table-of-contents')) {
        ul.classList.add('mythoria-toc-list');
        
        // Add classes to list items
        ul.querySelectorAll('li').forEach(li => {
          if (!li.classList.contains('mythoria-toc-item')) {
            li.classList.add('mythoria-toc-item');
          }
          
          // Add classes to links within list items
          li.querySelectorAll('a').forEach(a => {
            if (!a.classList.contains('mythoria-toc-link')) {
              a.classList.add('mythoria-toc-link');
            }
          });
        });
      }
    }
  });

  // Preserve image classes
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => img.classList.contains(cls))) {
      const alt = img.getAttribute('alt')?.toLowerCase() || '';
      const src = img.getAttribute('src')?.toLowerCase() || '';
      
      // Logo pattern
      if (alt.includes('logo') || src.includes('logo')) {
        img.classList.add('mythoria-logo');
      }
      // Cover image pattern
      else if (alt.includes('cover')) {
        img.classList.add('mythoria-cover-image');
      }
      // Chapter image pattern
      else if (alt.includes('chapter') || img.closest('.mythoria-chapter-image')) {
        img.classList.add('mythoria-chapter-img');
      }
      // Default chapter image
      else {
        img.classList.add('mythoria-chapter-img');
      }
    }
  });

  // Preserve emphasis elements
  const emphasisElements = container.querySelectorAll('i, em, strong');
  emphasisElements.forEach(em => {
    if (!MYTHORIA_CLASS_NAMES.some(cls => em.classList.contains(cls))) {
      const parent = em.closest('.mythoria-message');
      if (parent) {
        em.classList.add('mythoria-author-emphasis');
      }
    }
  });

  // Create chapter structure if none exists (for TipTap editor content)
  if (!container.querySelector('.mythoria-chapter')) {
    // Create a main chapter container if none exists
    const mainChapter = container.ownerDocument.createElement('div');
    mainChapter.className = 'mythoria-chapter';
    
    // Create chapter content container
    const chapterContent = container.ownerDocument.createElement('div');
    chapterContent.className = 'mythoria-chapter-content';
    
    // Move all content into the chapter structure
    while (container.firstChild) {
      chapterContent.appendChild(container.firstChild);
    }
    
    mainChapter.appendChild(chapterContent);
    container.appendChild(mainChapter);
  }
};

/**
 * Validates that HTML content contains required Mythoria classes
 * @param html - The HTML content to validate
 * @returns Validation result with missing elements
 */
export const validateMythoriaClasses = (html: string): { 
  isValid: boolean; 
  missingElements: string[];
  warnings: string[];
} => {
  // Essential classes that should always be present
  const essentialClasses = [
    'mythoria-chapter-paragraph' // This should always be present from TipTap config
  ];

  // Optional classes that are good to have but not critical
  const optionalClasses = [
    'mythoria-story-title',
    'mythoria-chapter',
    'mythoria-chapter-title',
    'mythoria-chapter-content'
  ];

  const missingElements: string[] = [];
  const warnings: string[] = [];
  
  // Check essential classes
  essentialClasses.forEach(className => {
    if (!html.includes(className)) {
      missingElements.push(className);
    }
  });

  // Check optional classes and add to warnings if missing
  optionalClasses.forEach(className => {
    if (!html.includes(className)) {
      warnings.push(`Optional class missing: ${className}`);
    }
  });

  // Check for structural issues
  if (html.includes('<h1>') && !html.includes('mythoria-story-title')) {
    warnings.push('Found H1 elements without mythoria-story-title class');
  }

  if (html.includes('<h2>') && !html.includes('mythoria-chapter-title')) {
    warnings.push('Found H2 elements without mythoria-chapter-title class');
  }

  if (html.includes('<p>') && !html.includes('mythoria-chapter-paragraph')) {
    warnings.push('Found paragraph elements without mythoria-chapter-paragraph class');
  }

  // Consider validation successful if essential classes are present
  return {
    isValid: missingElements.length === 0,
    missingElements,
    warnings
  };

  return {
    isValid: missingElements.length === 0,
    missingElements,
    warnings
  };
};

/**
 * Strips all Mythoria classes from HTML content
 * Useful for testing or when you need clean HTML
 * @param html - The HTML content to clean
 * @returns HTML content without Mythoria classes
 */
export const stripMythoriaClasses = (html: string): string => {
  if (!html || html.trim() === '') {
    return html;
  }

  const { element: tempDiv, cleanup } = createDOMElement(html);

  try {
    // Remove all Mythoria classes
    MYTHORIA_CLASS_NAMES.forEach(className => {
      const elements = tempDiv.querySelectorAll(`.${className}`);
      elements.forEach(element => {
        element.classList.remove(className);
        // If no classes left, remove the class attribute entirely
        if (element.classList.length === 0) {
          element.removeAttribute('class');
        }
      });
    });

    const result = tempDiv.innerHTML;
    return result;
  } finally {
    // Clean up JSDOM instance if we're on the server
    if (cleanup) {
      cleanup();
    }
  }
};

/**
 * Gets a list of all Mythoria classes present in the HTML
 * @param html - The HTML content to analyze
 * @returns Array of Mythoria class names found
 */
export const getMythoriaClassesInHtml = (html: string): MythoriaClassName[] => {
  const foundClasses: MythoriaClassName[] = [];
  
  MYTHORIA_CLASS_NAMES.forEach(className => {
    if (html.includes(className)) {
      foundClasses.push(className);
    }
  });

  return foundClasses;
};
