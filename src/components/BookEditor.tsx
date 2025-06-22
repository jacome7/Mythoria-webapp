'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiSave,
  FiSearch,
  FiRotateCcw,
  FiRotateCw,
  FiCode,
  FiEye,
  FiZap
} from 'react-icons/fi';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
import { useToast } from '@/hooks/useToast';
import { trackStoryManagement } from '@/lib/analytics';
import ToastContainer from './ToastContainer';
import { loadStoryCSS, removeStoryCSS } from '@/lib/story-css';
import AIEditModal from './AIEditModal';

// Custom TipTap extensions for preserving Mythoria structure

// Extension for Mythoria structural divs (page breaks, dedicatory, author name, etc.)
const MythoriaDiv = Node.create({
  name: 'mythoriaDiv',
  group: 'block',
  content: 'inline*',
  defining: true,
  draggable: false,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {}
          return { class: attributes.class }
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) return {}
          return { id: attributes.id }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="mythoria-page-break"]',
        priority: 100,
      },
      {
        tag: 'div[class*="mythoria-dedicatory"]',
        priority: 100,
      },
      {
        tag: 'div[class*="mythoria-author-name"]',
        priority: 100,
      },
      {
        tag: 'div[class*="mythoria-credits"]',
        priority: 100,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

// Extension for Mythoria message blocks (with nested content)
const MythoriaMessage = Node.create({
  name: 'mythoriaMessage',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: 'mythoria-message',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return { class: attributes.class || 'mythoria-message' }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="mythoria-message"]',
        priority: 100,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

// Extension for Mythoria chapters (with nested content)
const MythoriaChapter = Node.create({
  name: 'mythoriaChapter',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: 'mythoria-chapter',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return { class: attributes.class || 'mythoria-chapter' }
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) return {}
          return { id: attributes.id }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="mythoria-chapter"]',
        priority: 100,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

// Extension for Mythoria table of contents
const MythoriaTableOfContents = Node.create({
  name: 'mythoriaTableOfContents',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: 'mythoria-table-of-contents',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return { class: attributes.class || 'mythoria-table-of-contents' }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="mythoria-table-of-contents"]',
        priority: 100,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

// Extension for Mythoria covers (front/back)
const MythoriaCover = Node.create({
  name: 'mythoriaCover',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {}
          return { class: attributes.class }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[class*="mythoria-front-cover"]',
        priority: 100,
      },
      {
        tag: 'div[class*="mythoria-back-cover"]',
        priority: 100,
      },
      {
        tag: 'div[class*="mythoria-chapter-image"]',
        priority: 100,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

// Custom heading extension for proper Mythoria classes
const MythoriaHeading = Node.create({
  name: 'mythoriaHeading',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: element => {
          const match = element.tagName.match(/h([1-6])/i);
          return match ? parseInt(match[1], 10) : 1;
        },
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          const level = attributes.level || 1;
          const existingClass = attributes.class || '';

          // If already has a mythoria class, keep it
          if (existingClass.includes('mythoria-')) {
            return { class: existingClass };
          }

          // Otherwise assign based on level
          const mythoriaClass = level === 1 ? 'mythoria-story-title' : 'mythoria-chapter-title';
          return { class: existingClass ? `${existingClass} ${mythoriaClass}` : mythoriaClass };
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) return {}
          return { id: attributes.id }
        },
      },
    }
  },

  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map(level => ({
      tag: `h${level}`,
      attrs: { level },
      priority: 100,
    }))
  },

  renderHTML({ HTMLAttributes }) {
    const level = HTMLAttributes.level || 1;
    return [`h${level}`, mergeAttributes(HTMLAttributes), 0]
  },
})

interface BookEditorProps {
  initialContent: string;
  onSave: (html: string) => Promise<void>;
  onCancel: () => void;
  storyMetadata?: {
    targetAudience?: string;
    graphicalStyle?: string;
    title?: string;
  };
  storyId?: string;
  onAIEdit?: (updatedHtml: string) => void;
}

interface FindReplaceState {
  isOpen: boolean;
  findText: string;
  replaceText: string;
  currentMatch: number;
  totalMatches: number;
}

