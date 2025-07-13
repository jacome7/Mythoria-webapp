'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  TextNode
} from 'lexical';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiSave,
  FiAlertCircle,
  FiZap,
  FiImage,
  FiType
} from 'react-icons/fi';
import { toAbsoluteImageUrl } from '../utils/image-url';

// Text size definitions
// Provides inline font-size styling using em units for relative sizing
type TextSize = 'small' | 'medium' | 'large' | 'xlarge';

const TEXT_SIZE_OPTIONS = [
  { value: 'small' as TextSize, label: 'S', em: '0.875em' },
  { value: 'medium' as TextSize, label: 'M', em: '1em' },
  { value: 'large' as TextSize, label: 'L', em: '1.25em' },
  { value: 'xlarge' as TextSize, label: 'XL', em: '1.5em' },
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

  // Update format state
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
          
          // For text size, we'll use style instead of classes for simplicity
          const nodes = selection.getNodes();
          let detectedSize: TextSize = 'medium';
          
          if (nodes.length > 0) {
            const firstNode = nodes[0];
            if (firstNode instanceof TextNode) {
              const style = firstNode.getStyle();
              if (style.includes('font-size: 0.875em')) detectedSize = 'small';
              else if (style.includes('font-size: 1.25em')) detectedSize = 'large';
              else if (style.includes('font-size: 1.5em')) detectedSize = 'xlarge';
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
            const nodes = selection.getNodes();
            
            nodes.forEach((node) => {
              if (node instanceof TextNode) {
                // Remove existing font-size from style
                let style = node.getStyle();
                style = style.replace(/font-size:\s*[^;]+;?/g, '').trim();
                
                // Add new font-size if not medium (default)
                if (size && size !== 'medium') {
                  const sizeOption = TEXT_SIZE_OPTIONS.find(opt => opt.value === size);
                  if (sizeOption) {
                    style = `${style}; font-size: ${sizeOption.em}`.replace(/^;\s*/, '');
                  }
                }
                
                node.setStyle(style || '');
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
    <div className="bg-base-200 border-b border-base-300 p-3">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => formatText('bold')}
            className={`btn btn-sm ${isBold ? 'btn-primary' : 'btn-ghost'}`}
            title="Bold"
          >
            <FiBold className="w-4 h-4" />
          </button>
          <button
            onClick={() => formatText('italic')}
            className={`btn btn-sm ${isItalic ? 'btn-primary' : 'btn-ghost'}`}
            title="Italic"
          >
            <FiItalic className="w-4 h-4" />
          </button>
          <button
            onClick={() => formatText('underline')}
            className={`btn btn-sm ${isUnderline ? 'btn-primary' : 'btn-ghost'}`}
            title="Underline"
          >
            <FiUnderline className="w-4 h-4" />
          </button>
          
          {/* Text Size Dropdown */}
          <div className="divider divider-horizontal"></div>
          <div className="dropdown">
            <div 
              tabIndex={0} 
              role="button" 
              className="btn btn-sm btn-ghost gap-1"
              title="Text Size"
            >
              <FiType className="w-4 h-4" />
              {TEXT_SIZE_OPTIONS.find(opt => opt.value === currentTextSize)?.label || 'M'}
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
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {onAIEdit && (
          <div className="flex items-center gap-2">
            <div className="divider divider-horizontal"></div>
            <button
              onClick={onAIEdit}
              className="btn btn-sm btn-primary"
              title="AI Edit"
            >
              <FiZap className="w-4 h-4" />
              Edit
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
  onContentChange,
  onTitleChange,
  onSave,
  onAIEdit,
  onImageEdit,
  isLoading = false,
}: ChapterEditorProps) {
  const [currentTitle, setCurrentTitle] = useState(chapterTitle);
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [hasChanges, setHasChanges] = useState(false);
  const t = useTranslations('common');

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

  // Create initial editor state - let the plugin handle initialization
  const createInitialEditorState = () => {
    // Always return undefined to let the ContentInitializationPlugin handle content
    return undefined;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Chapter Title */}
      <div className="space-y-2">
        <input
          id="chapter-title"
          type="text"
          value={currentTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input input-bordered w-full text-lg font-semibold"
          placeholder={`Chapter ${chapterNumber}`}
        />
      </div>

      {/* Chapter Image */}
      {chapterImageUri && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-base-content">
            Chapter {chapterNumber} Image
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
                  Edit Chapter Image
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
          
          <div className="flex-1 flex flex-col border border-base-300 rounded-lg overflow-hidden relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable 
                  className="flex-1 p-4 prose prose-lg max-w-none focus:outline-none"
                  style={{ minHeight: '400px' }}
                />
              }
              placeholder={
                <div className="absolute top-4 left-4 text-base-content/50 pointer-events-none">
                  {t('placeholder.chapterContent')}
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
          <div className="p-4 border-t border-base-300 bg-base-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <div className="flex items-center gap-1 text-warning">
                    <FiAlertCircle className="w-4 h-4" />
                    <span className="text-sm">Unsaved changes</span>
                  </div>
                )}
              </div>
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
                {isLoading ? 'Saving...' : 'Save Chapter'}
              </button>
            </div>
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
}
