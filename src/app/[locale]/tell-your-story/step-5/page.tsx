'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentStoryId, hasValidStorySession } from '../../../../lib/story-session';

interface StoryData {
  storyId: string;
  title: string;
  features?: {
    ebook?: boolean;
    printed?: boolean;
    audiobook?: boolean;
  };
  deliveryAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    stateRegion?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
  dedicationMessage?: string;
}

interface PricingData {
  ebook: { name: string; credits: number; description: string; mandatory: boolean; default: boolean };
  printed: { name: string; credits: number; description: string; mandatory: boolean; default: boolean };
  audiobook: { name: string; credits: number; description: string; mandatory: boolean; default: boolean };
}

interface StoryUpdateData {
  features: {
    ebook: boolean;
    printed: boolean;
    audiobook: boolean;
  };
  dedicationMessage: string | null;
  deliveryAddress?: {
    line1: string;
    line2: string;
    city: string;
    stateRegion: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}

export default function Step5Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  
  // User credits state
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  
  // Pricing data state
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  
  // Form data
  const [selectedFeatures, setSelectedFeatures] = useState({
    ebook: true, // Default and mandatory
    printed: false,
    audiobook: false,
  });
  
  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    country: '',
    phone: '',
  });
  
  const [dedicationMessage, setDedicationMessage] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  useEffect(() => {
    // Check if we have a valid story session
    if (!hasValidStorySession()) {
      router.push('/tell-your-story/step-1');
      return;
    }

    const storyId = getCurrentStoryId();
    setCurrentStoryId(storyId);
    
    // Fetch pricing data and story data in parallel
    Promise.all([
      fetchPricingData(),
      storyId ? fetchStoryData(storyId) : Promise.resolve(),
      fetchUserCredits()
    ]).finally(() => {
      setLoading(false);
    });
  }, [router]);

  const fetchPricingData = async () => {
    try {
      const response = await fetch('/api/pricing');
      if (!response.ok) {
        throw new Error('Failed to fetch pricing data');
      }
      const data = await response.json();
      setPricingData(data.deliveryOptions);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      setError('Failed to load pricing information. Please try again.');
    }
  };
  const fetchStoryData = async (storyId: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/my-stories/${storyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch story data');
      }
      
      const data = await response.json();
      const story: StoryData = data.story;
      
      // Pre-populate form fields
      if (story.features) {
        setSelectedFeatures({
          ebook: story.features.ebook ?? true,
          printed: story.features.printed ?? false,
          audiobook: story.features.audiobook ?? false,
        });
        setShowAddressForm(story.features.printed ?? false);
      }
      
      if (story.deliveryAddress) {
        setDeliveryAddress({
          line1: story.deliveryAddress.line1 || '',
          line2: story.deliveryAddress.line2 || '',
          city: story.deliveryAddress.city || '',
          stateRegion: story.deliveryAddress.stateRegion || '',
          postalCode: story.deliveryAddress.postalCode || '',
          country: story.deliveryAddress.country || '',
          phone: story.deliveryAddress.phone || '',
        });
      }
      
      setDedicationMessage(story.dedicationMessage || '');
      
    } catch (error) {
      console.error('Error fetching story data:', error);
      setError('Failed to load story information. Please try again.');
    }
  };

  const fetchUserCredits = async () => {
    try {
      const response = await fetch('/api/my-credits');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user credits');
      }
      
      const data = await response.json();
      setUserCredits(data.currentBalance || 0);
      
    } catch (error) {
      console.error('Error fetching user credits:', error);
      // Don't set error state for credits as it's not critical for the page to load
    }
  };

  const handleFeatureChange = (feature: 'ebook' | 'printed' | 'audiobook', checked: boolean) => {
    if (feature === 'ebook') return; // ebook is mandatory
    
    setSelectedFeatures(prev => ({
      ...prev,
      [feature]: checked
    }));
    
    if (feature === 'printed') {
      setShowAddressForm(checked);
      if (!checked) {
        // Clear address when printed book is deselected
        setDeliveryAddress({
          line1: '',
          line2: '',
          city: '',
          stateRegion: '',
          postalCode: '',
          country: '',
          phone: '',
        });
      }
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setDeliveryAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const calculateTotalCredits = () => {
    if (!pricingData) return 0;
    
    let total = 0;
    if (selectedFeatures.ebook) total += pricingData.ebook.credits;
    if (selectedFeatures.printed) total += pricingData.printed.credits;
    if (selectedFeatures.audiobook) total += pricingData.audiobook.credits;
    
    return total;
  };

  const hasInsufficientCredits = () => {
    return userCredits < calculateTotalCredits();
  };

  const handleBuyMoreCredits = () => {
    setShowBuyCreditsModal(true);
  };

  const validateForm = () => {
    if (selectedFeatures.printed && showAddressForm) {
      if (!deliveryAddress.line1.trim() || 
          !deliveryAddress.city.trim() || 
          !deliveryAddress.postalCode.trim() || 
          !deliveryAddress.country.trim()) {
        return 'Please fill in all required address fields for printed book delivery.';
      }
    }
    return null;
  };
  const handleNext = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!currentStoryId) {
      setError('No story found. Please start from step 1.');
      return;
    }

    if (hasInsufficientCredits()) {
      setError('You have insufficient credits. Please purchase more credits to continue.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // First, deduct credits for the selected services
      const creditsResponse = await fetch(`/api/stories/${currentStoryId}/deduct-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: currentStoryId,
          selectedFeatures: selectedFeatures
        }),
      });

      if (!creditsResponse.ok) {
        const creditsError = await creditsResponse.json();
        throw new Error(creditsError.error || 'Failed to deduct credits');
      }

      const creditsResult = await creditsResponse.json();
      console.log('Credits deducted successfully:', creditsResult);

      // Update local credit balance
      setUserCredits(creditsResult.newBalance);

      // Then save the story delivery preferences
      const updateData: StoryUpdateData = {
        features: selectedFeatures,
        dedicationMessage: dedicationMessage.trim() || null,
      };

      // Only include delivery address if printed book is selected
      if (selectedFeatures.printed && showAddressForm) {
        updateData.deliveryAddress = deliveryAddress;
      }

      const response = await fetch(`/api/my-stories/${currentStoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to save delivery preferences');
      }

      // Navigate to next step after successful save
      router.push('/tell-your-story/step-6');
      
    } catch (error) {
      console.error('Error processing order:', error);
      setError(`Failed to process your order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
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
                <li className="step step-primary" data-content="3"></li>
                <li className="step step-primary" data-content="4"></li>
                <li className="step step-primary" data-content="5"></li>
                <li className="step" data-content="6"></li>
                <li className="step" data-content="7"></li>
              </ul>
            </div>

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">Chapter 5 - The Gift</h1>
                  {loading || !pricingData ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">Loading your story details and pricing...</p>
                  </div>
                ) : (<div className="space-y-6">
                    <div className="prose max-w-none mb-6">
                      <p className="text-gray-600">
                        Choose how you&apos;d like to receive your story. You can select multiple delivery formats to enjoy your story in different ways.
                      </p>
                    </div>

                    {error && (
                      <div className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Delivery Options */}
                    {pricingData && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold mb-4">Delivery Options</h2>
                        
                        {/* Digital (ebook) - Mandatory */}
                        <div className="card bg-base-200">
                          <div className="card-body">
                            <div className="form-control">
                              <label className="label cursor-pointer">
                                <div className="flex-1">
                                  <span className="label-text font-semibold text-lg">
                                    {pricingData.ebook.name}
                                    <span className="badge badge-primary ml-2">Mandatory</span>
                                  </span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {pricingData.ebook.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-primary">{pricingData.ebook.credits} credits</span>
                                  <input 
                                    type="checkbox" 
                                    checked={true}
                                    disabled={true}
                                    className="checkbox checkbox-primary" 
                                  />
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Printed Book */}
                        <div className="card bg-base-100 border">
                          <div className="card-body">
                            <div className="form-control">
                              <label className="label cursor-pointer">
                                <div className="flex-1">
                                  <span className="label-text font-semibold text-lg">
                                    {pricingData.printed.name}
                                  </span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {pricingData.printed.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-primary">{pricingData.printed.credits} credits</span>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedFeatures.printed}
                                    onChange={(e) => handleFeatureChange('printed', e.target.checked)}
                                    className="checkbox checkbox-primary" 
                                  />
                                </div>
                              </label>
                            </div>                            
                            {/* Address Form - Show when printed book is selected */}
                            {showAddressForm && selectedFeatures.printed && (
                              <div className="mt-4 pt-4 border-t">
                                <h3 className="font-semibold mb-3">Delivery Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="form-control md:col-span-2">
                                    <label className="label">
                                      <span className="label-text">Address Line 1 *</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryAddress.line1}
                                      onChange={(e) => handleAddressChange('line1', e.target.value)}
                                      placeholder="Street address, P.O. box"
                                      className="input input-bordered w-full"
                                      required
                                    />
                                  </div>
                                  
                                  <div className="form-control md:col-span-2">
                                    <label className="label">
                                      <span className="label-text">Address Line 2</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryAddress.line2}
                                      onChange={(e) => handleAddressChange('line2', e.target.value)}
                                      placeholder="Apartment, suite, unit, building"
                                      className="input input-bordered w-full"
                                    />
                                  </div>
                                  
                                  <div className="form-control">
                                    <label className="label">
                                      <span className="label-text">City *</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryAddress.city}
                                      onChange={(e) => handleAddressChange('city', e.target.value)}
                                      placeholder="City"
                                      className="input input-bordered w-full"
                                      required
                                    />
                                  </div>
                                  
                                  <div className="form-control">
                                    <label className="label">
                                      <span className="label-text">State/Region</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryAddress.stateRegion}
                                      onChange={(e) => handleAddressChange('stateRegion', e.target.value)}
                                      placeholder="State or Region"
                                      className="input input-bordered w-full"
                                    />
                                  </div>
                                  
                                  <div className="form-control">
                                    <label className="label">
                                      <span className="label-text">Postal Code *</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryAddress.postalCode}
                                      onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                                      placeholder="Postal/ZIP code"
                                      className="input input-bordered w-full"
                                      required
                                    />
                                  </div>
                                  
                                  <div className="form-control">
                                    <label className="label">
                                      <span className="label-text">Country *</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryAddress.country}
                                      onChange={(e) => handleAddressChange('country', e.target.value)}
                                      placeholder="Country"
                                      className="input input-bordered w-full"
                                      required
                                    />
                                  </div>
                                  
                                  <div className="form-control md:col-span-2">
                                    <label className="label">
                                      <span className="label-text">Phone Number</span>
                                    </label>
                                    <input
                                      type="tel"
                                      value={deliveryAddress.phone}
                                      onChange={(e) => handleAddressChange('phone', e.target.value)}
                                      placeholder="Phone number for delivery contact"
                                      className="input input-bordered w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Audiobook */}
                        <div className="card bg-base-100 border">
                          <div className="card-body">
                            <div className="form-control">
                              <label className="label cursor-pointer">
                                <div className="flex-1">
                                  <span className="label-text font-semibold text-lg">
                                    {pricingData.audiobook.name}
                                  </span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {pricingData.audiobook.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-primary">{pricingData.audiobook.credits} credits</span>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedFeatures.audiobook}
                                    onChange={(e) => handleFeatureChange('audiobook', e.target.checked)}
                                    className="checkbox checkbox-primary" 
                                  />
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dedication Message */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Dedication Message</span>
                        <span className="label-text-alt">Optional</span>
                      </label>
                      <textarea
                        value={dedicationMessage}
                        onChange={(e) => setDedicationMessage(e.target.value)}
                        placeholder="Write a personalized dedication message for the first page of your book..."
                        className="textarea textarea-bordered h-24 w-full"
                        rows={4}
                      />
                      <label className="label">
                        <span className="label-text-alt">This message will appear on the first page of your story</span>
                      </label>
                    </div>                    {/* Credits Summary */}
                    <div className="space-y-4">
                      {/* User's Available Credits */}
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Your Available Credits:</span>
                            <span className="text-2xl font-bold text-success">{userCredits} credits</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Credits Required */}
                      <div className={`card ${hasInsufficientCredits() ? 'bg-error text-error-content' : 'bg-primary text-primary-content'}`}>
                        <div className="card-body">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Credits Required:</span>
                            <span className="text-2xl font-bold">{calculateTotalCredits()} credits</span>
                          </div>
                          {hasInsufficientCredits() && (
                            <div className="mt-2 text-sm">
                              You need {calculateTotalCredits() - userCredits} more credits to proceed.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Buy More Credits Button */}
                      {hasInsufficientCredits() && (
                        <div className="text-center">
                          <button 
                            onClick={handleBuyMoreCredits}
                            className="btn btn-warning btn-lg"
                          >
                            Buy More Credits
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}                <StepNavigation
                  currentStep={5}
                  totalSteps={7}
                  nextHref="/tell-your-story/step-6"
                  prevHref="/tell-your-story/step-4"
                  onNext={handleNext}
                  nextDisabled={saving || hasInsufficientCredits()}
                  nextLabel={saving ? "Saving..." : hasInsufficientCredits() ? "Insufficient Credits" : "Next Chapter"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buy More Credits Modal */}
        {showBuyCreditsModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Buy More Credits</h3>
              <p className="py-4">
                Credit purchasing functionality is coming soon! Stay tuned for updates.
              </p>
              <div className="modal-action">
                <button 
                  className="btn" 
                  onClick={() => setShowBuyCreditsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowBuyCreditsModal(false)}></div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
