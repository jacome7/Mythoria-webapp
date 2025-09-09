'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UploadedImage, UploadedAudio } from '@/hooks/useStep2Session';

interface Props {
  activeModal: 'images' | 'audio' | null;
  setActiveModal: (value: 'images' | 'audio' | null) => void;
  uploadedImages: UploadedImage[];
  setUploadedImages: (images: UploadedImage[]) => void;
  uploadedAudio: UploadedAudio | null;
  setUploadedAudio: (audio: UploadedAudio | null) => void;
  saveToSession: () => void;
}

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).slice(0, 3 - uploadedImages.length);
      const imagePromises = newImages.map(file => {
        return new Promise<UploadedImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              file,
              preview: e.target?.result as string,
            });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(imagePromises).then(results => {
        setUploadedImages([...uploadedImages, ...results].slice(0, 3));
        saveToSession();
      });
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
    if (videoRef.current && canvasRef.current && uploadedImages.length < 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `captured-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const preview = canvas.toDataURL();
            setUploadedImages([...uploadedImages, { file, preview }].slice(0, 3));
            saveToSession();
            if (uploadedImages.length >= 2) {
              stopCamera();
            }
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    saveToSession();
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedAudio({ file, preview: e.target?.result as string });
        saveToSession();
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAudio = () => {
    setUploadedAudio(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
    saveToSession();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recorded-audio.wav', { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setUploadedAudio({ file: audioFile, preview: audioUrl });
        saveToSession();
        stream.getTracks().forEach(track => track.stop());
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

  return (
    <>
      {activeModal === 'images' && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="font-bold text-2xl">📸 {t('tabImage')}</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => { setActiveModal(null); stopCamera(); }}>
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {uploadedImages.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">{t('imageGalleryTitle', { count: uploadedImages.length })}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative">
                        <div className="aspect-video rounded-lg overflow-hidden bg-base-200">
                          <Image src={img.preview} alt={`Story image ${index + 1}`} fill className="object-cover" />
                        </div>
                        <button className="btn btn-sm btn-circle btn-error absolute top-2 right-2" onClick={() => removeImage(index)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {uploadedImages.length < 3 && !isCapturing && (
                <div className="text-center space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="btn btn-primary btn-lg" onClick={startCamera}>
                      📷 {t('takePhoto')}
                    </button>
                    <button className="btn btn-outline btn-lg" onClick={() => fileInputRef.current?.click()}>
                      🖼️ {t('uploadImage')}
                    </button>
                  </div>
                  <p className="text-gray-600">{t('imageHelp')}</p>
                </div>
              )}
              {isCapturing && (
                <div className="text-center space-y-4">
                  <video ref={videoRef} className="w-full max-w-md mx-auto rounded-lg border" autoPlay playsInline muted />
                  <div className="flex gap-4 justify-center">
                    <button className="btn btn-primary btn-lg" onClick={capturePhoto} disabled={uploadedImages.length >= 3}>
                      {t('buttons.capture')}
                    </button>
                    <button className="btn btn-outline btn-lg" onClick={stopCamera}>
                      {t('buttons.cancel')}
                    </button>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} multiple className="hidden" />
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

      {activeModal === 'audio' && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="font-bold text-2xl">🎤 {t('tabRecord')}</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setActiveModal(null)}>
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
                    <button className="btn btn-outline btn-lg" onClick={() => audioInputRef.current?.click()}>
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
                      <div className="flex items-center justify-center mb-4">
                        <div className="text-6xl">🎵</div>
                      </div>
                      <audio src={uploadedAudio.preview} controls className="w-full max-w-md mx-auto">
                        {t('audioSupport.notSupported')}
                      </audio>
                      <div className="card-actions justify-center">
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
