'use client';

import { useEffect, useState } from 'react';
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  createCommand,
  LexicalCommand,
  type EditorState,
} from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { DOMConversionMap, DOMConversionOutput } from 'lexical';

// Text size definitions
export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';

export const TEXT_SIZE_OPTIONS = [
  { value: 'small' as TextSize, em: '0.875em' },
  { value: 'medium' as TextSize, em: '1em' },
  { value: 'large' as TextSize, em: '1.25em' },
  { value: 'xlarge' as TextSize, em: '1.5em' },
];

export const FORMAT_TEXT_SIZE_COMMAND: LexicalCommand<TextSize | null> = createCommand(
  'FORMAT_TEXT_SIZE_COMMAND',
);

export function normalizeHtmlContent(content: string): string {
  if (!content || !content.trim()) {
    return '<p><br></p>';
  }

  const trimmed = content.trim();
  const hasBlockElements = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre)\b[^>]*>/i.test(trimmed);

  if (hasBlockElements) {
    return trimmed;
  }

  const hasLineBreaks = trimmed.includes('\n') || trimmed.includes('<br');

  if (hasLineBreaks) {
    const paragraphs = trimmed
      .split(/\n\s*\n/)
      .map((para) => para.replace(/\n/g, '<br>').trim())
      .filter((para) => para.length > 0)
      .map((para) => `<p>${para}</p>`)
      .join('');
    return paragraphs || '<p><br></p>';
  }

  return `<p>${trimmed}</p>`;
}

const fontSizeSpanConversion: DOMConversionMap = {
  span: (domNode: HTMLElement) => {
    const fontSize = domNode.style.fontSize;
    if (!fontSize) return null;

    return {
      priority: 2,
      conversion: (node: HTMLElement): DOMConversionOutput => {
        const textNode = $createTextNode(node.textContent ?? '');
        const existingStyle = textNode.getStyle();
        const newStyle = existingStyle
          ? `${existingStyle}; font-size: ${fontSize}`
          : `font-size: ${fontSize}`;
        textNode.setStyle(newStyle);
        return { node: textNode };
      },
    };
  },
};

export const initialConfig = {
  namespace: 'ChapterEditor',
  theme: {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
    paragraph: 'mb-2',
    heading: {
      h1: 'text-2xl font-bold mb-4',
      h2: 'text-xl font-bold mb-3',
      h3: 'text-lg font-bold mb-2',
    },
  },
  nodes: [HeadingNode, QuoteNode],
  html: {
    import: fontSizeSpanConversion,
  },
  onError: (error: Error) => {
    console.error('Lexical editor error:', error);
  },
};

export function ContentInitializationPlugin({
  initialContent,
  chapterNumber,
}: {
  initialContent: string;
  chapterNumber: number;
}) {
  const [editor] = useLexicalComposerContext();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeContent = () => {
      try {
        editor.update(() => {
          const root = $getRoot();
          root.clear();

          const normalizedContent = normalizeHtmlContent(initialContent);

          if (normalizedContent && normalizedContent !== '<p><br></p>') {
            try {
              const parser = new DOMParser();
              const dom = parser.parseFromString(normalizedContent, 'text/html');
              const nodes = $generateNodesFromDOM(editor, dom);

              if (nodes.length > 0) {
                root.append(...nodes);
              } else {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = normalizedContent;
                const textContent = tempDiv.textContent || tempDiv.innerText || '';

                if (textContent.trim()) {
                  try {
                    const fallbackDom = parser.parseFromString(
                      `<p>${normalizedContent}</p>`,
                      'text/html',
                    );
                    const fallbackNodes = $generateNodesFromDOM(editor, fallbackDom);
                    if (fallbackNodes.length > 0) {
                      root.append(...fallbackNodes);
                    } else {
                      throw new Error('No nodes generated');
                    }
                  } catch {
                    const paragraph = $createParagraphNode();
                    paragraph.append($createTextNode(textContent));
                    root.append(paragraph);
                  }
                } else {
                  root.append($createParagraphNode());
                }
              }
            } catch {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = initialContent;
              const textContent = tempDiv.textContent || tempDiv.innerText || '';

              const paragraph = $createParagraphNode();
              if (textContent.trim()) {
                paragraph.append($createTextNode(textContent));
              }
              root.append(paragraph);
            }
          } else {
            root.append($createParagraphNode());
          }
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize editor:', error);
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      const timer = setTimeout(initializeContent, 100);
      return () => clearTimeout(timer);
    }
  }, [editor, initialContent, chapterNumber, isInitialized]);

  return null;
}

export function ContentChangePlugin({
  onContentChange,
  onHasChanges,
  initialContent,
  currentTitle,
  chapterTitle,
}: {
  onContentChange?: (content: string) => void;
  onHasChanges: (hasChanges: boolean) => void;
  initialContent: string;
  currentTitle: string;
  chapterTitle: string;
}) {
  const [editor] = useLexicalComposerContext();

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor);
      onContentChange?.(htmlString);
      onHasChanges(currentTitle !== chapterTitle || htmlString !== initialContent);
    });
  };

  return <OnChangePlugin onChange={handleChange} />;
}

export const createInitialEditorState = () => undefined;
