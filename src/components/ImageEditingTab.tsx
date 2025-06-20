'use client';

import { useState } from 'react';
import { FiImage, FiEdit3 } from 'react-icons/fi';
import { StoryImage, ImageVersion, getImageDisplayName, formatVersionNumber, formatRelativeTime } from '@/utils/imageUtils';

interface ImageEditingTabProps {
  storyId: string;
  storyImages: StoryImage[];
  onImageEditSuccess: (originalUrl: string, newUrl: string) => void;
  onImageUpdated: (updatedImages: StoryImage[]) => void;
}

export default function ImageEditingTab({ 
  storyId, 
  storyImages, 
  onImageEditSuccess,
  onImageUpdated
}: ImageEditingTabProps) {  const [selectedImage, setSelectedImage] = useState<StoryImage | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ImageVersion | null>(null);
  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newImageGenerated, setNewImageGenerated] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isChangingImage, setIsChangingImage] = useState(false);
  const handleImageSelect = (image: StoryImage) => {
    setSelectedImage(image);
    // Always select the most recent version by default (latestVersion is already the newest)
    setSelectedVersion(image.latestVersion);
    setPreviewImage(image.latestVersion.url);
    setError(null);
  };

  const handleVersionSelect = (version: ImageVersion) => {
    setSelectedVersion(version);
    setPreviewImage(version.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedImage || !selectedVersion) {
      setError('Please select an image to edit');
      return;
    }

    if (!userRequest.trim()) {
      setError('Please describe the changes you want to make');
      return;
    }

    if (userRequest.length > 2000) {
      setError('Request must be 2000 characters or less');
      return;
    }

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
          imageUrl: selectedVersion.url,
          userRequest: userRequest.trim()
        }),
      });      const data = await response.json();

      if (response.ok && data.success) {
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
        const updatedSelectedImage = {
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
      } else {
        setError(data.error || 'Failed to edit image');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      setError('Failed to edit image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleRequests = [
    "Change the dragon from red to blue and add more clouds in the sky",
    "Make the protagonist wear a golden crown and hold a magic staff",
    "Change the forest background to a snowy mountain landscape",
    "Add more magical sparkles and fairy lights around the characters",
    "Make the scene darker and more mysterious with moonlight",
    "Add a rainbow in the background and make the colors more vibrant"
  ];

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
      setError('No new image available to replace');
      return;
    }

    setIsReplacing(true);
    setError(null);

    try {
      // Find the original image URL that should be replaced in the HTML
      const originalImageToReplace = selectedImage.latestVersion.url;
      
      // Call the parent callback to handle the HTML replacement
      onImageEditSuccess(originalImageToReplace, newImageGenerated);
      
      // Clear the new image generated state since it's now been used
      setNewImageGenerated(null);
      
      console.log('Successfully replaced image in story:', {
        original: originalImageToReplace,
        new: newImageGenerated
      });
      
    } catch (error) {
      console.error('Error replacing image:', error);
      setError('Failed to replace image in story. Please try again.');
    } finally {
      setIsReplacing(false);
    }
  };
  const handleChangeImage = async () => {
    if (!selectedImage || !selectedVersion) {
      setError('No image version selected to change to');
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
      });

      // The URL to replace should be the latest version URL since that's what's shown by default
      // However, if this image has been changed before, we might need to replace a different version
      // For now, we'll assume the latest version is what's currently in the HTML
      const originalImageToReplace = selectedImage.latestVersion.url;
      
      console.log('Attempting to replace:', {
        original: originalImageToReplace,
        new: selectedVersion.url,
        willActuallyChange: originalImageToReplace !== selectedVersion.url
      });

      if (originalImageToReplace === selectedVersion.url) {
        console.log('Selected version is already the current version, no change needed');
        setError('The selected version is already the current version');
        return;
      }
      
      // Call the parent callback to handle the HTML replacement
      onImageEditSuccess(originalImageToReplace, selectedVersion.url);
      
      console.log('Successfully called onImageEditSuccess');
      
    } catch (error) {
      console.error('Error changing image:', error);
      setError('Failed to change image in story. Please try again.');
    } finally {
      setIsChangingImage(false);
    }
  };

  // Check if the selected version is different from the latest version
  const isVersionChanged = selectedImage && selectedVersion && 
    selectedVersion.url !== selectedImage.latestVersion.url;

  if (storyImages.length === 0) {
    return (
      <div className="text-center py-12">
        <FiImage className="w-12 h-12 text-base-content/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-base-content/70 mb-2">No Images Found</h3>
        <p className="text-base-content/50">
          No images are available for this story yet. Images will appear here once they are generated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Selection */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Select an image to edit:</span>
        </label>        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storyImages.map((image) => (
            <div
              key={`${image.type}-${image.chapterNumber || 'cover'}`}
              className={`cursor-pointer border-2 rounded-lg p-3 transition-colors ${
                selectedImage === image
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 hover:border-base-400'
              }`}
              onClick={() => handleImageSelect(image)}
            >
              <div className="aspect-square bg-base-200 rounded-lg mb-3 overflow-hidden">
                <img
                  src={image.latestVersion.url}
                  alt={getImageDisplayName(image)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>              <div className="text-center">
                <h4 className="font-medium text-sm">{getImageDisplayName(image)}</h4>
                <p className="text-xs text-base-content/60 mt-1">
                  {image.versions.length} version{image.versions.length !== 1 ? 's' : ''} available
                </p>
                {image.versions.length > 1 && (
                  <p className="text-xs text-primary font-medium">
                    Latest: {formatVersionNumber(image.latestVersion.version)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>      {/* Version Selection */}
      {selectedImage && selectedImage.versions.length > 1 && (
        <div>
          <label className="label">
            <span className="label-text font-medium">Choose version to edit:</span>
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
              .map((version) => (                <option key={version.url} value={version.url}>
                  {formatVersionNumber(version.version)} ({formatRelativeTime(version.timestamp)})
                </option>
              ))}
          </select>          <p className="text-sm text-base-content/70 mt-2">
            {selectedImage.versions.length} version{selectedImage.versions.length !== 1 ? 's' : ''} available
            {selectedVersion && ` • Currently selected: ${formatVersionNumber(selectedVersion.version)}`}
          </p>

          {/* Change Image Button - Show when a different version is selected */}
          {isVersionChanged && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleChangeImage}
                className="btn btn-warning w-full"
                disabled={isChangingImage}
              >
                {isChangingImage ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Changing Image...
                  </>
                ) : (
                  <>
                    <FiImage className="w-4 h-4" />
                    Change Image in Story
                  </>
                )}
              </button>
              <p className="text-sm text-base-content/70 mt-2">
                This will replace the current image in your story with the selected version.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div>
          <label className="label">
            <span className="label-text font-medium">Current image:</span>
          </label>
          <div className="max-w-md mx-auto">
            <div className="aspect-square bg-base-200 rounded-lg overflow-hidden">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Request */}
      {selectedImage && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-medium">
                What changes would you like to make to this image?
              </span>
              <span className="label-text-alt">
                {userRequest.length}/2000 characters
              </span>
            </label>
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder="Describe the changes you'd like to make to the image..."
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

          {/* Loading State */}
          {isLoading && (
            <div className="bg-base-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="loading loading-spinner loading-sm"></span>
                <div>
                  <p className="font-medium">Processing your image edit...</p>                  <p className="text-sm text-base-content/70">
                    This may take up to 3 minutes depending on the complexity of changes.
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <progress className="progress progress-primary w-full"></progress>
              </div>
            </div>
          )}          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading || !userRequest.trim()}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Editing Image...
              </>
            ) : (
              <>
                <FiEdit3 className="w-4 h-4" />
                Generate New Version
              </>
            )}
          </button>

          {/* Replace Image Button - Show when new image is generated */}
          {newImageGenerated && selectedVersion && (
            <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="font-medium text-success">New image version generated successfully!</span>
              </div>
              <p className="text-sm text-base-content/70 mb-3">
                Click the button below to replace the current image in your story with the new version.
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
                    Replacing Image...
                  </>
                ) : (
                  <>
                    <FiImage className="w-4 h-4" />
                    Replace Image in Story
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
