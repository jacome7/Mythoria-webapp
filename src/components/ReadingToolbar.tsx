'use client';

import { useEffect, useState } from 'react';
import { AlignJustify, BookOpen, ChevronDown, Maximize2, Minus, Plus, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ReadingToolbarProps {
  onSettingsChange?: (settings: ReadingSettings) => void;
  chapters?: Chapter[];
  currentChapter?: number;
  onChapterChange?: (chapterNumber: number) => void;
}

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  margins: number;
}

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 100, // percentage
  lineHeight: 100, // percentage
  margins: 100, // percentage
};

export default function ReadingToolbar({
  onSettingsChange,
  chapters = [],
  currentChapter = 0,
  onChapterChange,
}: ReadingToolbarProps) {
  const tReadingToolbar = useTranslations('ReadingToolbar');

  // Load settings from localStorage during initialization
  const getInitialSettings = (): ReadingSettings => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    const savedSettings = localStorage.getItem('mythoria-reading-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (error) {
        console.warn('Failed to parse saved reading settings:', error);
      }
    }
    return DEFAULT_SETTINGS;
  };

  const [settings, setSettings] = useState<ReadingSettings>(getInitialSettings);
  const [isExpanded, setIsExpanded] = useState(false);

  // Apply settings to document root
  useEffect(() => {
    const root = document.documentElement;

    // Apply CSS custom properties
    root.style.setProperty('--reading-font-scale', `${settings.fontSize / 100}`);
    root.style.setProperty('--reading-line-height-scale', `${settings.lineHeight / 100}`);
    root.style.setProperty('--reading-margin-scale', `${settings.margins / 100}`);

    // Save to localStorage
    localStorage.setItem('mythoria-reading-settings', JSON.stringify(settings));

    // Notify parent component
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const updateSetting = (key: keyof ReadingSettings, value: number | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const adjustValue = (key: 'fontSize' | 'lineHeight' | 'margins', delta: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: Math.max(50, Math.min(200, prev[key] + delta)),
    }));
  };

  return (
    <div className="reading-toolbar bg-base-200 border-b border-base-300 sticky top-0 z-50 overflow-visible">
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 py-2">
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost btn-sm"
            aria-label={tReadingToolbar('toggleLabel')}
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">{tReadingToolbar('title')}</span>
          </button>

          {/* Quick Actions - Always Visible */}
          <div className="flex items-center gap-2">
            {/* Chapters Dropdown */}
            {chapters.length > 0 && (
              <div className="dropdown dropdown-end relative">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">
                    {currentChapter === 0
                      ? tReadingToolbar('cover')
                      : tReadingToolbar('chapterLabel', { number: currentChapter })}
                  </span>
                  <span className="sm:hidden ml-1">
                    {currentChapter === 0
                      ? tReadingToolbar('cover')
                      : tReadingToolbar('chapterLabel', { number: currentChapter })}
                  </span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu !absolute !right-0 !top-full z-[80] mt-2 w-60 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-9rem)] overflow-y-auto rounded-box border border-base-300 !bg-base-100 p-2 text-base-content opacity-100 shadow-xl"
                >
                  <li>
                    <button
                      onClick={() => onChapterChange?.(0)}
                      className={`w-full text-left ${currentChapter === 0 ? 'bg-primary/20' : ''}`}
                    >
                      {tReadingToolbar('coverAndToc')}
                    </button>
                  </li>
                  {chapters.map((chapter) => (
                    <li key={chapter.id}>
                      <button
                        onClick={() => onChapterChange?.(chapter.chapterNumber)}
                        className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-left ${
                          currentChapter === chapter.chapterNumber ? 'bg-primary/20' : ''
                        }`}
                      >
                        <span className="font-medium">Ch. {chapter.chapterNumber}</span>
                        <span className="min-w-0 truncate text-sm opacity-70">{chapter.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>{' '}
        {/* Expanded Controls */}
        {isExpanded && (
          <div className="border-t border-base-300 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Font Size Control */}
              <div className="flex items-center gap-3">
                <Type className="w-4 h-4 text-base-content/70" />
                <span className="text-sm font-medium min-w-fit">
                  {tReadingToolbar('controls.fontSize')}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => adjustValue('fontSize', -10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.fontSize <= 50}
                    aria-label={tReadingToolbar('controls.decreaseFontSize')}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="flex-1 mx-2">
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                      className="range range-primary range-xs"
                      aria-label={tReadingToolbar('controls.fontSizeLabel')}
                    />
                  </div>
                  <button
                    onClick={() => adjustValue('fontSize', 10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.fontSize >= 200}
                    aria-label={tReadingToolbar('controls.increaseFontSize')}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs min-w-fit">{settings.fontSize}%</span>
                </div>
              </div>
              {/* Line Height Control */}{' '}
              <div className="flex items-center gap-3">
                <AlignJustify className="w-4 h-4 text-base-content/70" />
                <span className="text-sm font-medium min-w-fit">
                  {tReadingToolbar('controls.lineHeight')}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => adjustValue('lineHeight', -10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.lineHeight <= 50}
                    aria-label={tReadingToolbar('controls.decreaseLineHeight')}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="flex-1 mx-2">
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={settings.lineHeight}
                      onChange={(e) => updateSetting('lineHeight', parseInt(e.target.value))}
                      className="range range-secondary range-xs"
                      aria-label={tReadingToolbar('controls.lineHeightLabel')}
                    />
                  </div>
                  <button
                    onClick={() => adjustValue('lineHeight', 10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.lineHeight >= 200}
                    aria-label={tReadingToolbar('controls.increaseLineHeight')}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs min-w-fit">{settings.lineHeight}%</span>
                </div>
              </div>
              {/* Margins Control */}{' '}
              <div className="flex items-center gap-3">
                <Maximize2 className="w-4 h-4 text-base-content/70" />
                <span className="text-sm font-medium min-w-fit">
                  {tReadingToolbar('controls.margins')}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => adjustValue('margins', -10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.margins <= 50}
                    aria-label={tReadingToolbar('controls.decreaseMargins')}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="flex-1 mx-2">
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={settings.margins}
                      onChange={(e) => updateSetting('margins', parseInt(e.target.value))}
                      className="range range-accent range-xs"
                      aria-label={tReadingToolbar('controls.marginsLabel')}
                    />
                  </div>
                  <button
                    onClick={() => adjustValue('margins', 10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.margins >= 200}
                    aria-label={tReadingToolbar('controls.increaseMargins')}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs min-w-fit">{settings.margins}%</span>
                </div>
              </div>
            </div>
            {/* Reset Button */}{' '}
            <div className="flex justify-end mt-3 pt-3 border-t border-base-300">
              <button onClick={resetSettings} className="btn btn-outline btn-sm">
                {tReadingToolbar('resetButton')}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .reading-toolbar {
          transition: all 0.3s ease;
        }

        /* Apply reading settings to story content */
        :global(.mythoria-story-content) {
          font-size: calc(var(--story-font-size, 1rem) * var(--reading-font-scale, 1)) !important;
          line-height: calc(
            var(--story-line-height, 1.5) * var(--reading-line-height-scale, 1)
          ) !important;
          margin: calc(var(--story-margins, 1.5rem) * var(--reading-margin-scale, 1));
        }

        :global(.mythoria-chapter-paragraph) {
          font-size: calc(var(--story-font-size, 1rem) * var(--reading-font-scale, 1)) !important;
          line-height: calc(
            var(--story-line-height, 1.6) * var(--reading-line-height-scale, 1)
          ) !important;
        }

        :global(.mythoria-chapter) {
          margin: calc(var(--story-spacing, 1.5rem) * var(--reading-margin-scale, 1)) 0 !important;
          padding: calc(var(--story-margins, 1.5rem) * var(--reading-margin-scale, 1)) !important;
        }

        :global(.mythoria-story-title),
        :global(.mythoria-chapter-title),
        :global(.mythoria-toc-title) {
          margin: calc(var(--story-spacing, 1.5rem) * var(--reading-margin-scale, 1)) 0 !important;
        }
      `}</style>
    </div>
  );
}
