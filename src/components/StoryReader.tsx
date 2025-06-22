'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import ReadingToolbar, { ReadingSettings } from './ReadingToolbar';
import ReadingProgress from './ReadingProgress';
import { loadStoryCSS, removeStoryCSS } from '../lib/story-css';

interface StoryReaderProps {
  storyContent: string;
  storyMetadata?: {
    targetAudience?: string;
    graphicalStyle?: string;
    title?: string;
  };
}

export default function StoryReader({ storyContent, storyMetadata }: StoryReaderProps) {
  const t = useTranslations('common.Components.StoryReader');
  const [readingSettings, setReadingSettings] = useState<ReadingSettings | null>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
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

  // Mark content as loaded after a short delay to ensure CSS is applied
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [storyContent]);
  // Handle reading settings changes
  const handleReadingSettingsChange = (settings: ReadingSettings) => {
    setReadingSettings(settings);
    // TODO: Apply reading settings to the story content display
    console.log('Reading settings updated:', settings);
  };

  // Process story content to ensure proper IDs for navigation
  const processStoryContent = (content: string): string => {
    if (!content) return '';

    // Add IDs to elements that might not have them for navigation
    let processedContent = content;

    // Ensure story title has an ID
    processedContent = processedContent.replace(
      /<h1([^>]*class="mythoria-story-title"[^>]*)>/,
      '<h1$1 id="story-title">'
    );

    // Ensure table of contents has an ID
    processedContent = processedContent.replace(
      /<div([^>]*class="mythoria-table-of-contents"[^>]*)>/,
      '<div$1 id="table-of-contents">'
    );

    // Ensure chapters have IDs if they don't already
    processedContent = processedContent.replace(
      /<div([^>]*class="mythoria-chapter"[^>]*?)(?:id="([^"]*)")?([^>]*)>/g,
      (match, beforeId, existingId, afterId) => {
        if (existingId) {
          return match; // Already has an ID
        }
        // Generate an ID based on content or position
        const chapterNumber = (processedContent.match(/<div[^>]*class="mythoria-chapter"/g) || []).length;
        return `<div${beforeId} id="chapter-${chapterNumber}"${afterId}>`;
      }
    );

    return processedContent;
  };

  const processedContent = processStoryContent(storyContent);

  return (
    <div className="story-reader min-h-screen bg-base-100">
      {/* Reading Toolbar */}
      <ReadingToolbar onSettingsChange={handleReadingSettingsChange} />      {/* Story Content */}
      <div 
        className="story-content-wrapper"
        style={{
          fontSize: readingSettings?.fontSize ? `${readingSettings.fontSize}%` : undefined,
          lineHeight: readingSettings?.lineHeight ? `${readingSettings.lineHeight}%` : undefined
        }}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">            {!isContentLoaded ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-16">
                <div className="loading loading-spinner loading-lg mb-4"></div>
                <p className="text-lg text-base-content/70">{t('preparing')}</p>
              </div>
            ) : (
              // Story content
              <article 
                className="story-content prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Reading Progress & Table of Contents */}
      {isContentLoaded && processedContent && (
        <ReadingProgress storyContent={processedContent} />
      )}

      <style jsx>{`
        /* Base story reader styles */
        .story-reader {
          transition: all 0.3s ease;
        }
        
        /* Remove default prose styles that might conflict with our custom CSS */
        :global(.story-content.prose) {
          max-width: none;
          color: inherit;
          font-size: inherit;
          line-height: inherit;
        }
        
        :global(.story-content.prose h1),
        :global(.story-content.prose h2),
        :global(.story-content.prose h3),
        :global(.story-content.prose p),
        :global(.story-content.prose div) {
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          margin: inherit;
        }
        
        /* Ensure smooth scrolling and proper spacing */
        :global(.story-content) {
          scroll-margin-top: 80px;
        }
        
        :global(.story-content *[id]) {
          scroll-margin-top: 80px;
        }
        
        /* Loading animation */
        .loading-content {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Content fade-in when loaded */
        :global(.story-content) {
          animation: fadeIn 0.6s ease-in-out;
        }
        
        /* Dark theme adjustments */
        :global([data-theme="dark"]) .story-reader {
          background-color: var(--story-bg-color, #1a1a1a);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .story-content-wrapper {
            padding: 1rem 0;
          }
          
          .container {
            padding: 0 1rem;
          }
        }
        
        /* Print styles */
        @media print {
          :global(.reading-toolbar),
          :global(.fixed.bottom-0) {
            display: none !important;
          }
          
          .story-content-wrapper {
            padding: 0;
          }
          
          :global(.story-content) {
            animation: none;
          }
          
          :global(body) {
            padding-bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
