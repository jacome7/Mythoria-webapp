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
    let chapterCounter = 0;
    processedContent = processedContent.replace(
      /<div([^>]*class="mythoria-chapter"[^>]*?)>/g,
      (match, attributes) => {
        // Check if this div already has an id attribute
        if (attributes.includes('id=')) {
          return match; // Already has an ID, don't modify
        }
        // Generate a new ID for chapters without one
        chapterCounter++;
        return `<div${attributes} id="chapter-${chapterCounter}">`;
      }
    );

    // Remove target="_blank" from table of contents links to enable smooth scrolling
    processedContent = processedContent.replace(
      /<a([^>]*class="[^"]*mythoria-toc-link[^"]*"[^>]*)\s+target="_blank"([^>]*)>/g,
      '<a$1$2>'
    );

    // Also remove rel attributes that are typically used with target="_blank"
    processedContent = processedContent.replace(
      /<a([^>]*class="[^"]*mythoria-toc-link[^"]*"[^>]*)\s+rel="[^"]*"([^>]*)>/g,
      '<a$1$2>'
    );

    return processedContent;
  };

  const processedContent = processStoryContent(storyContent);

  return (
    <div className="story-reader min-h-screen px-0 bg-base-100">
      {/* Reading Toolbar */}
      <ReadingToolbar onSettingsChange={handleReadingSettingsChange} />
      
      {/* Story Content - Wrap in a scoped container */}
      <div 
        className="story-content-wrapper mythoria-story-scope"
        style={{
          fontSize: readingSettings?.fontSize ? `${readingSettings.fontSize}%` : undefined,
          lineHeight: readingSettings?.lineHeight ? `${readingSettings.lineHeight}%` : undefined
        }}
      >
        <div className="w-full px-0 md:px-0 py-0">
            {!isContentLoaded ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-16">
                <div className="loading loading-spinner loading-lg mb-4"></div>
                <p className="text-lg text-base-content/70">{t('preparing')}</p>
              </div>
            ) : (
              // Story content
              <article 
                className="story-content prose prose-lg max-w-none p-1 md:p-0 m-0"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            )}
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
          margin-left: 5px !important;
          margin-right: 5px !important;
          margin-top: 10 !important;
          margin-bottom: 10 !important;
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
          margin: 0.25rem 0;
        }
        
        /* Reduce spacing for prose elements */
        :global(.story-content.prose > *:first-child) {
          margin-top: 0;
        }
        
        :global(.story-content.prose > *:last-child) {
          margin-bottom: 0;
        }
        
        /* Ensure smooth scrolling and proper spacing */
        :global(.story-content) {
          scroll-margin-top: 60px;
        }
        
        :global(.story-content *[id]) {
          scroll-margin-top: 60px;
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
          /* Responsive adjustments */
        @media (max-width: 768px) {
          .story-content-wrapper {
            padding: 0.1rem 0;
          }
          
          /* Override template container styles for mobile */
          :global(.mythoria-story-scope .story-container) {
            max-width: none !important;
            margin: 0 !important;
            padding: 0.1rem !important;
          }
          
          /* Reduce chapter padding on mobile */
          :global(.mythoria-story-scope .mythoria-chapter) {
            padding: 0.1rem !important;
            margin-bottom: 0.5rem !important;
          }
          
          /* Reduce table of contents padding on mobile */
          :global(.mythoria-story-scope .mythoria-table-of-contents) {
            padding: 0.1rem !important;
            margin: 0.5rem 0 !important;
          }
          
          /* Reduce story title margins */
          :global(.mythoria-story-scope .mythoria-story-title) {
            margin: 0.1rem 0 !important;
            padding-bottom: 0.125rem !important;
          }
          
          /* Reduce author name margins */
          :global(.mythoria-story-scope .mythoria-author-name) {
            margin: 0.1rem 0 0.5rem 0 !important;
          }
        }
        
        /* Desktop adjustments for narrower margins */
        @media (min-width: 769px) {
          /* Override template container styles for desktop */
          :global(.mythoria-story-scope .story-container) {
            max-width: none !important;
            margin: 0 !important;
            padding: 0.2rem !important;
          }
          
          /* Reduce chapter padding on desktop */
          :global(.mythoria-story-scope .mythoria-chapter) {
            padding: 0.2rem !important;
            margin-bottom: 1rem !important;
          }
          
          /* Reduce table of contents padding on desktop */
          :global(.mythoria-story-scope .mythoria-table-of-contents) {
            padding: 0.2rem !important;
            margin: 1rem 0 !important;
          }
          
          /* Center front cover images on desktop */
          :global(.mythoria-story-scope .mythoria-front-cover) {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            margin: 2rem auto !important;
            padding: 1rem !important;
          }
          
          :global(.mythoria-story-scope .mythoria-front-cover img) {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
          }
          
          /* Center back cover images on desktop */
          :global(.mythoria-story-scope .mythoria-back-cover) {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            margin: 2rem auto !important;
            padding: 1rem !important;
          }
          
          :global(.mythoria-story-scope .mythoria-back-cover img) {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
          }
          
          /* Center chapter images on desktop */
          :global(.mythoria-story-scope .mythoria-chapter-image) {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            margin: 1.5rem auto !important;
            padding: 0.5rem !important;
          }
          
          :global(.mythoria-story-scope .mythoria-chapter-image img) {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
}
