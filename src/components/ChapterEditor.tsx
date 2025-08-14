'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getRoot, 
  $createParagraphNode, 
  $createTextNode,
  EditorState
} from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { 
  HeadingNode, 
  QuoteNode 
} from '@lexical/rich-text';
import { 
  FORMAT_TEXT_COMMAND,
  TextFormatType,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  TextNode,
  DOMConversionMap,
  DOMConversionOutput
} from 'lexical';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiSave,
  FiZap,
  FiImage,
  FiType,
  FiChevronLeft
} from 'react-icons/fi';
import { toAbsoluteImageUrl } from '../utils/image-url';

// Text size definitions
// Provides inline font-size styling using em units for relative sizing
type TextSize = 'small' | 'medium' | 'large' | 'xlarge';

const TEXT_SIZE_OPTIONS = [
  { value: 'small' as TextSize, em: '0.875em' },
  { value: 'medium' as TextSize, em: '1em' },
  { value: 'large' as TextSize, em: '1.25em' },
  { value: 'xlarge' as TextSize, em: '1.5em' },
];

// Custom command for text size formatting
export const FORMAT_TEXT_SIZE_COMMAND: LexicalCommand<TextSize | null> = createCommand('FORMAT_TEXT_SIZE_COMMAND');

// Helper function to ensure proper HTML structure for Lexical while preserving inline styles
function normalizeHtmlContent(content: string): string {
  if (!content || !content.trim()) {
    return '<p><br></p>'; // Empty paragraph for Lexical
  }

  // Remove extra whitespace and normalize, but preserve inline styles
  const trimmed = content.trim();
  
  // Check if content already has proper block-level elements
  const hasBlockElements = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre)\b[^>]*>/i.test(trimmed);
  
  if (hasBlockElements) {
    // Content has block elements, return as-is to preserve styling
    return trimmed;
  } else {
    // Plain text or inline elements only - wrap in paragraph but preserve existing tags
    const hasLineBreaks = trimmed.includes('\n') || trimmed.includes('<br');
    
    if (hasLineBreaks) {
      // Convert line breaks to paragraphs while preserving inline elements
      const paragraphs = trimmed
        .split(/\n\s*\n/) // Split on double line breaks
        .map(para => para.replace(/\n/g, '<br>').trim())
        .filter(para => para.length > 0)
        .map(para => `<p>${para}</p>`)
        .join('');
      
      return paragraphs || '<p><br></p>';
    } else {
      // Single line/paragraph - wrap but preserve inline elements
      return `<p>${trimmed}</p>`;
    }
  }
}

