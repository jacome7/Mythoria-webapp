'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import { useTranslations, useLocale } from 'next-intl';
import { FiX, FiUpload, FiTrash2, FiInfo, FiCamera, FiZap, FiCheck, FiEdit3 } from 'react-icons/fi';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CharacterPhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string;
  currentPhotoUrl?: string | null;
  onPhotoUpdated: (photoUrl: string | null) => void;
  onDescriptionExtracted?: (description: string) => void;
  onPhotoPrepared?: (dataUrl: string, previewUrl: string) => void;
}

const TARGET_SIZE = 768; // Target output size for character photos

export default function CharacterPhotoUpload({
  isOpen,
  onClose,
  characterId,
  currentPhotoUrl,
  onPhotoUpdated,
  onDescriptionExtracted,
  onPhotoPrepared,
}: CharacterPhotoUploadProps) {
  const t = useTranslations('Characters');
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and small screen size
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouchScreen && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // AI description extraction state
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedDescription, setExtractedDescription] = useState<string | null>(null);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview);
    }
    setSelectedFilePreview(null);
    setShowCropper(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    // Reset AI description state
    setUploadedPhotoUrl(null);
    setUploadedDataUrl(null);
    setShowUploadSuccess(false);
    setAnalyzing(false);
    setExtractedDescription(null);
    setShowDescriptionPreview(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size (8MB max)
    if (file.size > 8 * 1024 * 1024) {
      setError(t('errors.photoTooLarge'));
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError(t('errors.invalidPhotoFormat'));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedFilePreview(previewUrl);
    setShowCropper(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropComplete = useCallback((_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const processAndUpload = async () => {
    if (!selectedFilePreview || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      // Load image into canvas
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = selectedFilePreview;
      });

      // Create canvas at target size
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Draw cropped region scaled to target size
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        TARGET_SIZE,
        TARGET_SIZE,
      );

      // Convert to JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // If we don't have a character yet, hand the prepared photo back to the caller
      // so it can be uploaded after creation.
      if (!characterId) {
        onPhotoPrepared?.(dataUrl, selectedFilePreview);
        handleClose();
        return;
      }

      // Upload to API
      const response = await fetch('/api/media/character-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, dataUrl }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Success - notify parent and show success state
      onPhotoUpdated(result.photoUrl);
      setUploadedPhotoUrl(result.photoUrl);
      setUploadedDataUrl(dataUrl); // Store for AI analysis
      setShowCropper(false);
      setShowUploadSuccess(true);
    } catch (err) {
      console.error('Photo upload failed:', err);
      setError(t('errors.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // AI Description extraction
  const handleAnalyzePhoto = async () => {
    if (!uploadedDataUrl || !characterId) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/media/analyze-character-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          dataUrl: uploadedDataUrl,
          locale,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setExtractedDescription(result.description);
      setShowDescriptionPreview(true);
    } catch (err) {
      console.error('Photo analysis failed:', err);
      setError(t('errors.photoAnalysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptDescription = () => {
    if (extractedDescription && onDescriptionExtracted) {
      onDescriptionExtracted(extractedDescription);
    }
    handleClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/media/character-photo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      // Success - notify parent and close
      onPhotoUpdated(null);
      setShowDeleteConfirm(false);
      handleClose();
    } catch (err) {
      console.error('Photo delete failed:', err);
      setError(t('errors.photoDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-lg">{t('photoUpload.title')}</h3>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle"
              disabled={uploading || deleting}
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Consent message with info icon */}
            <div className="flex items-start gap-2 p-3 bg-info/10 rounded-lg mb-4">
              <FiInfo className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <p className="text-sm text-base-content/80">
                {t('photoUpload.consent')}
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="ml-1 text-info hover:text-info-focus inline-flex items-center"
                  type="button"
                >
                  <FiInfo className="w-4 h-4" />
                </button>
              </p>
            </div>

            {/* Current photo or upload area */}
            {!showCropper && !showUploadSuccess && (
              <div className="flex flex-col items-center gap-4">
                {/* Preview of current photo */}
                {currentPhotoUrl ? (
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                      <Image
                        src={currentPhotoUrl}
                        alt="Character"
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-base-200 flex items-center justify-center border-4 border-dashed border-base-300">
                    <FiCamera className="w-12 h-12 text-base-content/30" />
                  </div>
                )}

                {/* File input (hidden) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Camera input (hidden) - only used on mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Action buttons */}
                <div className="flex flex-col gap-2 w-full">
                  {/* Camera capture button - only shown on mobile */}
                  {isMobile && (
                    <button onClick={triggerCameraInput} className="btn btn-primary w-full gap-2">
                      <FiCamera className="w-4 h-4" />
                      {t('photoUpload.takePhoto')}
                    </button>
                  )}

                  <button
                    onClick={triggerFileInput}
                    className={`btn w-full gap-2 ${isMobile ? 'btn-outline btn-primary' : 'btn-primary'}`}
                  >
                    <FiUpload className="w-4 h-4" />
                    {currentPhotoUrl ? t('photoUpload.changePhoto') : t('photoUpload.selectPhoto')}
                  </button>

                  {currentPhotoUrl && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="btn btn-error btn-outline w-full gap-2"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      {t('photoUpload.deletePhoto')}
                    </button>
                  )}
                </div>

                <p className="text-xs text-base-content/50">{t('photoUpload.maxSize')}</p>
              </div>
            )}

            {/* Cropper view */}
            {showCropper && selectedFilePreview && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-center text-base-content/70">
                  {t('photoUpload.cropInstructions')}
                </p>

                {/* Cropper container */}
                <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                  <Cropper
                    image={selectedFilePreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={handleCropComplete}
                    onZoomChange={setZoom}
                    minZoom={1}
                    maxZoom={3}
                    restrictPosition
                    objectFit="contain"
                    showGrid
                    cropShape="round"
                  />
                </div>

                {/* Zoom slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-base-content/50">1x</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="range range-primary range-sm flex-1"
                  />
                  <span className="text-xs text-base-content/50">3x</span>
                </div>

                {/* Cropper action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCropper(false);
                      resetState();
                    }}
                    className="btn btn-ghost flex-1"
                    disabled={uploading}
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    onClick={processAndUpload}
                    className="btn btn-primary flex-1"
                    disabled={uploading || !croppedAreaPixels}
                  >
                    {uploading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {t('photoUpload.uploading')}
                      </>
                    ) : (
                      t('actions.uploadPhoto')
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Success View - Ask about AI description extraction */}
            {showUploadSuccess && uploadedPhotoUrl && !showDescriptionPreview && characterId && (
              <div className="flex flex-col items-center gap-4">
                {/* Success checkmark and uploaded photo */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-success/40">
                    <Image
                      src={uploadedPhotoUrl}
                      alt="Character"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-success text-success-content rounded-full p-1.5">
                    <FiCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="font-semibold text-success mb-1">
                    {t('photoUpload.uploadSuccess')}
                  </h4>
                  <p className="text-sm text-base-content/70">{t('photoUpload.photoSaved')}</p>
                </div>

                {/* AI Description extraction offer */}
                {onDescriptionExtracted && (
                  <div className="w-full p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-2 shrink-0">
                        <FiZap className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm mb-1">
                          {t('photoUpload.extractDescription')}
                        </h5>
                        <p className="text-xs text-base-content/60 mb-3">
                          {t('photoUpload.extractDescriptionHint')}
                        </p>
                        <button
                          onClick={handleAnalyzePhoto}
                          className="btn btn-primary btn-sm gap-2"
                          disabled={analyzing}
                        >
                          {analyzing ? (
                            <>
                              <span className="loading loading-spinner loading-xs"></span>
                              {t('photoUpload.analyzing')}
                            </>
                          ) : (
                            <>
                              <FiZap className="w-4 h-4" />
                              {t('photoUpload.extractNow')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Close button */}
                <button onClick={handleClose} className="btn btn-ghost w-full">
                  {onDescriptionExtracted ? t('photoUpload.skipAndClose') : t('actions.close')}
                </button>
              </div>
            )}

            {/* Description Preview View */}
            {showDescriptionPreview && extractedDescription && (
              <div className="flex flex-col gap-4">
                {/* Header with photo */}
                <div className="flex items-center gap-3">
                  {uploadedPhotoUrl && (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                      <Image
                        src={uploadedPhotoUrl}
                        alt="Character"
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold">{t('photoUpload.descriptionExtracted')}</h4>
                    <p className="text-xs text-base-content/60">
                      {t('photoUpload.reviewDescription')}
                    </p>
                  </div>
                </div>

                {/* Extracted description */}
                <div className="p-4 bg-base-200 rounded-lg">
                  <p className="text-sm leading-relaxed italic">
                    &ldquo;{extractedDescription}&rdquo;
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <button onClick={handleAcceptDescription} className="btn btn-primary gap-2">
                    <FiCheck className="w-4 h-4" />
                    {t('photoUpload.useDescription')}
                  </button>
                  <button onClick={handleClose} className="btn btn-ghost">
                    {t('photoUpload.skipDescription')}
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{t('photoUpload.title')}</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-base-content/80 leading-relaxed">
                {t.rich('photoUpload.infoTooltip', {
                  link: (chunks) => (
                    <Link href="/termsAndConditions" className="link link-primary" target="_blank">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setShowInfoModal(false)} className="btn btn-primary w-full">
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold">{t('photoUpload.deletePhoto')}</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-base-content/80">{t('photoUpload.deleteConfirm')}</p>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost flex-1"
                disabled={deleting}
              >
                {t('actions.cancel')}
              </button>
              <button onClick={handleDelete} className="btn btn-error flex-1" disabled={deleting}>
                {deleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                  </>
                ) : (
                  t('actions.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
