'use client';

import { useState, useEffect } from 'react';
import { 
  FiMinus, 
  FiPlus, 
  FiSun, 
  FiMoon,
  FiType,
  FiAlignJustify,
  FiMaximize2
} from 'react-icons/fi';

interface ReadingToolbarProps {
  onSettingsChange?: (settings: ReadingSettings) => void;
}

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  margins: number;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 100, // percentage
  lineHeight: 100, // percentage  
  margins: 100, // percentage
  theme: 'light'
};

export default function ReadingToolbar({ onSettingsChange }: ReadingToolbarProps) {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('mythoria-reading-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.warn('Failed to parse saved reading settings:', error);
      }
    }
  }, []);

  // Apply settings to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--reading-font-scale', `${settings.fontSize / 100}`);
    root.style.setProperty('--reading-line-height-scale', `${settings.lineHeight / 100}`);
    root.style.setProperty('--reading-margin-scale', `${settings.margins / 100}`);
    
    // Apply theme
    if (settings.theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    // Save to localStorage
    localStorage.setItem('mythoria-reading-settings', JSON.stringify(settings));
    
    // Notify parent component
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const updateSetting = (key: keyof ReadingSettings, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const adjustValue = (key: 'fontSize' | 'lineHeight' | 'margins', delta: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: Math.max(50, Math.min(200, prev[key] + delta))
    }));
  };

  return (
    <div className="reading-toolbar bg-base-200 border-b border-base-300 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost btn-sm"
            aria-label="Toggle reading settings"
          >
            <FiType className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Reading Settings</span>
          </button>

          {/* Quick Actions - Always Visible */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSetting('theme', settings.theme === 'light' ? 'dark' : 'light')}
              className="btn btn-ghost btn-sm"
              aria-label={`Switch to ${settings.theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {settings.theme === 'light' ? (
                <FiMoon className="w-4 h-4" />
              ) : (
                <FiSun className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Controls */}
        {isExpanded && (
          <div className="border-t border-base-300 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Font Size Control */}
              <div className="flex items-center gap-3">
                <FiType className="w-4 h-4 text-base-content/70" />
                <span className="text-sm font-medium min-w-fit">Font Size</span>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => adjustValue('fontSize', -10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.fontSize <= 50}
                    aria-label="Decrease font size"
                  >
                    <FiMinus className="w-3 h-3" />
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
                      aria-label="Font size percentage"
                    />
                  </div>
                  <button
                    onClick={() => adjustValue('fontSize', 10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.fontSize >= 200}
                    aria-label="Increase font size"
                  >
                    <FiPlus className="w-3 h-3" />
                  </button>
                  <span className="text-xs min-w-fit">{settings.fontSize}%</span>
                </div>
              </div>

              {/* Line Height Control */}
              <div className="flex items-center gap-3">
                <FiAlignJustify className="w-4 h-4 text-base-content/70" />
                <span className="text-sm font-medium min-w-fit">Line Height</span>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => adjustValue('lineHeight', -10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.lineHeight <= 50}
                    aria-label="Decrease line height"
                  >
                    <FiMinus className="w-3 h-3" />
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
                      aria-label="Line height percentage"
                    />
                  </div>
                  <button
                    onClick={() => adjustValue('lineHeight', 10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.lineHeight >= 200}
                    aria-label="Increase line height"
                  >
                    <FiPlus className="w-3 h-3" />
                  </button>
                  <span className="text-xs min-w-fit">{settings.lineHeight}%</span>
                </div>
              </div>

              {/* Margins Control */}
              <div className="flex items-center gap-3">
                <FiMaximize2 className="w-4 h-4 text-base-content/70" />
                <span className="text-sm font-medium min-w-fit">Margins</span>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => adjustValue('margins', -10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.margins <= 50}
                    aria-label="Decrease margins"
                  >
                    <FiMinus className="w-3 h-3" />
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
                      aria-label="Margins percentage"
                    />
                  </div>
                  <button
                    onClick={() => adjustValue('margins', 10)}
                    className="btn btn-ghost btn-xs"
                    disabled={settings.margins >= 200}
                    aria-label="Increase margins"
                  >
                    <FiPlus className="w-3 h-3" />
                  </button>
                  <span className="text-xs min-w-fit">{settings.margins}%</span>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end mt-3 pt-3 border-t border-base-300">
              <button
                onClick={resetSettings}
                className="btn btn-outline btn-sm"
              >
                Reset to Default
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
        :global(.story-content) {
          font-size: calc(var(--story-font-size, 1.1rem) * var(--reading-font-scale, 1));
          line-height: calc(var(--story-line-height, 1.6) * var(--reading-line-height-scale, 1));
          margin: calc(var(--story-margins, 1.5rem) * var(--reading-margin-scale, 1));
        }
        
        :global(.mythoria-chapter-paragraph) {
          font-size: calc(var(--story-font-size, 1.1rem) * var(--reading-font-scale, 1)) !important;
          line-height: calc(var(--story-line-height, 1.6) * var(--reading-line-height-scale, 1)) !important;
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