// DOM converter for font-size spans
// Converts <span style="font-size: …">text</span> → TextNode with preserved style
const fontSizeSpanConversion: DOMConversionMap = {
  span: (domNode: HTMLElement) => {
    const fontSize = domNode.style.fontSize;
    if (!fontSize) return null; // let the default importer handle it

    return {
      priority: 2, // higher than the default span converter (priority 1)
      conversion: (node: HTMLElement): DOMConversionOutput => {
        const textNode = $createTextNode(node.textContent ?? '');
        
        // Preserve the font-size style
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

// Editor configuration
const initialConfig = {
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

// Simplified toolbar component
function EditorToolbar({ onAIEdit }: { onAIEdit?: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [currentTextSize, setCurrentTextSize] = useState<TextSize>('medium');
  const tChapterEditor = useTranslations('ChapterEditor');

  // Update format state
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
          
          // Detect text size from selection
          let detectedSize: TextSize = 'medium';
          
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            // Check the first text node for font-size
            const firstTextNode = nodes.find(node => node instanceof TextNode) as TextNode;
            if (firstTextNode) {
              const style = firstTextNode.getStyle();
              const fontSizeMatch = style.match(/font-size:\s*([^;]+)/);
              if (fontSizeMatch) {
                const fontSize = fontSizeMatch[1].trim();
                // Find matching size option
                const sizeOption = TEXT_SIZE_OPTIONS.find(opt => opt.em === fontSize);
                if (sizeOption) {
                  detectedSize = sizeOption.value;
                }
              }
            }
          } else {
            // No nodes selected, check the node at cursor
            const anchorNode = selection.anchor.getNode();
            if (anchorNode instanceof TextNode) {
              const style = anchorNode.getStyle();
              const fontSizeMatch = style.match(/font-size:\s*([^;]+)/);
              if (fontSizeMatch) {
                const fontSize = fontSizeMatch[1].trim();
                const sizeOption = TEXT_SIZE_OPTIONS.find(opt => opt.em === fontSize);
                if (sizeOption) {
                  detectedSize = sizeOption.value;
                }
              }
            }
          }
          
          setCurrentTextSize(detectedSize);
        }
      });
    });

    return unregister;
  }, [editor]);

  // Register text size command
  useEffect(() => {
    const unregister = editor.registerCommand(
      FORMAT_TEXT_SIZE_COMMAND,
      (size: TextSize | null) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          editor.update(() => {
            const styleValue = size && size !== 'medium' 
              ? TEXT_SIZE_OPTIONS.find(opt => opt.value === size)?.em 
              : '';
            
            // Get selected nodes
            const nodes = selection.getNodes();
            const anchor = selection.anchor;
            const focus = selection.focus;
            
            // Handle collapsed selection (cursor position)
            if (selection.isCollapsed()) {
              // For collapsed selection, apply to the word at cursor or create a new styled node
              const anchorNode = anchor.getNode();
              if (anchorNode instanceof TextNode) {
                // Apply style to entire text node at cursor
                let currentStyle = anchorNode.getStyle();
                currentStyle = currentStyle.replace(/font-size:\s*[^;]+;?/g, '').trim();
                
                if (styleValue) {
                  const newStyle = currentStyle 
                    ? `${currentStyle}; font-size: ${styleValue}` 
                    : `font-size: ${styleValue}`;
                  anchorNode.setStyle(newStyle);
                } else {
                  anchorNode.setStyle(currentStyle || '');
                }
              }
              return true;
            }
            
            // Handle range selection
            nodes.forEach((node) => {
              if (node instanceof TextNode) {
                const textContent = node.getTextContent();
                const nodeKey = node.getKey();
                
                // Determine selection boundaries for this node
                let startOffset = 0;
                let endOffset = textContent.length;
                
                if (anchor.getNode().getKey() === nodeKey) {
                  startOffset = anchor.offset;
                }
                if (focus.getNode().getKey() === nodeKey) {
                  endOffset = focus.offset;
                }
                
                // Ensure correct order
                if (startOffset > endOffset) {
                  [startOffset, endOffset] = [endOffset, startOffset];
                }
                
                // If partial selection within the node, split it
                if (startOffset > 0 || endOffset < textContent.length) {
                  const beforeText = textContent.slice(0, startOffset);
                  const selectedText = textContent.slice(startOffset, endOffset);
                  const afterText = textContent.slice(endOffset);
                  
                  // Preserve original formatting
                  const originalFormat = {
                    bold: node.hasFormat('bold'),
                    italic: node.hasFormat('italic'),
                    underline: node.hasFormat('underline'),
                    strikethrough: node.hasFormat('strikethrough'),
                    code: node.hasFormat('code'),
                    subscript: node.hasFormat('subscript'),
                    superscript: node.hasFormat('superscript')
                  };
                  
                  const originalStyle = node.getStyle();
                  const baseStyle = originalStyle.replace(/font-size:\s*[^;]+;?/g, '').trim();
                  
                  // Create replacement nodes
                  const newNodes = [];
                  
                  // Before text (unchanged)
                  if (beforeText) {
                    const beforeNode = $createTextNode(beforeText);
                    Object.entries(originalFormat).forEach(([format, hasFormat]) => {
                      if (hasFormat) beforeNode.toggleFormat(format as TextFormatType);
                    });
                    beforeNode.setStyle(baseStyle);
                    newNodes.push(beforeNode);
                  }
                  
                  // Selected text (with new font-size)
                  if (selectedText) {
                    const selectedNode = $createTextNode(selectedText);
                    Object.entries(originalFormat).forEach(([format, hasFormat]) => {
                      if (hasFormat) selectedNode.toggleFormat(format as TextFormatType);
                    });
                    
                    const newStyle = styleValue 
                      ? (baseStyle ? `${baseStyle}; font-size: ${styleValue}` : `font-size: ${styleValue}`)
                      : baseStyle;
                    selectedNode.setStyle(newStyle);
                    newNodes.push(selectedNode);
                  }
                  
                  // After text (unchanged)
                  if (afterText) {
                    const afterNode = $createTextNode(afterText);
                    Object.entries(originalFormat).forEach(([format, hasFormat]) => {
                      if (hasFormat) afterNode.toggleFormat(format as TextFormatType);
                    });
                    afterNode.setStyle(baseStyle);
                    newNodes.push(afterNode);
                  }
                  
                  // Replace the original node
                  newNodes.forEach(newNode => {
                    node.insertBefore(newNode);
                  });
                  node.remove();
                  
                } else {
                  // Entire node is selected
                  let currentStyle = node.getStyle();
                  currentStyle = currentStyle.replace(/font-size:\s*[^;]+;?/g, '').trim();
                  
                  if (styleValue) {
                    const newStyle = currentStyle 
                      ? `${currentStyle}; font-size: ${styleValue}` 
                      : `font-size: ${styleValue}`;
                    node.setStyle(newStyle);
                  } else {
                    node.setStyle(currentStyle || '');
                  }
                }
              }
            });
          });
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );

    return unregister;
  }, [editor]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const handleTextSizeChange = (size: TextSize) => {
    editor.dispatchCommand(FORMAT_TEXT_SIZE_COMMAND, size);
  };

  return (
    <div className="bg-base-200 border-b border-base-300 px-4 py-2 md:p-2 sticky top-0 z-50 shadow-md">
      <div className="flex items-left gap-1 justify-between">
        <div className="flex items-left gap-0">
          <button
            onClick={() => formatText('bold')}
            className={`btn btn-sm ${isBold ? 'btn-primary' : 'btn-ghost'}`}
            title={tChapterEditor('toolbar.bold')}
          >
            <FiBold className="w-4 h-4" />
          </button>
          <button
            onClick={() => formatText('italic')}
            className={`btn btn-sm ${isItalic ? 'btn-primary' : 'btn-ghost'}`}
            title={tChapterEditor('toolbar.italic')}
          >
            <FiItalic className="w-4 h-4" />
          </button>
          <button
            onClick={() => formatText('underline')}
            className={`btn btn-sm ${isUnderline ? 'btn-primary' : 'btn-ghost'}`}
            title={tChapterEditor('toolbar.underline')}
          >
            <FiUnderline className="w-4 h-4" />
          </button>
          
          {/* Text Size Dropdown */}
          <div className="dropdown">
            <div 
              tabIndex={0} 
              role="button" 
              className="btn btn-sm btn-ghost gap-1"
              title={tChapterEditor('toolbar.textSize')}
            >
              <FiType className="w-4 h-4" />
              {tChapterEditor(`textSizes.${currentTextSize}`)}
            </div>
            <ul 
              tabIndex={0} 
              className="dropdown-content menu bg-base-100 rounded-box z-[1] w-20 p-2 shadow"
            >
              {TEXT_SIZE_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    onClick={() => handleTextSizeChange(option.value)}
                    className={`text-center ${currentTextSize === option.value ? 'active' : ''}`}
                    style={{ fontSize: option.em }}
                  >
                    {tChapterEditor(`textSizes.${option.value}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {onAIEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAIEdit}
              className="btn btn-sm btn-primary"
              title={tChapterEditor('toolbar.aiEdit')}
            >
              <FiZap className="w-4 h-4" />
              {tChapterEditor('toolbar.edit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Content initialization plugin to handle HTML from database
function ContentInitializationPlugin({ 
  initialContent,
  chapterNumber 
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

          // Normalize HTML content to ensure proper structure while preserving styles
          const normalizedContent = normalizeHtmlContent(initialContent);
          
          console.log('🔄 Initializing content:', { 
            originalContent: initialContent,
            normalizedContent,
            chapterNumber 
          });

          if (normalizedContent && normalizedContent !== '<p><br></p>') {
            try {
              // Parse the normalized HTML with better DOM handling
              const parser = new DOMParser();
              const dom = parser.parseFromString(normalizedContent, 'text/html');
              
              // Log the parsed DOM to debug
              console.log('📄 Parsed DOM:', dom.body.innerHTML);
              
              // Use more robust HTML to Lexical conversion
              const nodes = $generateNodesFromDOM(editor, dom);
              
              console.log('🔧 Generated nodes:', nodes.map(node => ({
                type: node.getType(),
                textContent: node.getTextContent(),
                style: node instanceof TextNode ? node.getStyle() : 'N/A'
              })));
              
              if (nodes.length > 0) {
                root.append(...nodes);
              } else {
                // Fallback: create paragraph with text content (preserve inline elements)
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = normalizedContent;
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                
                if (textContent.trim()) {
                  // Try to parse as HTML one more time with a different approach
                  try {
                    const fallbackDom = parser.parseFromString(`<p>${normalizedContent}</p>`, 'text/html');
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
            } catch (parseError) {
              console.warn('HTML parsing failed, trying alternative approach:', parseError);
              // Alternative fallback: create paragraph with plain text
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
            // Empty content: create empty paragraph
            root.append($createParagraphNode());
          }
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize editor:', error);
        // Final fallback: create empty paragraph
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
        setIsInitialized(true);
      }
    };

    // Initialize immediately since each component instance handles one version
    if (!isInitialized) {
      const timer = setTimeout(initializeContent, 100);
      return () => clearTimeout(timer);
    }
  }, [editor, initialContent, chapterNumber, isInitialized]);

  return null;
}
function ContentChangePlugin({ 
  onContentChange, 
  onHasChanges, 
  initialContent, 
  currentTitle, 
  chapterTitle 
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
      console.log('💾 Generated HTML on change:', htmlString);
      onContentChange?.(htmlString);
      onHasChanges(currentTitle !== chapterTitle || htmlString !== initialContent);
    });
  };

  return <OnChangePlugin onChange={handleChange} />;
}

// Main editor component
interface ChapterEditorProps {
  initialContent?: string;
  chapterTitle?: string;
  chapterImageUri?: string | null;
  chapterNumber?: number;
  storyId?: string;
  locale?: string;
  onContentChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onSave?: (content: string, title: string) => void;
  onAIEdit?: () => void;
  onImageEdit?: (imageData: {
    imageUri: string;
    imageType: string;
    chapterNumber?: number;
  }) => void;
  isLoading?: boolean;
}

export default function ChapterEditor({
  initialContent = '',
  chapterTitle = '',
  chapterImageUri = null,
  chapterNumber = 1,
  storyId,
  locale = 'en',
  onContentChange,
  onTitleChange,
  onSave,
  onAIEdit,
  onImageEdit,
  isLoading = false,
}: ChapterEditorProps) {
  const router = useRouter();
  const [currentTitle, setCurrentTitle] = useState(chapterTitle);
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [hasChanges, setHasChanges] = useState(false);
  const tChapterEditor = useTranslations('ChapterEditor');

  // Debug logging for props
  useEffect(() => {
    console.log('🔧 ChapterEditor props:', {
      storyId,
      chapterNumber,
      chapterTitle,
      locale,
      hasInitialContent: !!initialContent
    });
  }, [storyId, chapterNumber, chapterTitle, locale, initialContent]);

  // Sync props changes
  useEffect(() => {
    setCurrentTitle(chapterTitle);
    setCurrentContent(initialContent);
    setHasChanges(false);
  }, [chapterTitle, chapterNumber, initialContent]);

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setCurrentTitle(newTitle);
    onTitleChange?.(newTitle);
    setHasChanges(newTitle !== chapterTitle || currentContent !== initialContent);
  };

  // Handle content changes
  const handleContentChange = (content: string) => {
    setCurrentContent(content);
    onContentChange?.(content);
  };

  // Handle save
  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(currentContent, currentTitle);
    }
  };

  // Handle cancel - navigate to reading page
  const handleCancel = () => {
    console.log('🔍 Cancel button clicked with:', { storyId, chapterNumber, locale });
    
    if (storyId && chapterNumber) {
      const readingUrl = `/${locale}/stories/read/${storyId}/chapter/${chapterNumber}`;
      console.log('📍 Navigating to:', readingUrl);
      router.push(readingUrl);
    } else {
      // Fallback: go back in browser history
      console.log('⚠️ Missing storyId or chapterNumber, using browser back');
      router.back();
    }
  };

  // Create initial editor state - let the plugin handle initialization
  const createInitialEditorState = () => {
    // Always return undefined to let the ContentInitializationPlugin handle content
    return undefined;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Chapter Title */}
      <div className="space-y-2 px-4 md:px-0">
        <input
          id="chapter-title"
          type="text"
          value={currentTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input input-bordered w-full text-lg font-semibold"
          placeholder={tChapterEditor('titlePlaceholder')}
        />
      </div>

      {/* Chapter Image */}
      {chapterImageUri && (
        <div className="space-y-2 px-4 md:px-0">
          <label className="block text-sm font-medium text-base-content">
            {tChapterEditor('imagePlaceholder', { number: chapterNumber })}
          </label>
          <div className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center w-full">
            <div className="space-y-4">
              <div className="relative mx-auto max-h-120 w-fit">
                <Image
                  src={toAbsoluteImageUrl(chapterImageUri) || ''}
                  alt={`Chapter ${chapterNumber}`}
                  width={600}
                  height={800}
                  className="max-h-120 rounded-lg object-contain"
                />
              </div>
              {onImageEdit && (
                <button
                  onClick={() => onImageEdit({
                    imageUri: chapterImageUri,
                    imageType: 'chapter',
                    chapterNumber: chapterNumber
                  })}
                  className="btn btn-sm btn-outline"
                >
                  <FiImage className="w-4 h-4" />
                  {tChapterEditor('editImageButton')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lexical Editor */}
      <div className="flex-1 flex flex-col">
        <LexicalComposer 
          initialConfig={{
            ...initialConfig,
            editorState: createInitialEditorState(),
          }}
        >
          <EditorToolbar onAIEdit={onAIEdit} />
          
          <div 
            className="flex-1 flex flex-col border-0 md:border border-base-300 md:rounded-lg overflow-hidden relative"
            data-lexical-editor
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable 
                  className="flex-1 p-4 md:p-4 prose prose-lg max-w-none focus:outline-none"
                  style={{ minHeight: '400px' }}
                />
              }
              placeholder={
                <div className="absolute top-4 left-4 md:left-4 text-base-content/50 pointer-events-none">
                  {tChapterEditor('contentPlaceholder')}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            
            <HistoryPlugin />
            <ContentInitializationPlugin 
              initialContent={initialContent}
              chapterNumber={chapterNumber}
            />
            <ContentChangePlugin 
              onContentChange={handleContentChange}
              onHasChanges={setHasChanges}
              initialContent={initialContent}
              currentTitle={currentTitle}
              chapterTitle={chapterTitle}
            />
          </div>

          {/* Save button */}
          <div className="px-4 py-4 md:p-4 border-t border-base-300 bg-base-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Back link - always show if we have a chapterNumber */}
                {chapterNumber && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-ghost btn-sm"
                    title={storyId ? `Go to reading page for Chapter ${chapterNumber}` : tChapterEditor('goBackButton')}
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    {tChapterEditor('backButton')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !hasChanges}
                  className="btn btn-primary"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  {isLoading ? tChapterEditor('saving') : tChapterEditor('saveButton')}
                </button>
              </div>
            </div>
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
}
