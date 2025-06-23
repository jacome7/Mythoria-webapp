'use client';

import { useState, useEffect } from 'react';
import { FiX, FiZap, FiEdit3, FiFileText, FiImage } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import ImageEditingTab from './ImageEditingTab';
import { extractStoryImagesFromHtml, extractStoryImages, StoryImage } from '@/utils/imageUtils';

interface AIEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyContent: string;
  onEditSuccess: (updatedHtml: string, autoSave?: boolean) => void;
  onOptimisticUpdate: (updatedHtml: string) => void;
  onRevertUpdate: (originalHtml: string) => void;
}

interface Chapter {
  number: number;
  title: string;
}

type EditTab = 'text' | 'images';

export default function AIEditModal({ 
  isOpen, 
  onClose, 
  storyId, 
  storyContent, 
  onEditSuccess,
  onOptimisticUpdate,
  onRevertUpdate
}: AIEditModalProps) {
  const t = useTranslations('common.aiEditModal');
  const [activeTab, setActiveTab] = useState<EditTab>('text');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [storyImages, setStoryImages] = useState<StoryImage[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);// Extract chapters from story content
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
  }, [storyContent]);  // Extract images from story content and Google Cloud Storage
  useEffect(() => {
    const loadImages = async () => {
      if (!storyId) {
        setStoryImages([]);
        return;
      }

      let extractedImages: StoryImage[] = [];

      try {
        // Try to get images from Google Cloud Storage first
        const response = await fetch(`/api/stories/${storyId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.mediaLinks && Object.keys(data.mediaLinks).length > 0) {
            extractedImages = extractStoryImages(data.mediaLinks);
            console.log('Extracted story images from Google Cloud Storage:', extractedImages);
          }
        }
      } catch (error) {
        console.error('Error fetching images from Google Cloud Storage:', error);
      }

      // If no images from storage, fall back to HTML extraction
      if (extractedImages.length === 0 && storyContent) {
        extractedImages = extractStoryImagesFromHtml(storyContent);
        console.log('Extracted story images from HTML (fallback):', extractedImages);
      }

      setStoryImages(extractedImages);
    };

    loadImages();
  }, [storyContent, storyId]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      if (!userRequest.trim()) {
      setError(t('errors.enterRequest'));
      return;
    }

    if (userRequest.length > 2000) {
      setError(t('errors.requestTooLong'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody: {
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
        setSelectedChapter(null);      } else {
        setError(data.error || t('errors.editFailed'));
      }
    } catch (error) {
      console.error('Error editing story:', error);
      setError(t('errors.editFailed'));
    } finally {
      setIsLoading(false);
    }
  };
  const handleImageUpdated = (updatedImages: StoryImage[]) => {
    setStoryImages(updatedImages);
    console.log('Images updated in AIEditModal:', updatedImages);
  };  const handleImageEditSuccess = async (originalUrl: string, newUrl: string) => {
    console.log('handleImageEditSuccess called with optimistic updates:', { originalUrl, newUrl });
    
    // Store original content for potential revert
    const originalContent = storyContent;
    
    try {
      // Step 1: Optimistically update the UI immediately
      if (storyContent) {
        console.log('Starting optimistic update...');
        
        let updatedHtml = storyContent;
        const urlExists = storyContent.includes(originalUrl);
        console.log('Original URL exists in content:', urlExists);
        
        if (urlExists) {
          // Direct replacement if URL exists exactly
          updatedHtml = storyContent.replace(
            new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            newUrl
          );
          console.log('Direct URL replacement successful');
        } else {
          console.warn('Original URL not found in story content. Attempting fallback strategies...');
          
          // Fallback 1: Try to find and replace URLs in src attributes with more flexible matching
          const srcRegex = /src\s*=\s*["']([^"']*)['"]/gi;
          let foundMatch = false;
          updatedHtml = storyContent.replace(srcRegex, (match, url) => {
            // Direct match
            if (url === originalUrl) {
              console.log('Found exact URL match in src attribute:', url, '→', newUrl);
              foundMatch = true;
              return match.replace(url, newUrl);
            }
            
            // Filename match (handles cases where paths might differ)
            const originalFilename = originalUrl.split('/').pop();
            const urlFilename = url.split('/').pop();
            if (originalFilename && urlFilename && originalFilename === urlFilename) {
              console.log('Found filename match in src attribute:', url, '→', newUrl);
              foundMatch = true;
              return match.replace(url, newUrl);
            }
            
            // Partial match (handles cases where URL has query parameters or fragments)
            if (originalFilename && url.includes(originalFilename)) {
              console.log('Found partial filename match in src attribute:', url, '→', newUrl);
              foundMatch = true;
              return match.replace(url, newUrl);
            }
            
            return match;
          });
          
          // Fallback 2: If still no changes, try more aggressive filename-based replacement
          if (!foundMatch && updatedHtml === storyContent) {
            const originalFilename = originalUrl.split('/').pop();
            const newFilename = newUrl.split('/').pop();
            
            if (originalFilename && newFilename) {
              // Try replacing the filename in any context (not just URLs)
              const filenameRegex = new RegExp(
                originalFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
                'g'
              );
              const beforeReplace = updatedHtml;
              updatedHtml = storyContent.replace(filenameRegex, newFilename);
              if (updatedHtml !== beforeReplace) {
                console.log('Attempted aggressive filename-based replacement:', originalFilename, '→', newFilename);
                foundMatch = true;
              }
            }
          }
          
          // Fallback 3: Try to find any similar image URLs and replace the most likely candidate
          if (!foundMatch && updatedHtml === storyContent) {
            console.log('Attempting heuristic URL matching...');
            
            // Extract all image URLs from the content
            const allImageUrls = [];
            const imageRegex = /src\s*=\s*["']([^"']*\.(jpg|jpeg|png|gif|webp|svg))['"]/gi;
            let imageMatch;
            while ((imageMatch = imageRegex.exec(storyContent)) !== null) {
              allImageUrls.push(imageMatch[1]);
            }
            
            console.log('Found image URLs in content:', allImageUrls);
            console.log('Looking for URL similar to:', originalUrl);
            
            // Try to find the most similar URL (this handles cases where the version might be different)
            const originalPath = originalUrl.split('/').slice(0, -1).join('/');
            const originalBasename = originalUrl.split('/').pop()?.replace(/\.[^.]*$/, ''); // filename without extension
            
            for (const candidateUrl of allImageUrls) {
              const candidatePath = candidateUrl.split('/').slice(0, -1).join('/');
              const candidateBasename = candidateUrl.split('/').pop()?.replace(/\.[^.]*$/, '');
              
              // If paths match and basenames are similar (handles version differences)
              if (originalPath === candidatePath && originalBasename && candidateBasename && 
                  (originalBasename.includes(candidateBasename) || candidateBasename.includes(originalBasename))) {
                console.log('Found similar URL to replace:', candidateUrl, '→', newUrl);
                updatedHtml = storyContent.replace(
                  new RegExp(candidateUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  newUrl
                );
                foundMatch = true;
                break;
              }
            }
          }
        }
          console.log('Replacement result:', {
          originalUrl,
          newUrl,
          originalLength: storyContent.length,
          updatedLength: updatedHtml.length,
          contentChanged: updatedHtml !== storyContent,
          originalUrlFound: storyContent.includes(originalUrl),
          replacementsCount: (storyContent.match(new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
          htmlPreview: storyContent.substring(0, 500) + '...'
        });
        
        if (updatedHtml !== storyContent) {
          console.log('Optimistic update: immediately updating UI');
          onOptimisticUpdate(updatedHtml);
            // Step 2: Attempt to save to backend
          console.log('Attempting to save changes to backend...');
          setIsSavingImage(true);
          
          try {
            const saveResponse = await fetch(`/api/books/${storyId}/save`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },              body: JSON.stringify({
                html: updatedHtml,
                source: 'manual'
              }),
            });            if (saveResponse.ok) {
              console.log('Backend save successful - image change completed');
              setIsSavingImage(false);
              
              // Close the modal immediately
              onClose();
              
              // Add a small delay to ensure modal closes, then redirect to force refresh
              setTimeout(() => {
                // Redirect to the current page to force a fresh load of the updated HTML
                window.location.reload();
              }, 100);
              
            } else {
              setIsSavingImage(false);
              const error = await saveResponse.json();
              throw new Error(error.error || 'Failed to save');
            }
            
          } catch (saveError) {
            setIsSavingImage(false);
            console.error('Backend save failed, reverting optimistic update:', saveError);
            
            // Step 3: Revert the optimistic update on save failure
            onRevertUpdate(originalContent);
            
            // Show error message
            setError('Failed to save image change. The change has been reverted.');
            return;
          }
            } else {
          console.warn('No changes made to HTML content - URL replacement failed');
          console.error('Failed to find and replace image URL:', {
            originalUrl,
            searchPatterns: [
              'Direct URL match',
              'Filename in src attributes', 
              'Aggressive filename replacement',
              'Heuristic URL matching'
            ],
            allImageUrlsInContent: (() => {
              const urls = [];
              const regex = /src\s*=\s*["']([^"']*\.(jpg|jpeg|png|gif|webp|svg))['"]/gi;
              let match;
              while ((match = regex.exec(storyContent)) !== null) {
                urls.push(match[1]);
              }
              return urls;
            })()
          });          setError('Failed to update image in story. The image URL could not be found in the content. Please try again.');
          setIsSavingImage(false);
          return;
        }
      } else {        console.warn('No story content available to update');
        setError('No story content available to update.');
        setIsSavingImage(false);
        return;
      }

      // Step 4: Refresh the story data to get updated media links
      console.log('Refreshing story data...');
      await refreshStoryData();
      console.log('Story data refresh completed');
        } catch (error) {
      console.error('Error in optimistic image update:', error);
      setIsSavingImage(false);
      
      // Revert optimistic update on any error
      onRevertUpdate(originalContent);
      setError('Failed to update image. Please try again.');
    }
  };
  const refreshStoryData = async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update images with new media links data from Google Cloud Storage
        if (data.mediaLinks) {
          const updatedImages = extractStoryImages(data.mediaLinks);
          setStoryImages(updatedImages);
          console.log('Refreshed story images after edit:', updatedImages);
        }
      }
    } catch (error) {
      console.error('Error refreshing story data:', error);
    }
  };
  const handleClose = () => {
    if (!isLoading && !isSavingImage) {
      onClose();
      setUserRequest('');
      setSelectedChapter(null);
      setActiveTab('text');
      setError(null);
      setIsSavingImage(false);
    }
  };
  const exampleRequests = t.raw('exampleRequests.examples');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-20 rounded-lg">
              <FiZap className="w-5 h-5 text-primary" />
            </div>            <div>
              <h2 className="text-xl font-bold">{t('title')}</h2>
              <p className="text-sm text-base-content/70">
                {t('description')}
              </p>
            </div>
          </div>          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isLoading || isSavingImage}
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="tabs tabs-boxed mb-6 bg-base-200">
            <button
              className={`tab ${activeTab === 'text' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('text')}
              disabled={isLoading || isSavingImage}
            >
              <FiFileText className="w-4 h-4 mr-2" />
              {t('tabs.text')}
            </button>
            <button
              className={`tab ${activeTab === 'images' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('images')}
              disabled={isLoading || isSavingImage}
            >
              <FiImage className="w-4 h-4 mr-2" />
              {t('tabs.images')}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'text' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Chapter Selection */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">{t('editSelection.label')}</span>
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
                  <option value="full">{t('editSelection.entireStory')}</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.number} value={chapter.number.toString()}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Request */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    {t('editRequest.label')}
                  </span>
                  <span className="label-text-alt">
                    {t('editRequest.charactersCount', { 
                      current: userRequest.length,
                      max: 2000
                    })}
                  </span>
                </label>
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={t('editRequest.placeholder')}
                  className="textarea textarea-bordered w-full h-32 resize-none"
                  maxLength={2000}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Example Requests */}              <div>
                <label className="label">
                  <span className="label-text font-medium">{t('exampleRequests.label')}</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {exampleRequests.map((example: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setUserRequest(example)}
                      className="text-left p-3 bg-base-200 hover:bg-base-300 rounded-lg text-sm transition-colors"
                      disabled={isLoading}
                    >
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

              {/* Loading State */}              {isLoading && (
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="loading loading-spinner loading-sm"></span>
                    <div>
                      <p className="font-medium">{t('loadingState.title')}</p>
                      <p className="text-sm text-base-content/70">
                        {t('loadingState.description')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <progress className="progress progress-primary w-full"></progress>
                  </div>
                </div>
              )}

              {/* Actions */}              <div className="flex gap-3 pt-4 border-t border-base-300">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost flex-1"
                  disabled={isLoading}
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={isLoading || !userRequest.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      {t('buttons.processing')}
                    </>
                  ) : (
                    <>
                      <FiEdit3 className="w-4 h-4" />
                      {t('buttons.applyChanges')}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>              <ImageEditingTab
                storyId={storyId}
                storyImages={storyImages}
                onImageEditSuccess={handleImageEditSuccess}
                onImageUpdated={handleImageUpdated}
                storyContent={storyContent}
              />
              
              {/* Actions for Image Tab */}              <div className="flex gap-3 pt-6 border-t border-base-300 mt-6">                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost flex-1"
                  disabled={isLoading || isSavingImage}
                >
                  {t('buttons.close')}
                </button>
              </div>
            </>          )}
        </div>
      </div>
      
      {/* Image Save Loading Modal */}
      {isSavingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-base-100 rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <div>
                <h3 className="text-lg font-semibold">Saving Image Changes</h3>
                <p className="text-sm text-base-content/70 mt-2">
                  Please wait while we save your image changes to the story...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
