'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FiImage, FiEdit3 } from 'react-icons/fi';
import CreditConfirmationModal from './CreditConfirmationModal';
import EditCreditInfo from './EditCreditInfo';
import { StoryImage, ImageVersion, getImageDisplayName, formatVersionNumber, formatRelativeTime } from '@/utils/imageUtils';

interface ImageEditingTabProps {
  storyId: string;
  storyImages: StoryImage[];
  onImageEditSuccess: (originalUrl: string, newUrl: string) => void;
  onImageUpdated: (updatedImages: StoryImage[]) => void;
  storyContent?: string; // Add story content to find which image version is currently in use
}

export default function ImageEditingTab({
  storyId,
  storyImages,
  onImageEditSuccess, onImageUpdated,
  storyContent
}: ImageEditingTabProps) {
  const t = useTranslations('common.imageEditingTab');
  const [selectedImage, setSelectedImage] = useState<StoryImage | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ImageVersion | null>(null);
  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null); const [newImageGenerated, setNewImageGenerated] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false); const [isChangingImage, setIsChangingImage] = useState(false);  const [optimisticUpdate, setOptimisticUpdate] = useState<{
    inProgress: boolean;
    originalUrl: string;
    newUrl: string;
  } | null>(null);
  
  // Credit confirmation state
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    nextThreshold: number;
    isFree: boolean;
  } | null>(null);
  const [pendingImageEditData, setPendingImageEditData] = useState<{
    imageUrl: string;
    userRequest: string;
  } | null>(null);
  
  // Credit info for display (before submission)
  const [imageEditCreditInfo, setImageEditCreditInfo] = useState<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    message?: string;
    nextThreshold?: number;
    isFree?: boolean;
  } | null>(null);
  // Clear optimistic update state when error changes (success or failure)
  useEffect(() => {
    if (error && optimisticUpdate) {
      // Error occurred, clear optimistic update
      setOptimisticUpdate(null);
    }
  }, [error, optimisticUpdate]);

  // Add a timeout to clear optimistic update after 5 seconds (backup in case save completes without clearing)
  useEffect(() => {
    if (optimisticUpdate?.inProgress) {
      const timeout = setTimeout(() => {
        console.log('Clearing optimistic update after timeout - assuming save completed');
        setOptimisticUpdate(null);
      }, 5000);

      return () => clearTimeout(timeout);
    }  }, [optimisticUpdate]);

  // Load credit info for image editing when image is selected
  useEffect(() => {
    const loadImageEditCreditInfo = async () => {
      if (!selectedImage || !storyId) {
        setImageEditCreditInfo(null);
        return;
      }

      try {
        const response = await fetch('/api/ai-edit/check-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'imageEdit',
            storyId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setImageEditCreditInfo({
            canEdit: data.canEdit,
            requiredCredits: data.requiredCredits,
            currentBalance: data.currentBalance,
            editCount: data.editCount,
            message: data.message,
            nextThreshold: data.nextThreshold,
            isFree: data.isFree
          });
        }
      } catch (error) {
        console.error('Error loading image edit credit info:', error);
      }
    };

    loadImageEditCreditInfo();
  }, [selectedImage, storyId]);
  // Helper function to find which version of an image is currently used in the story content
  const findCurrentVersionInStory = (image: StoryImage): ImageVersion => {
    if (!storyContent) {
      // If no story content provided, default to latest version
      console.log(`No story content provided, defaulting to latest version for ${image.type}`);
      return image.latestVersion;
    }

    // Check each version of the image to see which one is in the story content
    // Start with the latest versions first as they're more likely to be in use
    const sortedVersions = [...image.versions].sort((a, b) => {
      // Extract version numbers for sorting (e.g., "v001" -> 1)
      const getVersionNumber = (version: string) => {
        const match = version.match(/v(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getVersionNumber(b.version) - getVersionNumber(a.version);
    });

    // 1. Direct URL match
    for (const version of sortedVersions) {
      if (storyContent.includes(version.url)) {
        console.log(`Found version ${version.version} of ${image.type} in story content (direct URL match):`, version.url);
        return version;
      }
    }

    // 2. Filename match (handles URL differences like domain changes)
    for (const version of sortedVersions) {
      const filename = version.url.split('/').pop();
      if (filename && storyContent.includes(filename)) {
        console.log(`Found version ${version.version} of ${image.type} in story content (filename match):`, filename);
        return version;
      }
    }

    // 3. Partial URL match (handles protocol or domain differences)
    for (const version of sortedVersions) {
      // Extract the path part of the URL (everything after the domain)
      const urlParts = version.url.split('/');
      if (urlParts.length > 3) {
        const pathPart = urlParts.slice(3).join('/'); // Skip protocol and domain
        if (storyContent.includes(pathPart)) {
          console.log(`Found version ${version.version} of ${image.type} in story content (partial URL match):`, pathPart);
          return version;
        }
      }
    }

    console.log(`No version of ${image.type} found in story content, defaulting to latest version`);
    // If no version found in content, default to latest version
    return image.latestVersion;
  };
  const handleImageSelect = (image: StoryImage) => {
    setSelectedImage(image);
    // Find the version that's currently being used in the story content
    const currentVersionInStory = findCurrentVersionInStory(image);
    setSelectedVersion(currentVersionInStory);
    setPreviewImage(currentVersionInStory.url);
    setError(null);
    
    console.log('Selected image:', {
      type: image.type,
      chapterNumber: image.chapterNumber,
      selectedVersion: currentVersionInStory.version,
      isLatestVersion: currentVersionInStory.url === image.latestVersion.url
    });
  };

  const handleVersionSelect = (version: ImageVersion) => {
    setSelectedVersion(version);
    setPreviewImage(version.url);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !selectedVersion) {
      setError(t('errors.selectImage'));
      return;
    }

    if (!userRequest.trim()) {
      setError(t('errors.enterChanges'));
      return;
    }

    if (userRequest.length > 2000) {
      setError(t('errors.requestTooLong'));
      return;
    }

    // Check credit requirements before proceeding
    try {
      const creditCheckResponse = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'imageEdit',
          storyId
        }),
      });

      const creditData = await creditCheckResponse.json();

      if (!creditCheckResponse.ok) {
        setError(creditData.error || 'Failed to check credit requirements');
        return;
      }

      if (!creditData.canEdit) {
        setError(creditData.message || 'Insufficient credits for this edit');
        return;
      }

      // Store the edit data for later execution
      setPendingImageEditData({
        imageUrl: selectedVersion.url,
        userRequest: userRequest.trim()
      });

      // Store credit info and show confirmation modal
      setCreditInfo({
        canEdit: creditData.canEdit,
        requiredCredits: creditData.requiredCredits,
        currentBalance: creditData.currentBalance,
        editCount: creditData.editCount,
        nextThreshold: creditData.nextThreshold,
        isFree: creditData.isFree
      });

      setShowCreditConfirmation(true);

    } catch (error) {
      console.error('Error checking credits:', error);
      setError('Failed to check credit requirements. Please try again.');
    }
  };

  const handleCreditConfirmation = async () => {
    if (!pendingImageEditData) return;

    setShowCreditConfirmation(false);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/image-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          imageUrl: pendingImageEditData.imageUrl,
          userRequest: pendingImageEditData.userRequest,
          imageType: selectedImage?.type,
          chapterNumber: selectedImage?.chapterNumber
        }),
      });      const data = await response.json();

      if (response.ok && data.success) {
        if (!selectedImage) {
          setError('Image selection lost during processing');
          return;
        }
        
        // Store the new image URL for potential replacement
        setNewImageGenerated(data.newImageUrl);

        // Create a new version for the selected image
        const newVersion: ImageVersion = {
          url: data.newImageUrl,
          version: generateNextVersion(selectedImage.versions),
          timestamp: new Date().toISOString(),
          filename: extractFilenameFromUrl(data.newImageUrl)
        };

        // Update the selected image with the new version
        const updatedSelectedImage: StoryImage = {
          ...selectedImage,
          versions: [...selectedImage.versions, newVersion],
          latestVersion: newVersion
        };

        // Update the images array with the updated selected image
        const updatedImages = storyImages.map(img =>
          img === selectedImage ? updatedSelectedImage : img
        );

        // Update local state
        setSelectedImage(updatedSelectedImage);
        setSelectedVersion(newVersion);
        setPreviewImage(newVersion.url);

        // Notify parent component about the updated images
        onImageUpdated(updatedImages);

        console.log('New image generated successfully:', data.newImageUrl);
        setUserRequest('');
        setPendingImageEditData(null);
        setCreditInfo(null);
      } else {
        setError(data.error || t('errors.editFailed'));
      }
    } catch (error) {
      console.error('Error editing image:', error);
      setError(t('errors.editFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate the next version number
  const generateNextVersion = (versions: ImageVersion[]): string => {
    const versionNumbers = versions.map(v => {
      const match = v.version.match(/v(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    const maxVersion = Math.max(...versionNumbers);
    return `v${(maxVersion + 1).toString().padStart(3, '0')}`;
  };

  // Helper function to extract filename from URL
  const extractFilenameFromUrl = (url: string): string => {
    return url.split('/').pop() || url;
  };

  const handleReplaceImage = async () => {
    if (!selectedImage || !selectedVersion || !newImageGenerated) {
      setError(t('errors.noNewImage'));
      return;
    }

    setIsReplacing(true);
    setError(null);

    try {      // Instead of assuming latestVersion.url is in the HTML, use the originally selected version URL      // This is the URL that was used to generate the new image
      const originalImageToReplace = selectedVersion.url;

      console.log('Replacing image in story:', {
        original: originalImageToReplace,
        new: newImageGenerated,
        selectedImageType: selectedImage.type,
        selectedImageChapter: selectedImage.chapterNumber
      });

      // Call the parent callback to handle the HTML replacement
      onImageEditSuccess(originalImageToReplace, newImageGenerated);

      // Clear the new image generated state since it's now been used
      setNewImageGenerated(null);

      // Update the selectedImage to show the new image as the latest version
      if (selectedImage) {
        // Create a new version for the generated image
        const newVersion: ImageVersion = {
          url: newImageGenerated,
          version: generateNextVersion(selectedImage.versions),
          timestamp: new Date().toISOString(),
          filename: extractFilenameFromUrl(newImageGenerated)
        };

        // Update the selected image with the new version as the latest
        const updatedSelectedImage = {
          ...selectedImage,
          versions: [...selectedImage.versions, newVersion],
          latestVersion: newVersion
        };

        // Update the images array
        const updatedImages = storyImages.map(img =>
          img === selectedImage ? updatedSelectedImage : img
        );

        // Update local state
        setSelectedImage(updatedSelectedImage);
        setSelectedVersion(newVersion);
        setPreviewImage(newVersion.url);

        // Notify parent component about the updated images
        onImageUpdated(updatedImages);
      }

      console.log('Successfully called onImageEditSuccess for image replacement');

    } catch (error) {
      console.error('Error replacing image:', error);
      setError(t('errors.replaceImageFailed'));
    } finally {
      setIsReplacing(false);
    }
  };
  const handleChangeImage = async () => {
    if (!selectedImage || !selectedVersion) {
      setError(t('errors.noVersionSelected'));
      return;
    }

    setIsChangingImage(true);
    setError(null);

    try {
      console.log('handleChangeImage called with:', {
        selectedImage: selectedImage.type,
        chapterNumber: selectedImage.chapterNumber,
        currentLatestVersion: selectedImage.latestVersion.url,
        selectedVersionUrl: selectedVersion.url,
        selectedVersionVersion: selectedVersion.version,
        allVersions: selectedImage.versions.map(v => ({ version: v.version, url: v.url }))
      });      // Find the version that's currently in the story content
      const currentVersionInStory = findCurrentVersionInStory(selectedImage);
      const originalImageToReplace = currentVersionInStory.url;

      console.log('Attempting to replace:', {
        currentVersionInStory: currentVersionInStory.version,
        currentVersionUrl: currentVersionInStory.url,
        selectedVersion: selectedVersion.version,
        selectedVersionUrl: selectedVersion.url,
        willActuallyChange: originalImageToReplace !== selectedVersion.url
      });

      if (originalImageToReplace === selectedVersion.url) {
        console.log('Selected version is already the current version, no change needed');
        setError(t('errors.sameVersion'));
        return;
      }

      // Set optimistic update state
      setOptimisticUpdate({
        inProgress: true,
        originalUrl: originalImageToReplace,
        newUrl: selectedVersion.url
      });

      // Call the parent callback to handle the HTML replacement
      onImageEditSuccess(originalImageToReplace, selectedVersion.url);

      console.log('Successfully called onImageEditSuccess with URLs:', {
        originalUrl: originalImageToReplace,
        newUrl: selectedVersion.url
      });

    } catch (error) {
      console.error('Error changing image:', error);
      setError(t('errors.changeImageFailed'));
      setOptimisticUpdate(null); // Clear optimistic update on error
    } finally {
      setIsChangingImage(false);
    }
  };
  // Check if the selected version is different from the version currently in the story
  const isVersionChanged = selectedImage && selectedVersion && storyContent &&
    selectedVersion.url !== findCurrentVersionInStory(selectedImage).url;

  if (storyImages.length === 0) {
    return (
      <div className="text-center py-12">
        <FiImage className="w-12 h-12 text-base-content/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-base-content/70 mb-2">{t('noImages.title')}</h3>
        <p className="text-base-content/50">
          {t('noImages.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Selection */}
      <div>        <label className="label">
        <span className="label-text font-medium">{t('imageSelection.label')}</span>
      </label><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storyImages.map((image) => (
            <div
              key={`${image.type}-${image.chapterNumber || 'cover'}`}
              className={`cursor-pointer border-2 rounded-lg p-3 transition-colors ${selectedImage === image
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 hover:border-base-400'
                }`}
              onClick={() => handleImageSelect(image)}
            >              <div className="aspect-square bg-base-200 rounded-lg mb-3 overflow-hidden">
                <Image
                  src={image.latestVersion.url}
                  alt={getImageDisplayName(image)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={400}
                  height={400}
                />
              </div><div className="text-center">
                <h4 className="font-medium text-sm">{getImageDisplayName(image)}</h4>                <p className="text-xs text-base-content/60 mt-1">
                  {t('imageSelection.versionsAvailable', {
                    count: image.versions.length,
                    plural: image.versions.length !== 1 ? 's' : ''
                  })}
                </p>                {image.versions.length > 1 && (
                  <div className="space-y-1">
                    <p className="text-xs text-primary font-medium">
                      {t('imageSelection.latestVersion', {
                        version: formatVersionNumber(image.latestVersion.version)
                      })}
                    </p>
                    {(() => {
                      const currentVersion = findCurrentVersionInStory(image);
                      const isCurrentLatest = currentVersion.url === image.latestVersion.url;
                      if (!isCurrentLatest) {
                        return (
                          <p className="text-xs text-warning font-medium">
                            Currently in story: {formatVersionNumber(currentVersion.version)}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>      {/* Version Selection */}
      {selectedImage && selectedImage.versions.length > 1 && (
        <div>          <label className="label">
          <span className="label-text font-medium">{t('versionSelection.label')}</span>
        </label>
          <select
            value={selectedVersion?.url || ''}
            onChange={(e) => {
              const version = selectedImage.versions.find(v => v.url === e.target.value);
              if (version) {
                handleVersionSelect(version);
              }
            }}
            className="select select-bordered w-full"
            disabled={isLoading}
          >            {selectedImage.versions
            .slice()
            .reverse() // Show newest versions first in dropdown
            .map((version) => {
              const isCurrentInStory = storyContent ? storyContent.includes(version.url) || 
                (version.url.split('/').pop() && storyContent.includes(version.url.split('/').pop()!)) : false;
              return (
                <option key={version.url} value={version.url}>
                  {formatVersionNumber(version.version)} ({formatRelativeTime(version.timestamp)})
                  {isCurrentInStory ? ' • In Story' : ''}
                </option>
              );
            })}
          </select>          <p className="text-sm text-base-content/70 mt-2">
            {t('versionSelection.versionsInfo', {
              count: selectedImage.versions.length,
              plural: selectedImage.versions.length !== 1 ? 's' : ''
            })}
            {selectedVersion && ` • ${t('versionSelection.currentlySelected', {
              version: formatVersionNumber(selectedVersion.version)
            })}`}
          </p>

          {/* Change Image Button - Show when a different version is selected */}
          {isVersionChanged && (
            <div className="mt-4">              <button
              type="button"
              onClick={handleChangeImage}
              className={`btn w-full ${optimisticUpdate?.inProgress ? 'btn-success' : 'btn-warning'}`}
              disabled={isChangingImage || optimisticUpdate?.inProgress}
            >
              {optimisticUpdate?.inProgress ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Saving image change...
                </>
              ) : isChangingImage ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  {t('versionSelection.changingImage')}
                </>
              ) : (
                <>
                  <FiImage className="w-4 h-4" />
                  {t('versionSelection.changeImageButton')}
                </>
              )}
            </button>
              <p className="text-sm text-base-content/70 mt-2">
                {t('versionSelection.changeImageDescription')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div>          <label className="label">
          <span className="label-text font-medium">{t('imagePreview.label')}</span>
        </label>
          <div className="max-w-md mx-auto">            <div className="aspect-square bg-base-200 rounded-lg overflow-hidden">
            <Image
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-cover"
              width={400}
              height={400}
            />
          </div>
          </div>
        </div>
      )}

      {/* Edit Request */}
      {selectedImage && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>            <label className="label">
            <span className="label-text font-medium">
              {t('editRequest.label')}
            </span>
            <span className="label-text-alt break-words max-w-full whitespace-normal">
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
            />          </div>

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
          {isLoading && (<div className="bg-base-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="loading loading-spinner loading-sm"></span>
              <div>
                <p className="font-medium">{t('loadingState.title')}</p>                  <p className="text-sm text-base-content/70">
                  {t('loadingState.description')}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <progress className="progress progress-primary w-full"></progress>
            </div>
          </div>
          )}

          {/* Credit Information */}
          {imageEditCreditInfo && (
            <EditCreditInfo
              canEdit={imageEditCreditInfo.canEdit}
              requiredCredits={imageEditCreditInfo.requiredCredits}
              currentBalance={imageEditCreditInfo.currentBalance}
              editCount={imageEditCreditInfo.editCount}
              message={imageEditCreditInfo.message}
              nextThreshold={imageEditCreditInfo.nextThreshold}
              isFree={imageEditCreditInfo.isFree}
              action="imageEdit"
            />
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading || !userRequest.trim()}
          >            {isLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              {t('buttons.editingImage')}
            </>
          ) : (
            <>
              <FiEdit3 className="w-4 h-4" />
              {t('buttons.generateNewVersion')}
            </>
          )}
          </button>

          {/* Replace Image Button - Show when new image is generated */}
          {newImageGenerated && selectedVersion && (
            <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>                <span className="font-medium text-success">{t('success.title')}</span>
              </div>
              <p className="text-sm text-base-content/70 mb-3">
                {t('success.description')}
              </p>
              <button
                type="button"
                onClick={handleReplaceImage}
                className="btn btn-success w-full"
                disabled={isReplacing}
              >
                {isReplacing ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    {t('buttons.replacingImage')}
                  </>
                ) : (
                  <>
                    <FiImage className="w-4 h-4" />
                    {t('buttons.replaceImageInStory')}
                  </>
                )}
              </button>
            </div>
          )}        </form>
      )}
      
      {/* Credit Confirmation Modal */}
      {showCreditConfirmation && creditInfo && (
        <CreditConfirmationModal
          isOpen={showCreditConfirmation}
          onClose={() => {
            setShowCreditConfirmation(false);
            setPendingImageEditData(null);
            setCreditInfo(null);          }}
          onConfirm={handleCreditConfirmation}
          action="imageEdit"
          requiredCredits={creditInfo.requiredCredits}
          currentBalance={creditInfo.currentBalance}
          editCount={creditInfo.editCount}
          isFree={creditInfo.isFree}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
