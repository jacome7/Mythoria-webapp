'use client';

import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  TextFormatType,
  $getSelection,
  $isRangeSelection,
  TextNode,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { useTranslations } from 'next-intl';
import { FiBold, FiItalic, FiType, FiImage, FiZap } from 'react-icons/fi';
import { TEXT_SIZE_OPTIONS, TextSize, FORMAT_TEXT_SIZE_COMMAND } from './lexical';

interface ToolbarProps {
  onImageInsert?: () => void;
  onAIEdit?: () => void;
}

export default function Toolbar({ onImageInsert, onAIEdit }: ToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [currentTextSize, setCurrentTextSize] = useState<TextSize>('medium');
  const t = useTranslations('ChapterEditor');

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));

          let detectedSize: TextSize = 'medium';
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            const firstTextNode = nodes.find((node) => node instanceof TextNode) as
              | TextNode
              | undefined;
            if (firstTextNode) {
              const style = firstTextNode.getStyle();
              const match = style.match(/font-size:\s*([^;]+)/);
              if (match) {
                const sizeOption = TEXT_SIZE_OPTIONS.find((opt) => opt.em === match[1].trim());
                if (sizeOption) detectedSize = sizeOption.value;
              }
            }
          } else {
            const anchorNode = selection.anchor.getNode();
            if (anchorNode instanceof TextNode) {
              const style = anchorNode.getStyle();
              const match = style.match(/font-size:\s*([^;]+)/);
              if (match) {
                const sizeOption = TEXT_SIZE_OPTIONS.find((opt) => opt.em === match[1].trim());
                if (sizeOption) detectedSize = sizeOption.value;
              }
            }
          }
          setCurrentTextSize(detectedSize);
        }
      });
    });
    return unregister;
  }, [editor]);

  useEffect(() => {
    const unregister = editor.registerCommand(
      FORMAT_TEXT_SIZE_COMMAND,
      (size: TextSize | null) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          editor.update(() => {
            const styleValue =
              size && size !== 'medium'
                ? TEXT_SIZE_OPTIONS.find((opt) => opt.value === size)?.em
                : '';
            selection.getNodes().forEach((node) => {
              if (node instanceof TextNode) {
                let currentStyle = node.getStyle();
                currentStyle = currentStyle.replace(/font-size:\s*[^;]+;?/g, '').trim();
                if (styleValue) {
                  node.setStyle(
                    currentStyle
                      ? `${currentStyle}; font-size: ${styleValue}`
                      : `font-size: ${styleValue}`,
                  );
                } else {
                  node.setStyle(currentStyle || '');
                }
              }
            });
          });
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
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
            title={t('toolbar.bold')}
          >
            <FiBold className="w-4 h-4" />
          </button>
          <button
            onClick={() => formatText('italic')}
            className={`btn btn-sm ${isItalic ? 'btn-primary' : 'btn-ghost'}`}
            title={t('toolbar.italic')}
          >
            <FiItalic className="w-4 h-4" />
          </button>
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-sm btn-ghost gap-1"
              title={t('toolbar.textSize')}
            >
              <FiType className="w-4 h-4" />
              {t(`textSizes.${currentTextSize}`)}
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
                    {t(`textSizes.${option.value}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onAIEdit && (
            <button
              onClick={onAIEdit}
              className="btn btn-sm btn-primary"
              title={t('toolbar.aiEdit')}
            >
              <FiZap className="w-4 h-4" />
              {t('toolbar.edit')}
            </button>
          )}
          {onImageInsert && (
            <button
              onClick={onImageInsert}
              className="btn btn-sm btn-primary"
              title={t('toolbar.image')}
            >
              <FiImage className="w-4 h-4" />
              {t('toolbar.image')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
