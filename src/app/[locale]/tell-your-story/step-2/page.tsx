'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Image from 'next/image';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { trackStoryCreation } from '../../../../lib/analytics';

export default function Step2Page() {
  const router = useRouter();
  const t = useTranslations('StorySteps.step2');
  
  // Removed language selection from Step-2 - now handled in Step-4

  const [activeTab, setActiveTab] = useState<'image' | 'audio' | 'text'>('text');
  const [storyText, setStoryText] = useState('');
  // Story language will be determined by GenAI from user content, then set in Step-4
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);  const audioChunksRef = useRef<Blob[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedAudio(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAudioPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please upload an image instead.');
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
            setUploadedImage(file);
            setImagePreview(canvas.toDataURL());
            stopCamera();
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

  const clearImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const clearAudio = () => {
    setUploadedAudio(null);
    setAudioPreview(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
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
        
        setUploadedAudio(audioFile);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioPreview(audioUrl);
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your permissions and try again.');
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

      // Get the current authenticated user
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }
      const userData = await userResponse.json();

      // Create a new story in the database
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'My Story', // Default title - will be updated by GenAI if user provided text
          authorId: userData.authorId,
          plotDescription: storyText || null, // Store any initial text content
          // storyLanguage will be determined by GenAI and set in Step-4
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create story');
      }

      const { story } = await response.json();

      // Store the story ID in localStorage for use in subsequent steps
      localStorage.setItem('currentStoryId', story.storyId);

      // If user provided text content OR image OR audio, process with GenAI
      if (storyText.trim() || uploadedImage || uploadedAudio) {
        console.log('Processing content with GenAI...');

        // Convert image to base64 if present
        let imageBase64 = null;
        if (uploadedImage) {
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(uploadedImage);
          });
        }

        // Convert audio to base64 if present
        let audioBase64 = null;
        if (uploadedAudio) {
          audioBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(uploadedAudio);
          });
        }

        // Send to GenAI for processing
        const genaiResponse = await fetch('/api/stories/genai-structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userDescription: storyText || (uploadedImage ? "Analyze the image to create a story" : "Analyze the audio to create a story"),
            imageData: imageBase64,
            audioData: audioBase64,
            storyId: story.storyId,
            // Let GenAI extract the language from the provided content
          }),
        });

        const responseData = await genaiResponse.json();

        if (genaiResponse.ok) {
          console.log('GenAI processing successful:', responseData);
          
          // Store the GenAI results for potential use in subsequent steps
          localStorage.setItem('genaiResults', JSON.stringify({
            story: responseData.story,
            characters: responseData.characters,
            processed: true
          }));
        } else {
          console.error('GenAI processing failed:', responseData);
          // Continue anyway - user can still create story manually
        }
      }
      
      // Store the story content data for use in step-3
      localStorage.setItem('step2Data', JSON.stringify({
        text: storyText,
        hasImage: uploadedImage !== null,
        hasAudio: uploadedAudio !== null,
        activeTab: activeTab
      }));
      
      // Track step 2 completion
      trackStoryCreation.step2Completed({
        step: 2,
        story_id: story.storyId,
        content_type: activeTab,
        has_text: !!storyText.trim(),
        has_image: uploadedImage !== null,
        has_audio: uploadedAudio !== null,
        processed_with_genai: !!(storyText.trim() || uploadedImage || uploadedAudio)
      });
      
      // Navigate to step 3
      router.push('/tell-your-story/step-3');

    } catch (error) {
      console.error('Error creating story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create story: ${errorMessage}. Please try again.`);
    } finally {
      setIsCreatingStory(false);
      setShowLoadingModal(false);
    }
  };

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
                      Step {currentStep} of {totalSteps}
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
                <h1 className="card-title text-3xl mb-6">{t('heading')}</h1>
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-600 text-lg">{t('intro')}</p>
                </div>
                
                {/* Language selection removed - now handled in Step 4 */}

                {/* Tabs and Content Wrapper */}
                <div>
                  {/* Tab Navigation */}
                  <div className="tabs w-full">
                    <a
                      className={`tab tab-lifted py-3 flex-1 text-center ${activeTab === 'text' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                      onClick={() => setActiveTab('text')}
                    >
                      ✍️ {t('tabWrite')}
                    </a>
                    <a
                      className={`tab tab-lifted py-3 flex-1 text-center ${activeTab === 'image' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                      onClick={() => setActiveTab('image')}
                    >
                      📸 {t('tabImage')}
                    </a>
                    <a
                      className={`tab tab-lifted py-3 flex-1 text-center ${activeTab === 'audio' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                      onClick={() => setActiveTab('audio')}
                    >
                      🎤 {t('tabRecord')}
                    </a>
                  </div>

                  {/* Tab Content */}
                  <div className="border border-base-300 rounded-b-md p-4 md:p-6 bg-base-100 shadow min-h-96">
                    {/* Text Area Tab Content */}
                    {activeTab === 'text' && (
                      <div className="w-full">
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold text-center mb-2">{t('tellYourStoryLabel')}</h2>
                        </div>
                        <div className="form-control w-full">
                          <textarea
                            className="textarea textarea-bordered w-full h-64 text-base leading-relaxed"
                            placeholder={t('textPlaceholder')}
                            value={storyText}
                            onChange={(e) => setStoryText(e.target.value)}
                          />
                          <label className="label">
                            <span className="label-text-alt break-words max-w-full whitespace-normal">{t('textHelp')}</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Image Upload Tab Content */}
                    {activeTab === 'image' && (
                      <div className="space-y-6">
                        {!imagePreview && !isCapturing && (
                          <div className="text-center space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                              <button
                                className="btn btn-primary btn-lg"
                                onClick={startCamera}
                              >
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
                              >
                                📸 Capture
                              </button>
                              <button
                                className="btn btn-outline btn-lg"
                                onClick={stopCamera}
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Image Preview */}
                        {imagePreview && (
                          <div className="text-center space-y-4">
                            <div className="card bg-base-200">
                              <div className="card-body">
                                <div className="relative w-full max-w-md mx-auto aspect-video rounded-lg overflow-hidden">
                                  <Image
                                    src={imagePreview}
                                    alt="Uploaded story image"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="card-actions justify-center">
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={clearImage}
                                  >
                                    🗑️ Remove
                                  </button>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    🔄 Replace
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    )}
                    
                    {/* Audio Upload Tab Content */}
                    {activeTab === 'audio' && (
                      <div className="space-y-6">
                        {!audioPreview && !isRecording && (
                          <div className="text-center space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                              <button
                                className="btn btn-primary btn-lg"
                                onClick={startRecording}
                              >
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
                              <p className="text-lg font-semibold text-red-600">Recording...</p>
                              <p className="text-gray-600">{t('recordingHelp')}</p>
                            </div>
                            <div className="flex gap-4 justify-center">
                              <button
                                className="btn btn-error btn-lg"
                                onClick={stopRecording}
                              >
                                ⏹️ Stop Recording
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Audio Preview */}
                        {audioPreview && (
                          <div className="text-center space-y-4">
                            <div className="card bg-base-200">
                              <div className="card-body">
                                <div className="flex items-center justify-center mb-4">
                                  <div className="text-6xl">🎵</div>
                                </div>
                                <audio
                                  src={audioPreview}
                                  controls
                                  className="w-full max-w-md mx-auto"
                                >
                                  Your browser does not support the audio element.
                                </audio>
                                <div className="card-actions justify-center">
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={clearAudio}
                                  >
                                    🗑️ Remove
                                  </button>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={startRecording}
                                  >
                                    🔄 Record Again
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => audioInputRef.current?.click()}
                                  >
                                    📁 Upload File
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Reassurance Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <p className="text-blue-800 text-sm mt-1">{t('reassurance')}</p>
                    </div>
                  </div>
                </div>
                <StepNavigation
                  currentStep={2}
                  totalSteps={7}
                  nextHref={null} // We'll handle navigation programmatically
                  prevHref="/tell-your-story/step-1"
                  nextDisabled={isCreatingStory}
                  onNext={handleNextStep}
                  nextLabel={isCreatingStory ? t('processing') : t('next')}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Modal */}
        {showLoadingModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <div className="text-center space-y-6">
                <h3 className="font-bold text-xl">{t('loadingModal.title')}</h3>
                
                {/* Loading Animation */}
                <div className="flex justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
                  <div className="space-y-3">
                  <p className="text-base">{t('loadingModal.message')}</p>
                  <p className="text-sm font-medium text-primary">{t('loadingModal.pleaseWait')}</p>
                </div>
                
                {/* Fun Oompa Loompa visual */}
                <div className="text-6xl animate-bounce">🍫</div>
              </div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
