'use client';

import { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { UploadedImage, UploadedAudio } from '@/hooks/useStep2Session';
import { useMediaUpload } from '@/hooks/useMediaUpload';

interface Props {
  activeModal: 'images' | 'audio' | null;
  setActiveModal: (value: 'images' | 'audio' | null) => void;
  uploadedImages: UploadedImage[];
  setUploadedImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  uploadedAudio: UploadedAudio | null;
  setUploadedAudio: React.Dispatch<React.SetStateAction<UploadedAudio | null>>;
  saveToSession: () => void;
}

const MAX_IMAGES = 3;
const MAX_ANALYSIS_ATTEMPTS = 3; // initial attempt + 2 retries

export default function MediaCapture({
  activeModal,
  setActiveModal,
  uploadedImages,
  setUploadedImages,
  uploadedAudio,
  setUploadedAudio,
  saveToSession,
}: Props) {
  const t = useTranslations('StorySteps.step2');
  const locale = useLocale();
  const { uploadInput, analyzeImage } = useMediaUpload();

  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ---- Image upload + analysis pipeline -----------------------------------

  const updateImage = (id: string, patch: Partial<UploadedImage>) => {
    setUploadedImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  };

  const runAnalysis = async (id: string, objectPath: string) => {
    setUploadedImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, status: 'analyzing', error: undefined, attempts: img.attempts + 1 }
          : img,
      ),
    );
    try {
      const metadata = await analyzeImage(objectPath, locale);
      updateImage(id, { status: 'done', metadata });
    } catch (e) {
      updateImage(id, {
        status: 'error',
        error: e instanceof Error ? e.message : 'Analysis failed',
      });
    } finally {
      saveToSession();
    }
  };

  const processImage = async (id: string, file: File) => {
    try {
      const { objectPath, publicUrl } = await uploadInput('image', file);
      updateImage(id, { objectPath, publicUrl });
      await runAnalysis(id, objectPath);
    } catch (e) {
      updateImage(id, {
        status: 'error',
        error: e instanceof Error ? e.message : 'Upload failed',
      });
      saveToSession();
    }
  };

  const addImageFiles = (files: File[]) => {
    const slots = Math.max(0, MAX_IMAGES - uploadedImages.length);
    files.slice(0, slots).forEach((file) => {
      const id = crypto.randomUUID();
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = (e.target?.result as string) || '';
        setUploadedImages((prev) =>
          [...prev, { id, file, preview, status: 'uploading' as const, attempts: 0 }].slice(
            0,
            MAX_IMAGES,
          ),
        );
        void processImage(id, file);
      };
      reader.readAsDataURL(file);
    });
  };

  const retryAnalysis = (id: string) => {
    const img = uploadedImages.find((i) => i.id === id);
    if (!img || !img.objectPath || img.attempts >= MAX_ANALYSIS_ATTEMPTS) return;
    void runAnalysis(id, img.objectPath);
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((i) => i.id !== id));
    saveToSession();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) addImageFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert(t('alerts.cameraIssue'));
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && uploadedImages.length < MAX_IMAGES) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `captured-photo-${Date.now()}.jpg`, {
                type: 'image/jpeg',
              });
              addImageFiles([file]);
              if (uploadedImages.length >= MAX_IMAGES - 1) {
                stopCamera();
              }
            }
          },
          'image/jpeg',
          0.92,
        );
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  // ---- Audio upload --------------------------------------------------------

  const processAudio = async (file: File, preview: string) => {
    setUploadedAudio({ file, preview, status: 'uploading' });
    try {
      const { objectPath } = await uploadInput('audio', file);
      setUploadedAudio((prev) => (prev ? { ...prev, objectPath, status: 'done' } : prev));
    } catch (e) {
      setUploadedAudio((prev) =>
        prev
          ? { ...prev, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' }
          : prev,
      );
    } finally {
      saveToSession();
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => void processAudio(file, (e.target?.result as string) || '');
      reader.readAsDataURL(file);
    }
  };

  const clearAudio = () => {
    setUploadedAudio(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
    saveToSession();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recorded-audio.wav', { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        void processAudio(audioFile, audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert(t('alerts.microphoneIssue'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ---- Helpers -------------------------------------------------------------

  const statusLabel = (status: UploadedImage['status']) => {
    switch (status) {
      case 'uploading':
        return t('imageAnalysis.statusUploading');
      case 'analyzing':
        return t('imageAnalysis.statusAnalyzing');
      case 'done':
        return t('imageAnalysis.statusReady');
      case 'error':
        return t('imageAnalysis.statusFailed');
    }
  };

  const detailsImage = uploadedImages.find((i) => i.id === detailsId) || null;

  return (
    <>
      {activeModal === 'images' && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="font-bold text-2xl">📸 {t('tabImage')}</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  setActiveModal(null);
                  stopCamera();
                  saveToSession();
                }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {uploadedImages.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">
                    {t('imageGalleryTitle', { count: uploadedImages.length })}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative border rounded-lg overflow-hidden">
                        <div className="aspect-video bg-base-200 relative">
                          {img.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img.preview}
                              alt="Story input"
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-4xl">
                              🖼️
                            </div>
                          )}
                          <button
                            className="btn btn-xs btn-circle btn-error absolute top-2 right-2"
                            onClick={() => removeImage(img.id)}
                            aria-label={t('actions.remove')}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-2 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            {(img.status === 'uploading' || img.status === 'analyzing') && (
                              <span className="loading loading-spinner loading-xs text-primary" />
                            )}
                            {img.status === 'done' && <span className="text-success">✓</span>}
                            {img.status === 'error' && <span className="text-error">⚠️</span>}
                            <span
                              className={
                                img.status === 'error'
                                  ? 'text-error'
                                  : img.status === 'done'
                                    ? 'text-success'
                                    : 'text-gray-600'
                              }
                            >
                              {statusLabel(img.status)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {img.status === 'done' && (
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={() => setDetailsId(img.id)}
                              >
                                ℹ️ {t('imageAnalysis.viewDetails')}
                              </button>
                            )}
                            {img.status === 'error' &&
                              (img.attempts < MAX_ANALYSIS_ATTEMPTS && img.objectPath ? (
                                <button
                                  className="btn btn-xs btn-primary"
                                  onClick={() => retryAnalysis(img.id)}
                                >
                                  🔄 {t('imageAnalysis.retry')}
                                </button>
                              ) : (
                                <span className="text-xs text-error">
                                  {t('imageAnalysis.attemptsExhausted')}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {uploadedImages.length < MAX_IMAGES && !isCapturing && (
                <div className="text-center space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="btn btn-primary btn-lg" onClick={startCamera}>
                      📷 {t('takePhoto')}
                    </button>
                    <button
                      className="btn btn-outline btn-lg"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      🖼️ {t('uploadImage')}
                    </button>
                  </div>
                  <p className="text-gray-600">{t('imageHelp')}</p>
                </div>
              )}
              {isCapturing && (
                <div className="text-center space-y-4">
                  <video
                    ref={videoRef}
                    className="w-full max-w-md mx-auto rounded-lg border"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="flex gap-4 justify-center">
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={capturePhoto}
                      disabled={uploadedImages.length >= MAX_IMAGES}
                    >
                      {t('buttons.capture')}
                    </button>
                    <button className="btn btn-outline btn-lg" onClick={stopCamera}>
                      {t('buttons.cancel')}
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                multiple
                className="hidden"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-6 p-4 bg-base-200 rounded-lg">
                <h4 className="font-semibold mb-3">{t('photoTips.title')}</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {(t.raw('photoTips.tips') as string[]).map((tip: string, index: number) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setActiveModal(null);
                  stopCamera();
                  saveToSession();
                }}
              >
                {t('actions.done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image analysis details modal */}
      {detailsImage && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl">ℹ️ {t('imageAnalysis.detailsTitle')}</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setDetailsId(null)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-semibold">{t('imageAnalysis.typeLabel')}: </span>
                <span className="badge badge-outline">
                  {detailsImage.metadata?.overallImageContent || '—'}
                </span>
              </div>
              <div>
                <p className="font-semibold mb-1">{t('imageAnalysis.descriptionLabel')}</p>
                <p className="whitespace-pre-line text-gray-700">
                  {detailsImage.metadata?.description || '—'}
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">{t('imageAnalysis.textLabel')}</p>
                <p className="whitespace-pre-line text-gray-700">
                  {detailsImage.metadata?.text?.trim()
                    ? detailsImage.metadata.text
                    : t('imageAnalysis.noText')}
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">{t('imageAnalysis.charactersLabel')}</p>
                {detailsImage.metadata?.characters &&
                detailsImage.metadata.characters.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {detailsImage.metadata.characters.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.type || 'character'}</span>
                        {c.age ? ` · ${c.age}` : ''}
                        {c.physicalDescription ? ` — ${c.physicalDescription}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">{t('imageAnalysis.noCharacters')}</p>
                )}
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setDetailsId(null)}>
                {t('actions.done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'audio' && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="font-bold text-2xl">🎤 {t('tabRecord')}</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!uploadedAudio && !isRecording && (
                <div className="text-center space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="btn btn-primary btn-lg" onClick={startRecording}>
                      🎤 {t('recordVoice')}
                    </button>
                    <button
                      className="btn btn-outline btn-lg"
                      onClick={() => audioInputRef.current?.click()}
                    >
                      📁 {t('uploadAudio')}
                    </button>
                  </div>
                  <p className="text-gray-600">{t('audioHelp')}</p>
                </div>
              )}
              {isRecording && (
                <div className="text-center space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="text-white text-4xl">🎤</div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping"></div>
                    </div>
                    <p className="text-lg font-semibold text-red-600">{t('actions.recording')}</p>
                    <p className="text-gray-600">{t('recordingHelp')}</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <button className="btn btn-error btn-lg" onClick={stopRecording}>
                      ⏹️ {t('actions.stopRecording')}
                    </button>
                  </div>
                </div>
              )}
              {uploadedAudio && (
                <div className="text-center space-y-4">
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <div className="flex items-center justify-center mb-2">
                        <div className="text-6xl">🎵</div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm mb-2">
                        {uploadedAudio.status === 'uploading' && (
                          <span className="loading loading-spinner loading-xs text-primary" />
                        )}
                        {uploadedAudio.status === 'done' && <span className="text-success">✓</span>}
                        {uploadedAudio.status === 'error' && <span className="text-error">⚠️</span>}
                        <span
                          className={
                            uploadedAudio.status === 'error'
                              ? 'text-error'
                              : uploadedAudio.status === 'done'
                                ? 'text-success'
                                : 'text-gray-600'
                          }
                        >
                          {uploadedAudio.status === 'uploading'
                            ? t('imageAnalysis.statusUploading')
                            : uploadedAudio.status === 'done'
                              ? t('imageAnalysis.statusReady')
                              : t('imageAnalysis.statusFailed')}
                        </span>
                      </div>
                      {uploadedAudio.preview && (
                        <audio
                          src={uploadedAudio.preview}
                          controls
                          className="w-full max-w-md mx-auto"
                        >
                          {t('audioSupport.notSupported')}
                        </audio>
                      )}
                      <div className="card-actions justify-center mt-2">
                        <button className="btn btn-outline btn-sm" onClick={clearAudio}>
                          🗑️ {t('actions.remove')}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={startRecording}>
                          🔄 {t('actions.recordAgain')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <div className="mt-6 p-4 bg-base-200 rounded-lg">
                <h4 className="font-semibold mb-3">🎤 {t('recordingTips.title')}</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {(t.raw('recordingTips.tips') as string[]).map((tip: string, index: number) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setActiveModal(null);
                  saveToSession();
                }}
              >
                {t('actions.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
