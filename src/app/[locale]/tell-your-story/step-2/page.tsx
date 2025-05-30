'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
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
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  
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
          title: 'My Story', // Default title - will be updated in later steps
          authorId: userData.authorId,
          plotDescription: storyText || null, // Store any initial text content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create story');
      }

      const { story } = await response.json();
      
      // Store the story ID in localStorage for use in subsequent steps
      localStorage.setItem('currentStoryId', story.storyId);
      
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
                        placeholder="Once upon a time... Let your imagination run wild! Share your adventure, your dreams, or any story that's close to your heart."
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                      />
                      <label className="label">
                        <span className="label-text-alt">Write as much or as little as you'd like. You can always edit this later!</span>
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
                      <div className="text-center space-y-4">
                        <div className="card bg-base-200">
                          <div className="card-body">
                            <img
                              src={imagePreview}
                              alt="Uploaded story image"
                              className="w-full max-w-md mx-auto rounded-lg"
                            />
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
                    <div>
                      <p className="text-blue-800 font-medium">
                        Prefer structured guidance? Continue, and we'll prompt you for each detail separately!
                      </p>
                      <p className="text-blue-600 text-sm mt-1">
                        Don't worry if you haven't filled everything out perfectly. The next steps will help you refine and enhance your story.
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
                  nextLabel={isCreatingStory ? "Creating Story..." : (hasContent() ? "Continue with Story" : "Next Chapter")}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
