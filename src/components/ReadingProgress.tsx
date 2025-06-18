'use client';

import { useState, useEffect } from 'react';
import { FiList, FiX } from 'react-icons/fi';

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

interface ReadingProgressProps {
  storyContent: string;
}

export default function ReadingProgress({ storyContent }: ReadingProgressProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  // const progressRef = useRef<HTMLDivElement>(null);

  // Extract table of contents from story content
  useEffect(() => {
    if (!storyContent) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(storyContent, 'text/html');
    
    // Extract headings and chapters
    const headings: TableOfContentsItem[] = [];
    
    // Look for story title
    const storyTitle = doc.querySelector('.mythoria-story-title');
    if (storyTitle) {
      headings.push({
        id: 'story-title',
        title: storyTitle.textContent?.trim() || 'Story Title',
        level: 1
      });
    }

    // Look for table of contents
    const tocSection = doc.querySelector('.mythoria-table-of-contents');
    if (tocSection) {
      headings.push({
        id: 'table-of-contents',
        title: 'Table of Contents',
        level: 1
      });
    }

    // Look for chapters
    const chapters = doc.querySelectorAll('.mythoria-chapter');
    chapters.forEach((chapter, index) => {
      const chapterTitle = chapter.querySelector('.mythoria-chapter-title');
      const chapterId = chapter.id || `chapter-${index + 1}`;
      
      if (chapterTitle) {
        headings.push({
          id: chapterId,
          title: chapterTitle.textContent?.trim() || `Chapter ${index + 1}`,
          level: 2
        });
      }
    });

    setTableOfContents(headings);
  }, [storyContent]);

  // Handle scroll progress
  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.pageYOffset;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Update active section based on scroll position
      const sections = tableOfContents.map(item => ({
        id: item.id,
        element: document.getElementById(item.id)
      })).filter(section => section.element);

      let currentActiveSection = '';
      
      for (const section of sections) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 100) { // Consider section active when it's near the top
            currentActiveSection = section.id;
          }
        }
      }
      
      setActiveSection(currentActiveSection);
    };

    window.addEventListener('scroll', updateScrollProgress);
    updateScrollProgress(); // Initial calculation

    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, [tableOfContents]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for sticky toolbar
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
      
      setIsTableOfContentsOpen(false);
    }
  };

  const formatProgress = (progress: number): string => {
    return `${Math.round(progress)}%`;
  };

  return (
    <>
      {/* Reading Progress Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t border-base-300 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Progress Information */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-base-content">
                Reading Progress: {formatProgress(scrollProgress)}
              </div>
              
              {/* Progress Bar */}
              <div className="flex-1 max-w-md">
                <div className="w-full bg-base-300 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Table of Contents Button */}
            <button
              onClick={() => setIsTableOfContentsOpen(true)}
              className="btn btn-primary btn-sm"
              disabled={tableOfContents.length === 0}
            >
              <FiList className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Contents</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table of Contents Modal */}
      {isTableOfContentsOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Table of Contents</h2>
              <button
                onClick={() => setIsTableOfContentsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close table of contents"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {tableOfContents.length === 0 ? (
                <div className="text-center py-8 text-base-content/70">
                  <FiList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No table of contents available for this story.</p>
                </div>
              ) : (
                tableOfContents.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-base-200 ${
                      activeSection === item.id 
                        ? 'bg-primary text-primary-content' 
                        : 'hover:bg-base-200'
                    } ${
                      item.level === 1 
                        ? 'font-bold text-lg' 
                        : 'font-medium text-base ml-4'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.level === 2 && (
                        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                      )}
                      <span className="flex-1">{item.title}</span>
                      {activeSection === item.id && (
                        <span className="text-xs opacity-75">Currently Reading</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setIsTableOfContentsOpen(false)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
          
          {/* Modal backdrop */}
          <div 
            className="modal-backdrop"
            onClick={() => setIsTableOfContentsOpen(false)}
          />
        </div>
      )}

      <style jsx>{`
        /* Add bottom padding to account for the progress bar */
        :global(body) {
          padding-bottom: 70px;
        }
        
        /* Smooth scrolling for the entire page */
        :global(html) {
          scroll-behavior: smooth;
        }
        
        /* Ensure modal appears above everything */
        .modal {
          z-index: 999;
        }
      `}</style>
    </>
  );
}
