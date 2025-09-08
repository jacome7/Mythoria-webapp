'use client';

import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Image from 'next/image';
import { FiX, FiImage, FiAlertCircle, FiZap, FiUpload, FiTrash2 } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import CreditConfirmationModal from './CreditConfirmationModal';
import JobProgressModal from './JobProgressModal';
import { toAbsoluteImageUrl } from '../utils/image-url';
import { createImageEditJob } from '@/utils/async-job-api';

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
  const [userRequest, setUserRequest] = useState('');
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
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const TARGET_WIDTH = 1024;
  const TARGET_HEIGHT = 1536;
  const RATIO_TOLERANCE = 0.15; // ±15%
  
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
    imageType: string;
    chapterNumber?: number;
    userRequest: string;
  } | null>(null);

  // Job progress state
  const [showJobProgress, setShowJobProgress] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserRequest('');
      setError(null);
      setNewImageGenerated(null);
      setIsReplacing(false);
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
      // Scale longest edge to 1536 while preserving aspect
      let w = img.width;
      let h = img.height;
      const longest = Math.max(w, h);
      if (longest > 1536) {
        const scale = 1536 / longest;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
  const { within } = evaluateAspect(w, h);
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
      // If outside tolerance and no manual crop yet, open cropper and exit early
  if (!within && !manualCroppedArea) {
        setShowCropper(true);
        setProcessingUserImage(false);
        return; // wait for user crop confirmation
      }
      // Determine crop area
      let cropX = 0, cropY = 0, cropW = w, cropH = h;
      if (manualCroppedArea) {
        cropX = manualCroppedArea.x;
        cropY = manualCroppedArea.y;
        cropW = manualCroppedArea.width;
        cropH = manualCroppedArea.height;
      } else if (!within) {
        // Should not reach here because we early returned, but safeguard
        if (w / h > targetRatio) {
          cropW = Math.round(h * targetRatio);
          cropX = Math.floor((w - cropW) / 2);
        } else {
          cropH = Math.round(w / targetRatio);
          cropY = Math.floor((h - cropH) / 2);
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

  interface CroppedPixels { x: number; y: number; width: number; height: number }
  const onCropComplete = useCallback((_ignored: CroppedPixels, croppedAreaPixelsVal: CroppedPixels) => {
    setCroppedAreaPixels(croppedAreaPixelsVal);
  }, []);

  const confirmCrop = async () => {
    if (!selectedFilePreview || !selectedFile || !croppedAreaPixels) {
      return;
    }
    setProcessingUserImage(true);
    try {
      await processAndUploadUserImage(selectedFile, selectedFilePreview, croppedAreaPixels);
      setShowCropper(false);
    } catch {
      // handled in inner function
    } finally {
      setProcessingUserImage(false);
    }
  };

  const cancelCrop = () => {
    // treat as reference anyway? We'll reset so user can reselect
    resetUserImage();
  };

  // Cropper modal portal
  const cropperModal = showCropper && selectedFilePreview && (
              <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">Crop Image to 1024x1536 (Portrait)</h3>
                    <button onClick={cancelCrop} className="p-2 rounded hover:bg-gray-100">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 relative bg-black">
                    <Cropper
                      image={selectedFilePreview}
                      crop={crop}
                      zoom={zoom}
                      aspect={TARGET_WIDTH / TARGET_HEIGHT}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      minZoom={1}
                      maxZoom={3}
                      restrictPosition={true}
                      objectFit="contain"
                      showGrid={true}
                    />
                  </div>
                  <div className="p-4 border-t flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full">
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500 w-16 text-right">Zoom {zoom.toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={cancelCrop} className="w-28 px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Cancel</button>
                      <button onClick={confirmCrop} disabled={processingUserImage} className="w-28 px-4 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300">
                        {processingUserImage ? 'Processing...' : 'Crop'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );

  // Check image edit credits
  const checkImageEditCredits = async () => {
    try {
      console.log('🔍 Checking image edit credits for storyId:', story.storyId);
      const response = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'imageEdit',
          storyId: story.storyId 
        })
      });
      
      console.log('📊 Image credit check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Image credit check successful:', data);
        setCreditInfo(data);
        return data;
      } else {
        const errorData = await response.json();
        console.error('❌ Image credit check failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error checking image credits:', error);
    }
    return null;
  };

  // Handle image edit
  const handleImageEdit = async () => {
    // Direct as-is replacement path (free): convertToStyle false AND we have an uploaded user image suitable
  const asIsReplacementPossible = userImageUri && !convertToStyle; // any processed upload (originally correct or cropped)

    if (!asIsReplacementPossible) {
      // Converting style requires no textual request but we allow optional; existing validation: if no user image & no text -> need text
  if (!convertToStyle && !userImageUri) {
        if (!userRequest.trim()) {
          setError(tAIImageEditor('errors.describeChanges'));
          return;
        }
      }
    }

    // If free path (as-is) just call image-replace immediately
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

    // Converting to style path -> credit check
    const credits = await checkImageEditCredits();
    if (!credits) {
      setError(tAIImageEditor('errors.unableToCheckCredits'));
      return;
    }
    if (!credits.canEdit) {
      setPendingImageEditData({
        imageUrl: imageData.imageUri,
        imageType: imageData.imageType,
        chapterNumber: imageData.chapterNumber,
        userRequest: userRequest.trim()
      });
      setShowCreditConfirmation(true);
      return;
    }
    await performImageEdit();
  };

  const performImageEdit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare job parameters
      const requestData = pendingImageEditData || {
        imageUrl: imageData.imageUri,
        imageType: imageData.imageType,
        chapterNumber: imageData.chapterNumber,
        userRequest: userRequest.trim()
      };

      const jobParams: {
        storyId: string;
        imageUrl: string;
        imageType: 'cover' | 'backcover' | 'chapter';
        userRequest?: string;
        chapterNumber?: number;
        graphicalStyle?: string;
        userImageUri?: string;
  convertToStyle?: boolean;
      } = {
        storyId: story.storyId,
        imageUrl: requestData.imageUrl,
        imageType: requestData.imageType as 'cover' | 'backcover' | 'chapter',
      };
      if (userRequest.trim()) {
        jobParams.userRequest = userRequest.trim();
      }
      if (userImageUri) {
        jobParams.userImageUri = userImageUri;
        jobParams.convertToStyle = convertToStyle;
      }

      // Add chapter number only if provided
      if (requestData.chapterNumber) {
        jobParams.chapterNumber = requestData.chapterNumber;
      }

      // Add graphical style if available
  if (story.graphicalStyle) jobParams.graphicalStyle = story.graphicalStyle;

      // Create async job
      const jobResponse = await createImageEditJob(jobParams);
      console.log('🚀 Image edit job created:', jobResponse);

      if (jobResponse.success && jobResponse.jobId) {
        // Show progress modal and start tracking
        setCurrentJobId(jobResponse.jobId);
        setShowJobProgress(true);
        setIsLoading(false);
        setPendingImageEditData(null);
      } else {
        throw new Error('Failed to create image edit job');
      }

    } catch (error) {
      console.error('Error creating image edit job:', error);
      setError(error instanceof Error ? error.message : tAIImageEditor('errors.failedToGenerate'));
      setIsLoading(false);
      setPendingImageEditData(null);
    }
  };

  const handleJobComplete = (result: { newImageUrl?: string; [key: string]: unknown }) => {
    console.log('✅ Image edit job completed:', result);
    setShowJobProgress(false);
    setCurrentJobId(null);
    
    if (result && result.newImageUrl) {
      setNewImageGenerated(result.newImageUrl);
      setError(null);
    } else {
      setError('Job completed but no image was generated');
    }
  };

  const handleJobError = (error: string) => {
    console.error('❌ Image edit job failed:', error);
    setShowJobProgress(false);
    setCurrentJobId(null);
    setError(error || 'Image editing job failed');
  };

  const handleJobProgressClose = () => {
    // Only allow closing if job is completed or failed
    setShowJobProgress(false);
    setCurrentJobId(null);
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
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiImage className="w-5 h-5 text-purple-600" />
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

            {/* Helper / Upload Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Add Your Own Photo</label>
              <p className="text-xs text-gray-500 leading-relaxed">
                Drop in a photo you like. Use it unchanged for free, or turn on the style option to blend it with the story’s artistic vibe.
              </p>
              {!selectedFile && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center flex flex-col items-center justify-center space-y-3">
                  <FiUpload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-600">Drag & drop or click to select an image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="user-image-input"
                  />
                  <label htmlFor="user-image-input" className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">Select Image</label>
                  {userImageError && <p className="text-xs text-red-600">{userImageError}</p>}
                </div>
              )}
              {selectedFile && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{selectedFile.name}</span>
                    <div className="flex items-center space-x-2">
                      {processingUserImage && <span className="text-xs text-purple-600">Processing...</span>}
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
                  {!processingUserImage && userImageUri && !convertToStyle && (
                    <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1">Using photo as-is (free).</p>
                  )}
                  {!processingUserImage && userImageUri && convertToStyle && (
                    <p className="text-xs text-purple-700 bg-purple-100 rounded px-2 py-1">Will restyle to match story style.</p>
                  )}
                  {userImageUri && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs font-medium text-gray-600">Style Conversion</span>
                      <button
                        type="button"
                        onClick={() => setConvertToStyle(v => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${convertToStyle ? 'bg-purple-600' : 'bg-gray-300'}`}
                        role="switch"
                        aria-checked={convertToStyle}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${convertToStyle ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                      <span className="text-xs text-gray-600">
                        {convertToStyle ? `Convert the photo to the ${story.graphicalStyle || 'story'} style (uses 1 credit)` : 'Use existing photo without modification'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Request */}
            <div className="space-y-3">
              <textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder={convertToStyle ? tAIImageEditor('requestPlaceholder') : 'Add notes (enable style conversion to use)'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none ${!convertToStyle ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                rows={4}
                maxLength={1000}
                disabled={!convertToStyle}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{tAIImageEditor('characterCount', { count: userRequest.length, max: 1000 })}</span>
                {userImageUri && !convertToStyle && <span className="text-green-600">As-is mode (free)</span>}
                {userImageUri && convertToStyle && <span className="text-purple-600">Conversion will use credits</span>}
              </div>
            </div>

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
            disabled={isLoading || processingUserImage || (!convertToStyle && !userImageUri) || (convertToStyle && !userImageUri)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{tAIImageEditor('loading')}</span>
              </>
            ) : (
              <>
                <FiZap className="w-4 h-4" />
                <span>{convertToStyle ? tAIImageEditor('generateButton') : (userImageUri ? 'Apply Photo' : tAIImageEditor('generateButton'))}</span>
              </>
            )}
          </button>
        )}
            </div>
          </div>
        </div>
      </div>

      {/* Credit Confirmation Modal */}
      {showCreditConfirmation && creditInfo && (
        <CreditConfirmationModal
          isOpen={showCreditConfirmation}
          onClose={() => setShowCreditConfirmation(false)}
          onConfirm={performImageEdit}
          action="imageEdit"
          requiredCredits={creditInfo.requiredCredits}
          currentBalance={creditInfo.currentBalance}
          editCount={creditInfo.editCount}
          isFree={creditInfo.isFree}
        />
      )}

      {/* Job Progress Modal */}
      {showJobProgress && (
        <JobProgressModal
          isOpen={showJobProgress}
          onClose={handleJobProgressClose}
          jobId={currentJobId}
          jobType="image_edit"
          onComplete={handleJobComplete}
          onError={handleJobError}
        />
      )}
  {cropperModal}
    </div>
  );
}
