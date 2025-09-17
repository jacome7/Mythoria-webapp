'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiX, FiImage, FiAlertCircle, FiZap, FiUpload, FiTrash2 } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { toAbsoluteImageUrl } from '../utils/image-url';
import CropperModal from './ai-image-editor/Cropper';
import { useImageEditJob } from './ai-image-editor/useImageEditJob';

interface Story {
  storyId: string;
  title: string;
  coverUri?: string;
  backcoverUri?: string;
  targetAudience?: string;
  graphicalStyle?: string;
}

interface AIImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
  imageData: {
    imageUri: string;
    imageType: 'cover' | 'backcover' | 'chapter';
    chapterNumber?: number;
    title?: string;
  };
  onImageEditSuccess: (updatedImageData: Record<string, unknown>) => void;
  onOptimisticUpdate?: (updatedImageData: Record<string, unknown>) => void;
  onRevertUpdate?: (originalImageData: Record<string, unknown>) => void;
}

export default function AIImageEditor({
  isOpen,
  onClose,
  story,
  imageData,
  onImageEditSuccess,
  onOptimisticUpdate, // eslint-disable-line @typescript-eslint/no-unused-vars
  onRevertUpdate // eslint-disable-line @typescript-eslint/no-unused-vars
}: AIImageEditorProps) {
  const tAIImageEditor = useTranslations('AIImageEditor');
  const tGraphicalStyles = useTranslations('GraphicalStyles');
  const [userRequest, setUserRequest] = useState('');
  // mode: 'edit' = Option A (edit current image via prompt); 'upload' = Option B (user supplies photo)
  const [mode, setMode] = useState<'edit' | 'upload'>('edit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImageGenerated, setNewImageGenerated] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  // Phase B: user supplied image handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [processingUserImage, setProcessingUserImage] = useState(false);
  const [userImageError, setUserImageError] = useState<string | null>(null);
  const [convertToStyle, setConvertToStyle] = useState<boolean>(false);
  // Removed unused directReplacementPossible state (was only being assigned, never read)
  const [userImageUri, setUserImageUri] = useState<string | null>(null); // gs:// path after upload
  const [showCropper, setShowCropper] = useState(false);
  const TARGET_WIDTH = 1024;
  const TARGET_HEIGHT = 1536;
  const RATIO_TOLERANCE = 0.15; // ±15%


  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserRequest('');
      setError(null);
      setNewImageGenerated(null);
      setIsReplacing(false);
      setMode('edit'); // default to Option A as requested
    }
  }, [isOpen]);

  // Cleanup object URL on unmount/change
  useEffect(() => {
    return () => {
      if (selectedFilePreview) URL.revokeObjectURL(selectedFilePreview);
    };
  }, [selectedFilePreview]);

  // Helper: compute aspect suitability
  const evaluateAspect = (w: number, h: number) => {
    const targetRatio = TARGET_WIDTH / TARGET_HEIGHT; // ~0.6667
    const ratio = w / h;
    const diff = Math.abs(ratio - targetRatio) / targetRatio; // relative difference
    const within = diff <= RATIO_TOLERANCE;
    return { within, ratio, diff };
  };

  const resetUserImage = () => {
    setSelectedFile(null);
    if (selectedFilePreview) URL.revokeObjectURL(selectedFilePreview);
    setSelectedFilePreview(null);
    setUserImageError(null);
    // directReplacementPossible removed
    setConvertToStyle(false);
    setUserImageUri(null);
    setShowCropper(false);
  };

  const handleJobComplete = (result: { newImageUrl?: string;[key: string]: unknown }) => {
    console.log('✅ Image edit job completed:', result);
    if (result && result.newImageUrl) {
      setNewImageGenerated(result.newImageUrl);
      setError(null);
    } else {
      setError('Job completed but no image was generated');
    }
  };

  const handleJobError = (error: string) => {
    console.error('❌ Image edit job failed:', error);
    setError(error || 'Image editing job failed');
  };

  const { requestJob, CreditConfirmation, JobProgress } = useImageEditJob({
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUserImageError(null);
    if (file.size > 8 * 1024 * 1024) { // >8MB
      setUserImageError('File is larger than 8MB. Please choose a smaller image.');
      return;
    }
    const acceptable = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!acceptable.includes(file.type)) {
      setUserImageError('Unsupported format. Use JPEG, PNG, or HEIC.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedFilePreview(previewUrl);
    // Defer processing until user confirms or automatically process
    void processAndUploadUserImage(file, previewUrl);
  };

  const processAndUploadUserImage = async (file: File, previewUrl: string, manualCroppedArea?: { x: number; y: number; width: number; height: number }) => {
    try {
      setProcessingUserImage(true);
      // Load image into canvas
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el as HTMLImageElement);
        el.onerror = reject;
        el.src = previewUrl;
      });
      // We evaluate aspect ratio potentially using a downscaled virtual size (to keep consistent logic)
      // BUT we always crop from the ORIGINAL image pixel coordinates. react-easy-crop already gives
      // us pixel values relative to the natural image size (croppedAreaPixels). The previous logic
      // incorrectly re-scaled those coordinates, effectively recentring the crop.
      const originalWidth = img.width;
      const originalHeight = img.height;
      let evalWidth = originalWidth;
      let evalHeight = originalHeight;
      const longest = Math.max(evalWidth, evalHeight);
      if (longest > 1536) {
        const evalScale = 1536 / longest; // ONLY for aspect suitability check
        evalWidth = Math.round(evalWidth * evalScale);
        evalHeight = Math.round(evalHeight * evalScale);
      }
      const { within } = evaluateAspect(evalWidth, evalHeight);
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
      // If outside tolerance and no manual crop yet, open cropper and exit early
      if (!within && !manualCroppedArea) {
        setShowCropper(true);
        setProcessingUserImage(false);
        return; // wait for user crop confirmation
      }
      // Determine crop area
      let cropX = 0, cropY = 0, cropW = originalWidth, cropH = originalHeight;
      if (manualCroppedArea) {
        // Use coordinates exactly as provided (already in original image pixel space)
        cropX = Math.max(0, Math.floor(manualCroppedArea.x));
        cropY = Math.max(0, Math.floor(manualCroppedArea.y));
        cropW = Math.floor(manualCroppedArea.width);
        cropH = Math.floor(manualCroppedArea.height);
        // Clamp to original bounds
        if (cropX + cropW > originalWidth) cropW = originalWidth - cropX;
        if (cropY + cropH > originalHeight) cropH = originalHeight - cropY;
      } else if (!within) {
        // Should not reach here because we early returned, but safeguard
        if (originalWidth / originalHeight > targetRatio) {
          cropW = Math.round(originalHeight * targetRatio);
          cropX = Math.floor((originalWidth - cropW) / 2);
        } else {
          cropH = Math.round(originalWidth / targetRatio);
          cropY = Math.floor((originalHeight - cropH) / 2);
        }
      }
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = TARGET_WIDTH;
      finalCanvas.height = TARGET_HEIGHT;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unsupported');
      // Draw cropped region scaled to target size
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      // If we reached here via a manual crop, the output now matches target exactly => allow as-is replacement
      // If manual crop performed, image now matches target aspect
      const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
      // Update the user-facing preview immediately after a manual crop so the user
      // sees the result without needing to re-open the modal.
      if (manualCroppedArea) {
        try {
          if (selectedFilePreview && selectedFilePreview.startsWith('blob:')) {
            URL.revokeObjectURL(selectedFilePreview);
          }
          setSelectedFilePreview(dataUrl);
        } catch {/* ignore preview revocation errors */ }
      }
      // Upload as prospective story image version (images folder) only when we might apply as-is or convert.
      // We still rely on versioning logic in backend route /api/media/story-image-upload.
      const mappedType = imageData.imageType === 'cover' ? 'cover' : (imageData.imageType === 'backcover' ? 'backcover' : 'chapter');
      const uploadResp = await fetch('/api/media/story-image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.storyId,
          imageType: mappedType,
          chapterNumber: imageData.chapterNumber,
          contentType: 'image/jpeg',
          dataUrl,
          currentImageUrl: imageData.imageUri
        })
      });
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }
      if (uploadData.publicUrl) {
        // Store public HTTPS URL directly (backend already versioned & placed in images folder)
        setUserImageUri(uploadData.publicUrl);
      }
    } catch (err) {
      console.error('User image processing/upload failed', err);
      setUserImageError(err instanceof Error ? err.message : 'Failed to process image');
      resetUserImage();
    } finally {
      setProcessingUserImage(false);
    }
  };

  const handleCropConfirm = async (area: { x: number; y: number; width: number; height: number }) => {
    if (!selectedFile || !selectedFilePreview) return;
    setProcessingUserImage(true);
    try {
      await processAndUploadUserImage(selectedFile, selectedFilePreview, area);
      setShowCropper(false);
    } finally {
      setProcessingUserImage(false);
    }
  };

  const handleCropCancel = () => {
    resetUserImage();
    setShowCropper(false);
  };

  // Handle image edit
  const handleImageEdit = async () => {
    // Option A: Edit existing image
    if (mode === 'edit') {
      if (!userRequest.trim()) {
        setError(tAIImageEditor('errors.describeChanges'));
        return;
      }
      setIsLoading(true);
      const err = await requestJob({
        storyId: story.storyId,
        imageUrl: imageData.imageUri, // base image
        imageType: imageData.imageType,
        chapterNumber: imageData.chapterNumber,
        userRequest: userRequest.trim(),
        graphicalStyle: story.graphicalStyle,
        // no userImageUri, no convertToStyle needed
      });
      if (err) setError(err);
      setIsLoading(false);
      return;
    }

    // Option B: Upload user photo flow
    // Direct as-is replacement path (free): convertToStyle false AND we have an uploaded user image suitable
    const asIsReplacementPossible = userImageUri && !convertToStyle;
    if (asIsReplacementPossible) {
      try {
        setIsLoading(true);
        const response = await fetch('/api/image-replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: story.storyId,
            imageType: imageData.imageType,
            newImageUrl: userImageUri,
            chapterNumber: imageData.chapterNumber,
            mode: 'as_is'
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          onImageEditSuccess(data);
          onClose();
          return;
        }
        setError(data.error || tAIImageEditor('errors.failedToReplace'));
      } catch {
        setError(tAIImageEditor('errors.failedToReplace'));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    // Style conversion of user photo (credit)
    setIsLoading(true);
    const err = await requestJob({
      storyId: story.storyId,
      imageUrl: imageData.imageUri,
      imageType: imageData.imageType,
      chapterNumber: imageData.chapterNumber,
      userRequest: userRequest.trim(),
      graphicalStyle: story.graphicalStyle,
      userImageUri: userImageUri || undefined,
      convertToStyle,
    });
    if (err) setError(err);
    setIsLoading(false);
  };
  const handleReplaceImage = async () => {
    if (!newImageGenerated) return;

    setIsReplacing(true);
    try {
      const response = await fetch('/api/image-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.storyId,
          imageType: imageData.imageType,
          newImageUrl: newImageGenerated,
          chapterNumber: imageData.chapterNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onImageEditSuccess(data);
        onClose();
      } else {
        setError(data.error || tAIImageEditor('errors.failedToReplace'));
      }
    } catch (error) {
      console.error('Error replacing image:', error);
      setError(tAIImageEditor('errors.failedToReplace'));
    } finally {
      setIsReplacing(false);
    }
  };

  // When user selects the "Use your photo" tab and no file has been chosen yet,
  // automatically open the hidden file picker to streamline the flow.
  const handleSelectUploadMode = () => {
    if (mode !== 'upload') setMode('upload');
    if (!selectedFile) {
      // Defer until after the tab content renders so the input exists in DOM
      setTimeout(() => {
        try {
          const input = document.getElementById('user-image-input') as HTMLInputElement | null;
          input?.click();
        } catch { /* ignore */ }
      }, 0);
    }
  };

  const getImageTitle = () => {
    if (imageData.title) return imageData.title;

    switch (imageData.imageType) {
      case 'cover':
        return tAIImageEditor('imageTypes.cover');
      case 'backcover':
        return tAIImageEditor('imageTypes.backcover');
      case 'chapter':
        return tAIImageEditor('imageTypes.chapter', { number: imageData.chapterNumber ?? 0 });
      default:
        return 'Image';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FiImage className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {tAIImageEditor('title', { imageType: getImageTitle() })}
              </h2>
              <p className="text-sm text-gray-600">
                {story.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Mode Toggle */}
            {/* Current Image */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {tAIImageEditor('currentImage')}
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="relative mx-auto max-w-sm">
                  <Image
                    src={toAbsoluteImageUrl(imageData.imageUri) || ''}
                    alt={getImageTitle()}
                    width={400}
                    height={500}
                    className="w-full h-auto rounded-lg object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Mode Toggle (now placed below image) */}
            <div className="flex gap-2" role="tablist">
              <button
                type="button"
                role="tab"
                onClick={() => setMode('edit')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'edit' ? 'bg-primary text-white border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}
                aria-selected={mode === 'edit'}
                aria-controls="ai-image-editor-edit-panel"
                id="ai-image-editor-edit-tab"
              >
                {tAIImageEditor('modes.edit')}
              </button>
              <button
                type="button"
                role="tab"
                onClick={handleSelectUploadMode}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'upload' ? 'bg-primary text-white border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}
                aria-selected={mode === 'upload'}
                aria-controls="ai-image-editor-upload-panel"
                id="ai-image-editor-upload-tab"
              >
                {tAIImageEditor('modes.upload')}
              </button>
            </div>

            {/* Helper / Upload Section (Option B) */}
            {mode === 'upload' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">{tAIImageEditor('labels.addYourOwnPhoto')}</label>
                {!selectedFile && (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center flex flex-col items-center justify-center space-y-3">
                    <FiUpload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-600">{tAIImageEditor('helper.dragDropOrClick')}</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="user-image-input"
                    />
                    <label htmlFor="user-image-input" className="px-4 py-2 bg-base-100 border border-base-300 rounded-md text-sm cursor-pointer hover:bg-base-200">{tAIImageEditor('helper.selectImage')}</label>
                    {userImageError && <p className="text-xs text-red-600">{userImageError}</p>}
                  </div>
                )}
                {selectedFile && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{selectedFile.name}</span>
                      <div className="flex items-center space-x-2">
                        {processingUserImage && <span className="text-xs text-primary">{tAIImageEditor('helper.processing')}</span>}
                        {/* Removed legacy replacement/reference pill */}
                        <button onClick={resetUserImage} className="p-1 rounded hover:bg-gray-200" aria-label="Remove">
                          <FiTrash2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    {selectedFilePreview && (
                      <div className="relative w-40 h-60 overflow-hidden rounded border bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedFilePreview} alt="Uploaded preview" className="object-cover w-full h-full" />
                      </div>
                    )}
                    {userImageError && <p className="text-xs text-red-600">{userImageError}</p>}
                    {/* Removed status badges for as-is and style conversion per request */}
                    {userImageUri && (
                      <fieldset className="pt-2 space-y-2">
                        <legend className="text-xs font-medium text-gray-600">{tAIImageEditor('radio.legend')}</legend>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="use-photo-mode"
                              className="radio radio-primary mt-0.5"
                              checked={!convertToStyle}
                              onChange={() => setConvertToStyle(false)}
                            />
                            <span className="text-xs text-gray-700 leading-snug">{tAIImageEditor('radio.asIs')}</span>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="use-photo-mode"
                              className="radio radio-primary mt-0.5"
                              checked={convertToStyle}
                              onChange={() => setConvertToStyle(true)}
                            />
                            <span className="text-xs text-gray-700 leading-snug">{tAIImageEditor('radio.convert', { style: (story.graphicalStyle ? tGraphicalStyles(story.graphicalStyle) : tAIImageEditor('radio.defaultStyle')) })}</span>
                          </label>
                        </div>
                      </fieldset>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Request / Prompt Section */}
            {mode === 'edit' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">{tAIImageEditor('labels.describeChanges')}</label>
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={tAIImageEditor('requestPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  rows={4}
                  maxLength={1000}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{tAIImageEditor('characterCount', { count: userRequest.length, max: 1000 })}</span>
                  <span className="text-primary">{tAIImageEditor('helper.editUsesCredit')}</span>
                </div>
              </div>
            )}
            {mode === 'upload' && (
              <div className="space-y-3">
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={convertToStyle ? tAIImageEditor('requestPlaceholder') : tAIImageEditor('placeholders.addNotesStyleDisabled')}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none ${!convertToStyle ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                  rows={4}
                  maxLength={1000}
                  disabled={!convertToStyle}
                />
              </div>
            )}

            {/* New Image Preview */}
            {newImageGenerated && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {tAIImageEditor('newImageLabel')}
                </label>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="relative mx-auto max-w-sm">
                    <Image
                      src={toAbsoluteImageUrl(newImageGenerated) || ''}
                      alt={tAIImageEditor('generatedImageAlt')}
                      width={400}
                      height={500}
                      className="w-full h-auto rounded-lg object-cover"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-green-600 mb-3">
                      {tAIImageEditor('newImageSuccess')}
                    </p>
                    <button
                      onClick={handleReplaceImage}
                      disabled={isReplacing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto transition-colors"
                    >
                      {isReplacing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{tAIImageEditor('loading')}</span>
                        </>
                      ) : (
                        <>
                          <FiImage className="w-4 h-4" />
                          <span>{tAIImageEditor('replaceButton')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <FiAlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {tAIImageEditor('cancelButton')}
              </button>
              {!newImageGenerated && (
                <button
                  onClick={handleImageEdit}
                  disabled={
                    isLoading ||
                    (mode === 'upload' && (processingUserImage || (!userImageUri) || (convertToStyle && !userImageUri))) ||
                    (mode === 'edit' && !userRequest.trim())
                  }
                  className="px-6 py-2 btn btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{tAIImageEditor('loading')}</span>
                    </>
                  ) : (
                    <>
                      <FiZap className="w-4 h-4" />
                      <span>
                        {mode === 'edit'
                          ? tAIImageEditor('generateButton')
                          : convertToStyle
                            ? tAIImageEditor('generateButton')
                            : (userImageUri ? tAIImageEditor('buttons.applyPhoto') : tAIImageEditor('generateButton'))}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {CreditConfirmation}
      {JobProgress}
      {showCropper && selectedFilePreview && (
        <CropperModal
          imageSrc={selectedFilePreview}
          aspect={TARGET_WIDTH / TARGET_HEIGHT}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          processing={processingUserImage}
        />
      )}
    </div>
  );
}