export default function BookEditor({ initialContent, onSave, onCancel, storyMetadata, storyId, onAIEdit }: BookEditorProps) {
  const t = useTranslations('common.bookEditor');
  const [isSaving, setIsSaving] = useState(false);  const [hasChanges, setHasChanges] = useState(false);  const [isHtmlView, setIsHtmlView] = useState(false);
  const [htmlContent, setHtmlContent] = useState(initialContent);
  const [showAIEditModal, setShowAIEditModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [contentHistory, setContentHistory] = useState<string[]>([initialContent]); // For optimistic updates
  const toast = useToast();
  const [findReplace, setFindReplace] = useState<FindReplaceState>({
    isOpen: false,
    findText: '',
    replaceText: '',
    currentMatch: 0,
    totalMatches: 0
  });

  // Load appropriate CSS theme based on story metadata
  useEffect(() => {
    if (storyMetadata?.targetAudience) {
      try {
        loadStoryCSS(storyMetadata.targetAudience);
      } catch (error) {
        console.warn('Failed to load story CSS, using default styles:', error);
        // Fall back to a default audience style
        loadStoryCSS('all_ages');
      }
    }

    return () => {
      // Clean up CSS when component unmounts
      removeStoryCSS();
    };
  }, [storyMetadata]);

  // Floating UI for Find & Replace
  const { refs, floatingStyles } = useFloating({
    open: findReplace.isOpen,
    placement: 'bottom-end',
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure to preserve HTML attributes including class names
        // Disable list functionality
        bulletList: false,
        orderedList: false,
        listItem: false, paragraph: {
          HTMLAttributes: {
            class: 'mythoria-chapter-paragraph',
          },
        },
        // Disable default heading to use our custom one
        heading: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline mythoria-toc-link',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md mythoria-chapter-img',
        },
      }),
      TextStyle,
      Color, TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // Custom Mythoria extensions for preserving structure
      MythoriaHeading,
      MythoriaDiv,
      MythoriaMessage,
      MythoriaChapter,
      MythoriaTableOfContents,
      MythoriaCover,
      MythoriaHeading,
    ],
    content: initialContent,
    onUpdate: () => {
      setHasChanges(true);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-screen p-6',
      },
      // Preserve class names during editing
      transformPastedHTML: (html) => html,
    },
  });
  // Handle save with class preservation
  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // Get content from the appropriate source
      let html = isHtmlView ? htmlContent : (editor?.getHTML() || '');

      // Preserve Mythoria class names before saving
      html = html;
      await onSave(html);
      setHasChanges(false);

      // Track story editing
      if (storyId) {
        trackStoryManagement.edited({
          story_id: storyId,
          story_title: storyMetadata?.title,
          target_audience: storyMetadata?.targetAudience,
          graphical_style: storyMetadata?.graphicalStyle,
          edit_mode: isHtmlView ? 'html' : 'wysiwyg'
        });
      }

      // Update both states to keep them in sync
      if (!isHtmlView && editor) {
        setHtmlContent(editor.getHTML());
      }

      toast.success('Story saved successfully! CSS styling preserved.');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save story. Please try again.');    } finally {
      setIsSaving(false);
    }
  }, [editor, hasChanges, onSave, isHtmlView, htmlContent, toast, storyId, storyMetadata?.graphicalStyle, storyMetadata?.targetAudience, storyMetadata?.title]);

  // Handle view toggle with class preservation
  const toggleView = useCallback(() => {
    if (isHtmlView) {
      // Switching from HTML to WYSIWYG - preserve classes and update editor content
      const preservedHtml = htmlContent;
      if (editor && preservedHtml !== editor.getHTML()) {
        editor.commands.setContent(preservedHtml);
        setHasChanges(true);
      }
    } else {
      // Switching from WYSIWYG to HTML - preserve classes and update HTML content
      if (editor) {
        const preservedHtml = editor.getHTML();
        setHtmlContent(preservedHtml);
      }
    }
    setIsHtmlView(!isHtmlView);
  }, [isHtmlView, editor, htmlContent]);

  // Handle HTML textarea changes with class preservation
  const handleHtmlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
    setHasChanges(true);
  }, []);
  // Find & Replace functionality
  const handleFind = useCallback(() => {
    if (!editor || !findReplace.findText) return;

    // This is a simplified find implementation
    // In a real app, you'd want more sophisticated search
    const content = editor.getText();
    const regex = new RegExp(findReplace.findText, 'gi');
    const matches = content.match(regex);

    setFindReplace(prev => ({
      ...prev,
      totalMatches: matches ? matches.length : 0,
      currentMatch: matches ? 1 : 0
    }));
  }, [editor, findReplace.findText]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !findReplace.findText) return;

    const content = editor.getHTML();
    const regex = new RegExp(findReplace.findText, 'gi');
    const newContent = content.replace(regex, findReplace.replaceText);

    // Preserve Mythoria classes after replacement
    const preservedContent = newContent;
    editor.commands.setContent(preservedContent);
    setHasChanges(true);

    setFindReplace(prev => ({
      ...prev,
      totalMatches: 0,
      currentMatch: 0
    }));
  }, [editor, findReplace.findText, findReplace.replaceText]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'f':
            e.preventDefault();
            setFindReplace(prev => ({ ...prev, isOpen: !prev.isOpen }));
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);
  // Handle AI edit success
  const handleAIEditSuccess = useCallback(async (updatedHtml: string, autoSave: boolean = false) => {
    // Update the editor content with the AI-edited HTML
    if (isHtmlView) {
      setHtmlContent(updatedHtml);
    } else if (editor) {
      editor.commands.setContent(updatedHtml);
    }

    setHasChanges(true);

    // Auto-save for image changes, manual save for text edits
    if (autoSave) {
      try {
        await onSave(updatedHtml);
        setHasChanges(false);
        toast.success('Image updated and saved successfully!');
        
        // Track story editing
        if (storyId) {
          trackStoryManagement.edited({
            story_id: storyId,
            story_title: storyMetadata?.title,
            target_audience: storyMetadata?.targetAudience,
            graphical_style: storyMetadata?.graphicalStyle,
            edit_mode: 'image_change'
          });
        }
      } catch (error) {
        console.error('Failed to auto-save after image change:', error);
        toast.error('Image updated but failed to save. Please save manually.');
      }
    } else {
      toast.success('Story updated with AI improvements! Review the changes and save when ready.');
    }    // Call the optional callback for parent component
    if (onAIEdit) {
      onAIEdit(updatedHtml);
    }
  }, [editor, isHtmlView, onAIEdit, onSave, toast, storyId, storyMetadata]);

  // Handle optimistic updates - immediately update UI without waiting for save
  const handleOptimisticUpdate = useCallback((updatedHtml: string) => {
    console.log('Applying optimistic update to editor');
    
    // Store current content for potential revert
    const currentContent = isHtmlView ? htmlContent : (editor?.getHTML() || '');
    setContentHistory(prev => [...prev, currentContent]);
    
    // Update the editor content immediately
    if (isHtmlView) {
      setHtmlContent(updatedHtml);
    } else if (editor) {
      editor.commands.setContent(updatedHtml);
    }    setHasChanges(true);
    toast.success('Image updated! Saving...');
  }, [editor, isHtmlView, htmlContent, toast]);

  // Handle reverting optimistic updates on save failure
  const handleRevertUpdate = useCallback((originalHtml: string) => {
    console.log('Reverting optimistic update');
    
    // Revert to the original content
    if (isHtmlView) {
      setHtmlContent(originalHtml);
    } else if (editor) {
      editor.commands.setContent(originalHtml);
    }

    // Remove the failed update from history
    setContentHistory(prev => prev.slice(0, -1));
    
    toast.error('Failed to save image change. Reverted to previous version.');
  }, [editor, isHtmlView, toast]);

  if (!editor) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300 p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Text Formatting */}
          <div className="flex items-center gap-1">            <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`btn btn-sm ${editor?.isActive('bold') ? 'btn-primary' : 'btn-ghost'}`}
            disabled={isHtmlView || !editor}
            title={t('toolbar.tooltips.bold')}
          >
            <FiBold />
          </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`btn btn-sm ${editor?.isActive('italic') ? 'btn-primary' : 'btn-ghost'}`}
              disabled={isHtmlView || !editor}
              title={t('toolbar.tooltips.italic')}
            >
              <FiItalic />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`btn btn-sm ${editor?.isActive('strike') ? 'btn-primary' : 'btn-ghost'}`}
              disabled={isHtmlView || !editor}
              title={t('toolbar.tooltips.strikethrough')}
            >
              <FiUnderline />            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="btn btn-sm btn-ghost"
              disabled={!editor.can().undo()}
              title={t('toolbar.tooltips.undo')}
            >
              <FiRotateCcw />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="btn btn-sm btn-ghost"
              disabled={!editor.can().redo()}
              title={t('toolbar.tooltips.redo')}
            >
              <FiRotateCw />
            </button></div>

          {/* View Toggle */}
          <div className="flex items-center gap-1">            <button
              onClick={toggleView}
              className={`btn btn-sm ${isHtmlView ? 'btn-primary' : 'btn-ghost'}`}
              title={isHtmlView ? t('toolbar.tooltips.switchToVisual') : t('toolbar.tooltips.switchToHtml')}
            >
              {isHtmlView ? <FiEye /> : <FiCode />}
              {isHtmlView ? t('toolbar.buttons.visual') : t('toolbar.buttons.html')}
            </button>
          </div>

          {/* Find & Replace */}
          <div className="flex items-center gap-2">            <button
            ref={refs.setReference}
            onClick={() => setFindReplace(prev => ({ ...prev, isOpen: !prev.isOpen }))}
            className={`btn btn-sm ${findReplace.isOpen ? 'btn-primary' : 'btn-ghost'}`}
            disabled={isHtmlView}
            title={t('toolbar.tooltips.findReplace')}
          >
            <FiSearch />
          </button>

            {/* AI Edit Button */}
            {storyId && (
              <button
                onClick={() => setShowAIEditModal(true)}
                className="btn btn-outline btn-primary btn-sm"
                disabled={isHtmlView}
                title={t('toolbar.tooltips.aiEdit')}
              >
                <FiZap className="w-4 h-4" />
                {t('toolbar.buttons.aiEdit')}
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              disabled={!hasChanges || isSaving}
              title={t('toolbar.tooltips.save')}
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <FiSave />
              )}
              {t('toolbar.buttons.save')}
            </button>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="btn btn-ghost btn-sm"
            >
              {t('toolbar.buttons.cancel')}
            </button>
          </div>
        </div>

        {/* Find & Replace Panel */}
        {findReplace.isOpen && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-4 min-w-80"
          >            <div className="space-y-3">
              <div>
                <label className="label label-text text-sm">{t('findReplace.findLabel')}</label>
                <input
                  type="text"
                  value={findReplace.findText}
                  onChange={(e) => setFindReplace(prev => ({ ...prev, findText: e.target.value }))}
                  className="input input-sm input-bordered w-full"
                  placeholder={t('findReplace.findPlaceholder')}
                />
              </div>
              <div>
                <label className="label label-text text-sm">{t('findReplace.replaceLabel')}</label>
                <input
                  type="text"
                  value={findReplace.replaceText}
                  onChange={(e) => setFindReplace(prev => ({ ...prev, replaceText: e.target.value }))}
                  className="input input-sm input-bordered w-full"
                  placeholder={t('findReplace.replacePlaceholder')}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFind}
                  className="btn btn-sm btn-primary"
                  disabled={!findReplace.findText}
                >
                  {t('findReplace.findButton')}
                </button>
                <button
                  onClick={handleReplaceAll}
                  className="btn btn-sm btn-secondary"
                  disabled={!findReplace.findText}
                >
                  {t('findReplace.replaceAllButton')}
                </button>
                {findReplace.totalMatches > 0 && (
                  <span className="text-sm text-base-content/70">
                    {t('findReplace.matchesFound', { count: findReplace.totalMatches })}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>      {/* Editor Content */}
      <div className="container mx-auto max-w-4xl">
        {isHtmlView ? (
          <div className="p-6">            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{t('htmlEditor.title')}</h3>
              <p className="text-sm text-base-content/70 mb-3">
                {t('htmlEditor.description')}
              </p>
            </div>
            <textarea
              value={htmlContent}
              onChange={handleHtmlChange}
              className="textarea textarea-bordered w-full min-h-screen font-mono text-sm"
              placeholder={t('htmlEditor.placeholder')}
              style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
            />
          </div>) : (
          <div>
            <div className="story-container">
              <EditorContent
                editor={editor}
                className="min-h-screen focus-within:outline-none story-content"
              />
            </div>
          </div>
        )}
      </div>{/* Changes indicator */}      {hasChanges && (
        <div className="fixed bottom-4 right-4">
          <div className="alert alert-info shadow-lg">
            <span>{t('unsavedChanges')}</span>
          </div>
        </div>
      )}

      {/* Toast Container */}      {/* AI Edit Modal */}      {storyId && (<AIEditModal
        isOpen={showAIEditModal}
        onClose={() => setShowAIEditModal(false)}
        storyId={storyId}
        storyContent={isHtmlView ? htmlContent : (editor?.getHTML() || '')}
        onEditSuccess={handleAIEditSuccess}
        onOptimisticUpdate={handleOptimisticUpdate}
        onRevertUpdate={handleRevertUpdate}
      />
      )}

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}
