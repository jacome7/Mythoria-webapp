'use client';

import { useState, useEffect } from 'react';
import { FiX, FiZap, FiEdit3 } from 'react-icons/fi';

interface AIEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyContent: string;
  onEditSuccess: (updatedHtml: string) => void;
}

interface Chapter {
  number: number;
  title: string;
}

export default function AIEditModal({ 
  isOpen, 
  onClose, 
  storyId, 
  storyContent, 
  onEditSuccess 
}: AIEditModalProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);  // Extract chapters from story content
  useEffect(() => {
    if (!storyContent) return;

    console.log('Extracting chapters from story content length:', storyContent.length);
    console.log('Story content preview:', storyContent.substring(0, 1000));
    
    const foundChapters: Chapter[] = [];
    
    // Look for mythoria-chapter divs with id="chapter-X"
    const chapterDivRegex = /<div[^>]*class="[^"]*mythoria-chapter[^"]*"[^>]*id="chapter-(\d+)"[^>]*>/gi;
    
    let match;
    while ((match = chapterDivRegex.exec(storyContent)) !== null) {
      const chapterNumber = parseInt(match[1]);
      
      // Validate chapter number
      if (isNaN(chapterNumber) || chapterNumber < 1 || chapterNumber > 100) {
        continue;
      }
      
      // Try to extract chapter title from the content inside the div
      const chapterStartIndex = match.index + match[0].length;
      const nextChapterMatch = storyContent.indexOf('<div class="mythoria-chapter"', chapterStartIndex);
      const chapterEndIndex = nextChapterMatch > -1 ? nextChapterMatch : storyContent.length;
      const chapterContent = storyContent.substring(chapterStartIndex, chapterEndIndex);
      
      // Look for chapter title in various formats within the chapter content
      let chapterTitle = `Chapter ${chapterNumber}`;
      const titlePatterns = [
        /<h[1-6][^>]*>([^<]*(?:chapter|capítulo)\s*\d+[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>\s*(\d+)\.\s*([^<]+)\s*<\/h[1-6]>/gi,
        /<h[1-6][^>]*>\s*([^<]+)\s*<\/h[1-6]>/gi
      ];
      
      for (const titlePattern of titlePatterns) {
        titlePattern.lastIndex = 0;
        const titleMatch = titlePattern.exec(chapterContent);
        if (titleMatch) {
          if (titlePattern === titlePatterns[0]) {
            chapterTitle = titleMatch[1].trim();
          } else if (titlePattern === titlePatterns[1]) {
            chapterTitle = titleMatch[2].trim();
          } else {
            const title = titleMatch[1].trim();
            // Only use generic headings if they're reasonably short and look like chapter titles
            if (title.length <= 50 && !title.toLowerCase().includes('img') && !title.toLowerCase().includes('div')) {
              chapterTitle = title;
            }
          }
          break;
        }
      }
      
      // Truncate long titles
      if (chapterTitle.length > 50) {
        chapterTitle = chapterTitle.substring(0, 47) + '...';
      }
      
      foundChapters.push({
        number: chapterNumber,
        title: chapterTitle
      });
      
      console.log(`Found chapter ${chapterNumber}: "${chapterTitle}"`);
    }

    // Sort chapters by number
    foundChapters.sort((a, b) => a.number - b.number);
    
    console.log('Final extracted chapters:', foundChapters);
    setChapters(foundChapters);
  }, [storyContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userRequest.trim()) {
      setError('Please enter your editing request');
      return;
    }

    if (userRequest.length > 2000) {
      setError('Request must be 2000 characters or less');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {      const requestBody: {
        storyId: string;
        userRequest: string;
        chapterNumber?: number;
      } = {
        storyId,
        userRequest: userRequest.trim()
      };

      if (selectedChapter !== null) {
        requestBody.chapterNumber = selectedChapter;
      }

      const response = await fetch('/api/story-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onEditSuccess(data.updatedHtml);
        onClose();
        setUserRequest('');
        setSelectedChapter(null);
      } else {
        setError(data.error || 'Failed to edit story');
      }
    } catch (error) {
      console.error('Error editing story:', error);
      setError('Failed to edit story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setUserRequest('');
      setSelectedChapter(null);
      setError(null);
    }
  };

  const exampleRequests = [
    "Make the dragon more friendly and less scary for young children",
    "Add more dialogue between the main characters",
    "Include more descriptive details about the magical forest",
    "Make the ending more exciting and adventurous",
    "Fix any grammatical errors and improve sentence flow",
    "Add a new subplot about the character's pet companion"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-20 rounded-lg">
              <FiZap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Story Editor</h2>
              <p className="text-sm text-base-content/70">
                Enhance your story with AI-powered improvements
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isLoading}
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">          {/* Chapter Selection */}
          <div>
            <label className="label">
              <span className="label-text font-medium">What would you like to edit?</span>
            </label>
            <select
              value={selectedChapter === null ? 'full' : selectedChapter.toString()}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'full') {
                  setSelectedChapter(null);
                } else {
                  setSelectedChapter(parseInt(value));
                }
              }}
              className="select select-bordered w-full"
              disabled={isLoading}
            >
              <option value="full">Entire Story</option>
              {chapters.map((chapter) => (
                <option key={chapter.number} value={chapter.number.toString()}>
                  {chapter.title}
                </option>
              ))}
            </select>
            {chapters.length === 0 && (
              <p className="text-sm text-base-content/70 mt-2">
                No chapters detected. You can edit the entire story.
              </p>
            )}
            {chapters.length > 0 && (
              <p className="text-sm text-base-content/70 mt-2">
                {chapters.length} chapter{chapters.length === 1 ? '' : 's'} detected
              </p>
            )}
          </div>

          {/* User Request */}
          <div>
            <label className="label">
              <span className="label-text font-medium">
                What changes would you like to make?
              </span>
              <span className="label-text-alt">
                {userRequest.length}/2000 characters
              </span>
            </label>
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder="Describe the changes you'd like to make to your story..."
              className="textarea textarea-bordered w-full h-32 resize-none"
              maxLength={2000}
              disabled={isLoading}
              required
            />
          </div>

          {/* Example Requests */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Example requests:</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {exampleRequests.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setUserRequest(example)}
                  className="text-left p-3 bg-base-200 hover:bg-base-300 rounded-lg text-sm transition-colors"
                  disabled={isLoading}                >
                  &quot;{example}&quot;
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-base-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="loading loading-spinner loading-sm"></span>
                <div>
                  <p className="font-medium">Processing your request...</p>
                  <p className="text-sm text-base-content/70">
                    This may take 5-60 seconds depending on the scope of changes.
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <progress className="progress progress-primary w-full"></progress>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isLoading || !userRequest.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Processing...
                </>
              ) : (
                <>
                  <FiEdit3 className="w-4 h-4" />
                  Apply Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
