'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentStoryId, hasValidStorySession } from '../../../../lib/story-session';
import pricingConfig from '../../../../config/pricing.json';

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
    
    if (storyId) {
      fetchStoryData(storyId);
    }
  }, [router]);

  const fetchStoryData = async (storyId: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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
    let total = 0;
    const pricing = pricingConfig.deliveryOptions;
    
    if (selectedFeatures.ebook) total += pricing.ebook.credits;
    if (selectedFeatures.printed) total += pricing.printed.credits;
    if (selectedFeatures.audiobook) total += pricing.audiobook.credits;
    
    return total;
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

    setSaving(true);
    setError(null);    try {
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
      console.error('Error saving delivery preferences:', error);
      setError('Failed to save delivery preferences. Please try again.');
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
                
                {loading ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">Loading your story details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
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
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold mb-4">Delivery Options</h2>
                      
                      {/* Digital (ebook) - Mandatory */}
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <div className="flex-1">
                                <span className="label-text font-semibold text-lg">
                                  {pricingConfig.deliveryOptions.ebook.name}
                                  <span className="badge badge-primary ml-2">Mandatory</span>
                                </span>
                                <p className="text-sm text-gray-600 mt-1">
                                  {pricingConfig.deliveryOptions.ebook.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-primary">{pricingConfig.deliveryOptions.ebook.credits} credits</span>
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
                                  {pricingConfig.deliveryOptions.printed.name}
                                </span>
                                <p className="text-sm text-gray-600 mt-1">
                                  {pricingConfig.deliveryOptions.printed.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-primary">{pricingConfig.deliveryOptions.printed.credits} credits</span>
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
                                  {pricingConfig.deliveryOptions.audiobook.name}
                                </span>
                                <p className="text-sm text-gray-600 mt-1">
                                  {pricingConfig.deliveryOptions.audiobook.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-primary">{pricingConfig.deliveryOptions.audiobook.credits} credits</span>
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
                    </div>

                    {/* Total Credits */}
                    <div className="card bg-primary text-primary-content">
                      <div className="card-body">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total Credits Required:</span>
                          <span className="text-2xl font-bold">{calculateTotalCredits()} credits</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <StepNavigation
                  currentStep={5}
                  totalSteps={7}
                  nextHref="/tell-your-story/step-6"
                  prevHref="/tell-your-story/step-4"
                  onNext={handleNext}
                  nextDisabled={saving}
                  nextLabel={saving ? "Saving..." : "Next Chapter"}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
