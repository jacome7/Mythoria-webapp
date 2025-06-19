/**
 * Server-only Mythoria CSS Class Preservation Utility
 * This file should only be imported in server-side code.
 */

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

export const preserveMythoriaClassesServer = (html: string): string => {
  if (!html || html.trim() === '') {
    return html;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(`<div>${html}</div>`);
  const tempDiv = dom.window.document.querySelector('div') as HTMLElement;
  MYTHORIA_CLASS_NAMES.forEach(className => {
    const elements = tempDiv.querySelectorAll(`.${className}`);
    elements.forEach(element => {
      if (!element.classList.contains(className)) {
        element.classList.add(className);
      }
    });
  });
  const result = tempDiv.innerHTML;
  dom.window.close();
  return result;
};
