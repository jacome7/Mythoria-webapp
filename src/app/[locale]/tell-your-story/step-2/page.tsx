'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Image from 'next/image';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { trackStoryCreation } from '../../../../lib/analytics';

// Writing tips that rotate
const WRITING_TIPS = [
  { icon: '🌍', key: 'setting' },
  { icon: '👥', key: 'characters' },
  { icon: '⚔️', key: 'conflict' },
  { icon: '❤️', key: 'emotion' },
  { icon: '🎭', key: 'twist' },
  { icon: '🎯', key: 'goal' },
  { icon: '✨', key: 'magic' }
];

type ContentType = 'text' | 'images' | 'audio';

interface SessionData {
  text: string;
  images: string[];
  audio: string | null;
  lastSaved: number;
}

export default function Step2Page() {
  const router = useRouter();
  const tStoryStepsStep2 = useTranslations('StorySteps.step2');
  const tStoryStepsCommon = useTranslations('StorySteps.common');
  
  // Modal states
  const [activeModal, setActiveModal] = useState<ContentType | null>(null);
  
  // Content states
  const [storyText, setStoryText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<Array<{file: File, preview: string}>>([]);
  const [uploadedAudio, setUploadedAudio] = useState<{file: File, preview: string} | null>(null);
  
  // UI states
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('step2Data');
    if (savedData) {
      try {
        const data: SessionData = JSON.parse(savedData);
        setStoryText(data.text || '');
        // Note: We can't restore file objects from sessionStorage, only indicate they existed
        if (data.images && data.images.length > 0) {
          // Show indicator that images were previously uploaded
          console.log('Previous images detected:', data.images.length);
        }
        if (data.audio) {
          console.log('Previous audio detected');
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % WRITING_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save functionality with debouncing
  const saveToSession = useCallback(() => {
    setIsSaving(true);
    const data: SessionData = {
      text: storyText,
      images: uploadedImages.map(img => img.preview),
      audio: uploadedAudio?.preview || null,
      lastSaved: Date.now()
    };
    sessionStorage.setItem('step2Data', JSON.stringify(data));
    setTimeout(() => setIsSaving(false), 500);
  }, [storyText, uploadedImages, uploadedAudio]);

  // Debounced save on text change
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToSession();
    }, 10000); // Save after 10 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storyText, saveToSession]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).slice(0, 3 - uploadedImages.length);
      const imagePromises = newImages.map(file => {
        return new Promise<{file: File, preview: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              file,
              preview: e.target?.result as string
            });
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(imagePromises).then(results => {
        setUploadedImages(prev => [...prev, ...results].slice(0, 3));
        saveToSession();
      });
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedAudio({
          file,
          preview: e.target?.result as string
        });
        saveToSession();
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert(tStoryStepsStep2('alerts.cameraIssue'));
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
            setUploadedImages(prev => [...prev, { file, preview }].slice(0, 3));
            saveToSession();
            if (uploadedImages.length < 2) {
              // Continue capturing if less than 3 images
            } else {
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
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    saveToSession();
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
        
        setUploadedAudio({
          file: audioFile,
          preview: audioUrl
        });
        saveToSession();
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert(tStoryStepsStep2('alerts.microphoneIssue'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleNextStep = async () => {
    try {
      setIsCreatingStory(true);
      setShowLoadingModal(true);

      // Save current state one more time
      saveToSession();

      // Get the current authenticated user
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        throw new Error(tStoryStepsStep2('errors.failedGetUser'));
      }
      const userData = await userResponse.json();

      // Create a new story in the database
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'My Story',
          authorId: userData.authorId,
          plotDescription: storyText || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || tStoryStepsStep2('errors.failedCreate'));
      }

      const { story } = await response.json();
      localStorage.setItem('currentStoryId', story.storyId);

      // Process with GenAI if any content provided
      if (storyText.trim() || uploadedImages.length > 0 || uploadedAudio) {
        console.log('Processing content with GenAI...');

        // Convert images to base64
        const imageBase64Array = await Promise.all(
          uploadedImages.map(img => 
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(img.file);
            })
          )
        );

        // Convert audio to base64 if present
        let audioBase64 = null;
        if (uploadedAudio) {
          audioBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(uploadedAudio.file);
          });
        }

        // Send to GenAI for processing
        const genaiResponse = await fetch('/api/stories/genai-structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userDescription: storyText || (uploadedImages.length > 0 ? "Analyze the images to create a story" : "Analyze the audio to create a story"),
            imageData: imageBase64Array.length > 0 ? imageBase64Array[0] : null, // Send first image for now
            audioData: audioBase64,
            storyId: story.storyId,
          }),
        });

        const responseData = await genaiResponse.json();

        if (genaiResponse.ok) {
          console.log('GenAI processing successful:', responseData);
          localStorage.setItem('genaiResults', JSON.stringify({
            story: responseData.story,
            characters: responseData.characters,
            processed: true
          }));
        } else {
          console.error('GenAI processing failed:', responseData);
        }
      }
      
      // Track step 2 completion
      trackStoryCreation.step2Completed({
        step: 2,
        story_id: story.storyId,
        content_type: uploadedImages.length > 0 ? 'image' : uploadedAudio ? 'audio' : 'text',
        has_text: !!storyText.trim(),
        has_image: uploadedImages.length > 0,
        has_audio: uploadedAudio !== null,
        processed_with_genai: !!(storyText.trim() || uploadedImages.length > 0 || uploadedAudio)
      });
      
      router.push('/tell-your-story/step-3');

    } catch (error) {
      console.error('Error creating story:', error);
      const errorMessage =
        error instanceof Error ? error.message : tStoryStepsStep2('errors.unknown');
      alert(tStoryStepsStep2('alerts.failedToCreateStory', { errorMessage }));
    } finally {
      setIsCreatingStory(false);
      setShowLoadingModal(false);
    }
  };

  const currentTip = WRITING_TIPS[currentTipIndex];

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress indicator */}
            {(() => {
              const currentStep = 2;
              const totalSteps = 6;
              return (
                <>
                  {/* Mobile Progress Indicator */}
                  <div className="block md:hidden mb-8">
                    <div className="text-center text-sm text-gray-600 mb-2">
                      {tStoryStepsCommon('stepProgress', { currentStep, totalSteps })}
                    </div>
                    <progress 
                      className="progress progress-primary w-full" 
                      value={currentStep} 
                      max={totalSteps}
                    ></progress>
                  </div>

                  {/* Desktop Progress Indicator */}
                  <div className="hidden md:block mb-8">
                    <ul className="steps steps-horizontal w-full">
                      <li className="step step-primary" data-content="1"></li>
                      <li className="step step-primary" data-content="2"></li>
                      <li className="step" data-content="3"></li>
                      <li className="step" data-content="4"></li>
                      <li className="step" data-content="5"></li>
                      <li className="step" data-content="6"></li>
                    </ul>
                  </div>
                </>
              );
            })()}

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">{tStoryStepsStep2('heading')}</h1>
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-600 text-lg">{tStoryStepsStep2('intro')}</p>
                </div>

                {/* Progress Indicator - Removed */}

                {/* Action Buttons - Reduced height */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* Write Button */}
                  <button
                    onClick={() => setActiveModal('text')}
                    className={`btn h-auto py-3 px-4 flex flex-col items-center gap-2 ${
                      storyText.trim() ? 'btn-outline btn-primary' : 'btn-outline'
                    }`}
                  >
                    <span className="text-2xl">✍️</span>
                    <span className="text-base font-semibold">{tStoryStepsStep2('tabWrite')}</span>
                    {storyText.trim() && (
                      <span className="badge badge-primary badge-sm">✓ Added</span>
                    )}
                  </button>

                  {/* Image Button */}
                  <button
                    onClick={() => setActiveModal('images')}
                    className={`btn h-auto py-3 px-4 flex flex-col items-center gap-2 ${
                      uploadedImages.length > 0 ? 'btn-outline btn-primary' : 'btn-outline'
                    }`}
                  >
                    <span className="text-2xl">📸</span>
                    <span className="text-base font-semibold">{tStoryStepsStep2('tabImage')}</span>
                    {uploadedImages.length > 0 && (
                      <span className="badge badge-primary badge-sm">
                        {uploadedImages.length} {uploadedImages.length === 1 ? tStoryStepsStep2('badgeLabels.image') : tStoryStepsStep2('badgeLabels.images')}
                      </span>
                    )}
                  </button>

                  {/* Audio Button */}
                  <button
                    onClick={() => setActiveModal('audio')}
                    className={`btn h-auto py-3 px-4 flex flex-col items-center gap-2 ${
                      uploadedAudio ? 'btn-outline btn-primary' : 'btn-outline'
                    }`}
                  >
                    <span className="text-2xl">🎤</span>
                    <span className="text-base font-semibold">{tStoryStepsStep2('tabRecord')}</span>
                    {uploadedAudio && (
                      <span className="badge badge-primary badge-sm">{tStoryStepsStep2('badgeLabels.added')}</span>
                    )}
                  </button>
                </div>

                {/* Reassurance Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <p className="text-blue-800 text-sm mt-1">{tStoryStepsStep2('reassurance')}</p>
                    </div>
                  </div>
                </div>

                {/* Auto-save indicator */}
                {isSaving && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    <span className="loading loading-spinner loading-xs"></span> {tStoryStepsCommon('saving')}
                  </div>
                )}

                <StepNavigation
                  currentStep={2}
                  totalSteps={7}
                  nextHref={null}
                  prevHref="/tell-your-story/step-1"
                  nextDisabled={isCreatingStory}
                  onNext={handleNextStep}
                  nextLabel={isCreatingStory ? tStoryStepsStep2('processing') : tStoryStepsStep2('next')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text Modal - Improved with better text area */}
        {activeModal === 'text' && (
          <div className="modal modal-open">
            <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col p-0">
              <div className="modal-header flex justify-between items-center p-6 pb-4 border-b">
                <h3 className="font-bold text-2xl">✍️ {tStoryStepsStep2('tabWrite')}</h3>
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col px-6 py-4">
                  
                  {/* Enhanced text area with better scrolling */}
                  <div className="flex-1 relative rounded-lg border border-base-300 overflow-hidden">
                    <style dangerouslySetInnerHTML={{
                      __html: `
                        .enhanced-textarea {
                          /* Firefox scrollbar */
                          scrollbar-width: thick;
                          scrollbar-color: rgba(59, 130, 246, 0.6) rgba(156, 163, 175, 0.2);
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar {
                          width: 16px;
                          height: 16px;
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-track {
                          background: rgba(156, 163, 175, 0.2);
                          border-radius: 8px;
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-thumb {
                          background: rgba(59, 130, 246, 0.6);
                          border-radius: 8px;
                          border: 2px solid rgba(156, 163, 175, 0.2);
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-thumb:hover {
                          background: rgba(59, 130, 246, 0.8);
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-thumb:active {
                          background: rgba(59, 130, 246, 1);
                        }
                        
                        /* Mobile optimizations */
                        @media (max-width: 768px) {
                          .enhanced-textarea::-webkit-scrollbar {
                            width: 20px;
                            height: 20px;
                          }
                          
                          .enhanced-textarea::-webkit-scrollbar-thumb {
                            border: 3px solid rgba(156, 163, 175, 0.2);
                            border-radius: 10px;
                          }
                        }
                        
                        /* Touch devices - even larger scrollbar */
                        @media (hover: none) and (pointer: coarse) {
                          .enhanced-textarea::-webkit-scrollbar {
                            width: 24px;
                            height: 24px;
                          }
                          
                          .enhanced-textarea::-webkit-scrollbar-thumb {
                            border: 4px solid rgba(156, 163, 175, 0.2);
                            border-radius: 12px;
                          }
                        }
                      `
                    }} />
                    <textarea
                      className="enhanced-textarea w-full h-full p-4 resize-none text-base leading-relaxed border-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      placeholder={tStoryStepsStep2('textPlaceholder')}
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value)}
                    />
                  </div>
                  
                  <label className="label px-0 pt-2">
                    <span className="label-text-alt break-words max-w-full whitespace-normal">{tStoryStepsStep2('textHelp')}</span>
                  </label>
                </div>

                {/* Writing Tips - Moved to bottom */}
                <div className="px-6 pb-4">
                  <div className="p-4 bg-base-200 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">{currentTip.icon}</span>
                      <span className="text-sm">{tStoryStepsStep2('writingTipsTitle')}</span>
                    </h4>
                    <p className="text-sm leading-relaxed animate-fade-in">
                      {tStoryStepsStep2(`writingTips.${currentTipIndex}.text`)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-action p-6 pt-4 border-t">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveModal(null);
                    saveToSession();
                  }}
                >
                  {tStoryStepsStep2('actions.done')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {activeModal === 'images' && (
          <div className="modal modal-open">
            <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col">
              <div className="modal-header flex justify-between items-center mb-4">
                <h3 className="font-bold text-2xl">📸 {tStoryStepsStep2('tabImage')}</h3>
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => {
                    setActiveModal(null);
                    stopCamera();
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {/* Image Gallery */}
                {uploadedImages.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">
                      {tStoryStepsStep2('imageGalleryTitle', { count: uploadedImages.length })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative">
                          <div className="aspect-video rounded-lg overflow-hidden bg-base-200">
                            <Image
                              src={img.preview}
                              alt={`Story image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <button
                            className="btn btn-sm btn-circle btn-error absolute top-2 right-2"
                            onClick={() => removeImage(index)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Images Section */}
                {uploadedImages.length < 3 && !isCapturing && (
                  <div className="text-center space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={startCamera}
                      >
                        📷 {tStoryStepsStep2('takePhoto')}
                      </button>
                      <button
                        className="btn btn-outline btn-lg"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        🖼️ {tStoryStepsStep2('uploadImage')}
                      </button>
                    </div>
                    <p className="text-gray-600">{tStoryStepsStep2('imageHelp')}</p>
                  </div>
                )}

                {/* Camera View */}
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
                        disabled={uploadedImages.length >= 3}
                      >
                        {tStoryStepsStep2('buttons.capture')}
                      </button>
                      <button
                        className="btn btn-outline btn-lg"
                        onClick={stopCamera}
                      >
                        {tStoryStepsStep2('buttons.cancel')}
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

                {/* Image Tips */}
                <div className="mt-6 p-4 bg-base-200 rounded-lg">
                  <h4 className="font-semibold mb-3">{tStoryStepsStep2('photoTips.title')}</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {(tStoryStepsStep2.raw('photoTips.tips') as string[]).map((tip: string, index: number) => (
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
                  {tStoryStepsStep2('actions.done')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Modal */}
        {activeModal === 'audio' && (
          <div className="modal modal-open">
            <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col">
              <div className="modal-header flex justify-between items-center mb-4">
                <h3 className="font-bold text-2xl">🎤 {tStoryStepsStep2('tabRecord')}</h3>
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
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={startRecording}
                      >
                        🎤 {tStoryStepsStep2('recordVoice')}
                      </button>
                      <button
                        className="btn btn-outline btn-lg"
                        onClick={() => audioInputRef.current?.click()}
                      >
                        📁 {tStoryStepsStep2('uploadAudio')}
                      </button>
                    </div>
                    <p className="text-gray-600">{tStoryStepsStep2('audioHelp')}</p>
                  </div>
                )}

                {/* Recording View */}
                {isRecording && (
                  <div className="text-center space-y-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                          <div className="text-white text-4xl">🎤</div>
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping"></div>
                      </div>
                      <p className="text-lg font-semibold text-red-600">{tStoryStepsStep2('actions.recording')}</p>
                      <p className="text-gray-600">{tStoryStepsStep2('recordingHelp')}</p>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <button
                        className="btn btn-error btn-lg"
                        onClick={stopRecording}
                      >
                        ⏹️ {tStoryStepsStep2('actions.stopRecording')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Audio Preview */}
                {uploadedAudio && (
                  <div className="text-center space-y-4">
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <div className="flex items-center justify-center mb-4">
                          <div className="text-6xl">🎵</div>
                        </div>
                        <audio
                          src={uploadedAudio.preview}
                          controls
                          className="w-full max-w-md mx-auto"
                        >
                          {tStoryStepsStep2('audioSupport.notSupported')}
                        </audio>
                        <div className="card-actions justify-center">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={clearAudio}
                          >
                            🗑️ {tStoryStepsStep2('actions.remove')}
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={startRecording}
                          >
                            🔄 {tStoryStepsStep2('actions.recordAgain')}
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

                {/* Audio Tips */}
                <div className="mt-6 p-4 bg-base-200 rounded-lg">
                  <h4 className="font-semibold mb-3">🎤 {tStoryStepsStep2('recordingTips.title')}</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {(tStoryStepsStep2.raw('recordingTips.tips') as string[]).map((tip: string, index: number) => (
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
                  {tStoryStepsStep2('actions.done')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading Modal */}
        {showLoadingModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <div className="text-center space-y-6">
                <h3 className="font-bold text-xl">{tStoryStepsStep2('loadingModal.title')}</h3>
                
                <div className="flex justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-base">{tStoryStepsStep2('loadingModal.message')}</p>
                  <p className="text-sm font-medium text-primary">{tStoryStepsStep2('loadingModal.pleaseWait')}</p>
                </div>
                
                <div className="text-6xl animate-bounce">🍫</div>
              </div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}