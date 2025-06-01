'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Image from 'next/image';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Step2Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'image' | 'audio' | 'text'>('text');
  const [storyText, setStoryText] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);  const [isCapturing, setIsCapturing] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  
  // Debug modal states
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugRequest, setDebugRequest] = useState<any>(null);
  const [debugResponse, setDebugResponse] = useState<any>(null);
  const [isProcessingGenAI, setIsProcessingGenAI] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  const hasContent = () => {
    return storyText.trim() !== '' || uploadedImage !== null || uploadedAudio !== null;
  };  const handleNextStep = async () => {
    try {
      setIsCreatingStory(true);
      
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create story');
      }

      const { story } = await response.json();
      setStoryId(story.storyId);
      
      // Store the story ID in localStorage for use in subsequent steps
      localStorage.setItem('currentStoryId', story.storyId);
      
      // If user provided text content, show debug modal for GenAI processing
      if (storyText.trim()) {
        console.log('Preparing GenAI debug modal...');
        
        // Get existing characters for this author
        const charactersResponse = await fetch('/api/characters');
        const existingCharacters = charactersResponse.ok ? (await charactersResponse.json()).characters || [] : [];
        
        // Prepare the debug request data
        const requestData = {
          userDescription: storyText,
          storyId: story.storyId,
          existingCharacters: existingCharacters
        };
        
        setDebugRequest(requestData);
        setDebugResponse(null);
        setIsCreatingStory(false);
        setShowDebugModal(true);
        return; // Don't proceed to step 3 yet
      }
      
      // Store the story content data for use in step-3
      localStorage.setItem('step2Data', JSON.stringify({
        text: storyText,
        hasImage: uploadedImage !== null,
        hasAudio: uploadedAudio !== null,
        activeTab: activeTab
      }));
      
      console.log('Story created successfully:', story.storyId);
      
      // Navigate to step 3
      router.push('/tell-your-story/step-3');
      
    } catch (error) {
      console.error('Error creating story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create story: ${errorMessage}. Please try again.`);
    } finally {
      setIsCreatingStory(false);
    }
  };

  // Debug modal functions
  const handleSendToGenAI = async () => {
    if (!debugRequest || !storyId) return;
    
    try {
      setIsProcessingGenAI(true);
      
      console.log('Sending to GenAI:', debugRequest);
      
      const genaiResponse = await fetch('/api/stories/genai-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userDescription: debugRequest.userDescription,
          storyId: storyId,
        }),
      });

      const responseData = await genaiResponse.json();
      
      if (!genaiResponse.ok) {
        console.error('GenAI processing failed:', responseData);
        setDebugResponse({
          error: true,
          message: responseData.error || 'GenAI processing failed',
          details: responseData
        });
      } else {
        console.log('GenAI processing successful:', responseData);
        setDebugResponse({
          success: true,
          data: responseData
        });
        
        // Store the GenAI results for potential use in subsequent steps
        localStorage.setItem('genaiResults', JSON.stringify({
          story: responseData.story,
          characters: responseData.characters,
          processed: true
        }));
      }
      
    } catch (error) {
      console.error('Error calling GenAI:', error);
      setDebugResponse({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    } finally {
      setIsProcessingGenAI(false);
    }
  };

  const handleContinueToStep3 = () => {
    // Store the story content data for use in step-3
    localStorage.setItem('step2Data', JSON.stringify({
      text: storyText,
      hasImage: uploadedImage !== null,
      hasAudio: uploadedAudio !== null,
      activeTab: activeTab
    }));
    
    setShowDebugModal(false);
    router.push('/tell-your-story/step-3');
  };

  const handleSkipGenAI = () => {
    // Store the story content data for use in step-3
    localStorage.setItem('step2Data', JSON.stringify({
      text: storyText,
      hasImage: uploadedImage !== null,
      hasAudio: uploadedAudio !== null,
      activeTab: activeTab
    }));
    
    setShowDebugModal(false);
    router.push('/tell-your-story/step-3');
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
            <div className="mb-8">
              <ul className="steps steps-horizontal w-full">
                <li className="step step-primary" data-content="1"></li>
                <li className="step step-primary" data-content="2"></li>
                <li className="step" data-content="3"></li>
                <li className="step" data-content="4"></li>
                <li className="step" data-content="5"></li>
                <li className="step" data-content="6"></li>
                <li className="step" data-content="7"></li>
              </ul>
            </div>

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">Chapter 2 - The Story</h1>
                
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-600 text-lg">
                    You can create your story by drawing it, recording it, or simply writing it down.
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="tabs tabs-boxed justify-center mb-6">
                  <button 
                    className={`tab tab-lg ${activeTab === 'text' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('text')}
                  >
                    ✍️ Write
                  </button>
                  <button 
                    className={`tab tab-lg ${activeTab === 'image' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('image')}
                  >
                    📸 Draw/Photo
                  </button>
                  <button 
                    className={`tab tab-lg ${activeTab === 'audio' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('audio')}
                  >
                    🎤 Record
                  </button>
                </div>

                {/* Text Area Tab */}
                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Tell your story...</span>
                        <span className="label-text-alt">{storyText.length} characters</span>
                      </label>
                      <textarea
                        className="textarea textarea-bordered h-64 text-base leading-relaxed"
                        placeholder="Once upon a time... Let your imagination run wild! Share your adventure, your dreams, or any story that&apos;s close to your heart."
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                      />
                      <label className="label">
                        <span className="label-text-alt">Write as much or as little as you&apos;d like. You can always edit this later!</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Image Upload Tab */}
                {activeTab === 'image' && (
                  <div className="space-y-6">
                    {!imagePreview && !isCapturing && (
                      <div className="text-center space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                          <button
                            className="btn btn-primary btn-lg"
                            onClick={startCamera}
                          >
                            📷 Take Photo
                          </button>
                          <button
                            className="btn btn-outline btn-lg"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            🖼️ Upload Image
                          </button>
                        </div>
                        <p className="text-gray-600">
                          Draw your story, take a photo of it, or upload an existing image that tells your tale.
                        </p>
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
                      <div className="text-center space-y-4">                        <div className="card bg-base-200">
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

                {/* Audio Upload Tab */}
                {activeTab === 'audio' && (
                  <div className="space-y-6">
                    {!audioPreview && (
                      <div className="text-center space-y-4">
                        <button
                          className="btn btn-primary btn-lg"
                          onClick={() => audioInputRef.current?.click()}
                        >
                          🎤 Upload Audio
                        </button>
                        <p className="text-gray-600">
                          Upload an MP3 file of your recorded story. Perfect for those who prefer to speak their tales!
                        </p>
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
                                onClick={() => audioInputRef.current?.click()}
                              >
                                🔄 Replace
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

                {/* Reassurance Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">💡</div>
                    <div>                      <p className="text-blue-800 font-medium">
                        Prefer structured guidance? Continue, and we&apos;ll use AI to analyze your story and prompt you for each detail separately!
                      </p>
                      <p className="text-blue-600 text-sm mt-1">
                        If you&apos;ve written something above, our AI will automatically extract characters, settings, and themes. Otherwise, the next steps will guide you through creating your story step by step.
                      </p>
                    </div>
                  </div>
                </div>                <StepNavigation 
                  currentStep={2}
                  totalSteps={7}
                  nextHref={null} // We'll handle navigation programmatically
                  prevHref="/tell-your-story/step-1"
                  nextDisabled={isCreatingStory}
                  onNext={handleNextStep}
                  nextLabel={isCreatingStory ? "Processing with AI..." : (hasContent() ? "Continue with Story" : "Next Chapter")}
                />              </div>
            </div>
          </div>
        </div>

        {/* Debug Modal */}
        {showDebugModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-4xl">
              <h3 className="font-bold text-lg mb-4">🔍 GenAI Debug Console</h3>
              
              {/* Request Section */}
              <div className="mb-6">
                <h4 className="font-semibold text-md mb-2">📤 Request to GenAI:</h4>
                <div className="bg-base-200 p-4 rounded-lg overflow-auto max-h-40">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(debugRequest, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Send Button */}
              {!debugResponse && (
                <div className="mb-6 text-center">
                  <button 
                    className={`btn btn-primary btn-lg ${isProcessingGenAI ? 'loading' : ''}`}
                    onClick={handleSendToGenAI}
                    disabled={isProcessingGenAI}
                  >
                    {isProcessingGenAI ? 'Processing...' : '🚀 Send to GenAI'}
                  </button>
                </div>
              )}

              {/* Response Section */}
              {debugResponse && (
                <div className="mb-6">
                  <h4 className="font-semibold text-md mb-2">
                    📥 Response from GenAI:
                    {debugResponse.success && <span className="text-success ml-2">✅ Success</span>}
                    {debugResponse.error && <span className="text-error ml-2">❌ Error</span>}
                  </h4>
                  <div className="bg-base-200 p-4 rounded-lg overflow-auto max-h-60">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(debugResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-action">
                <button 
                  className="btn btn-outline" 
                  onClick={handleSkipGenAI}
                >
                  Skip GenAI & Continue
                </button>
                {debugResponse && (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleContinueToStep3}
                  >
                    Continue to Step 3
                  </button>
                )}
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setShowDebugModal(false)}
                >
                  Close Debug
                </button>
              </div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
