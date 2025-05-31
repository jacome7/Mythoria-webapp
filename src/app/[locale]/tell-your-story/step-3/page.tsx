'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '../../../../components/StepNavigation';
import CharacterCard from '../../../../components/CharacterCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentStoryId, setStep3Data, Character, hasValidStorySession } from '../../../../lib/story-session';

export default function Step3Page() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Check if we have a valid story session
    if (!hasValidStorySession()) {
      router.push('/tell-your-story/step-1');
      return;
    }

    const storyId = getCurrentStoryId();
    setCurrentStoryId(storyId);
    
    if (storyId) {
      fetchCharacters();
    }
  }, [router]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/characters');
      
      if (!response.ok) {
        throw new Error('Failed to fetch characters');
      }
      
      const data = await response.json();
      setCharacters(data.characters || []);
      
    } catch (error) {
      console.error('Error fetching characters:', error);
      alert('Failed to load characters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async (characterData: Character) => {
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(characterData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create character');
      }

      const { character } = await response.json();
      
      // Add character to story if we have a story ID
      if (currentStoryId) {
        await addCharacterToStory(character.characterId, characterData.role);
      }
      
      setCharacters(prev => [...prev, character]);
      setShowCreateForm(false);
      
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
    }
  };

  const addCharacterToStory = async (characterId: string, role?: string) => {
    if (!currentStoryId) return;

    try {
      const response = await fetch(`/api/stories/${currentStoryId}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId, role }),
      });

      if (!response.ok) {
        console.warn('Failed to link character to story');
      }
    } catch (error) {
      console.warn('Error linking character to story:', error);
    }
  };

  const handleUpdateCharacter = async (characterData: Character) => {
    if (!characterData.characterId) return;

    try {
      const response = await fetch(`/api/characters/${characterData.characterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(characterData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update character');
      }

      const { character } = await response.json();
      
      setCharacters(prev => 
        prev.map(c => c.characterId === character.characterId ? character : c)
      );
      setEditingCharacterId(null);
      
    } catch (error) {
      console.error('Error updating character:', error);
      throw error;
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete character');
      }

      setCharacters(prev => prev.filter(c => c.characterId !== characterId));
      
    } catch (error) {
      console.error('Error deleting character:', error);
      throw error;
    }
  };

  const handleNextStep = async () => {
    try {
      setIsNavigating(true);
      
      // Save step 3 data to localStorage
      setStep3Data({ characters });
      
      // Navigate to step 4
      router.push('/tell-your-story/step-4');
      
    } catch (error) {
      console.error('Error navigating to next step:', error);
      alert('Failed to continue. Please try again.');
    } finally {
      setIsNavigating(false);
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
                <li className="step" data-content="4"></li>
                <li className="step" data-content="5"></li>
                <li className="step" data-content="6"></li>
                <li className="step" data-content="7"></li>
              </ul>
            </div>

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">Chapter 3 - The Characters</h1>
                
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-600 text-lg">
                    Who are the heroes, friends, and magical creatures in your story? 
                    Create characters that will bring your adventure to life!
                  </p>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">Loading your characters...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Existing Characters */}
                    {characters.map((character) => (
                      <CharacterCard
                        key={character.characterId}
                        character={character}
                        mode={editingCharacterId === character.characterId ? 'edit' : 'view'}
                        onSave={handleUpdateCharacter}
                        onEdit={() => setEditingCharacterId(character.characterId!)}
                        onDelete={() => handleDeleteCharacter(character.characterId!)}
                        onCancel={() => setEditingCharacterId(null)}
                      />
                    ))}

                    {/* Create New Character Form */}
                    {showCreateForm && (
                      <CharacterCard
                        mode="create"
                        onSave={handleCreateCharacter}
                        onEdit={() => {}}
                        onDelete={async () => {}}
                        onCancel={() => setShowCreateForm(false)}
                      />
                    )}

                    {/* Add Character Button */}
                    {!showCreateForm && (
                      <div className="text-center">
                        <button
                          className="btn btn-primary btn-lg"
                          onClick={() => setShowCreateForm(true)}
                        >
                          ➕ Add Character
                        </button>
                      </div>
                    )}

                    {/* Guidance Message */}
                    {characters.length === 0 && !showCreateForm && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                        <div className="text-4xl mb-4">🎭</div>
                        <h3 className="text-xl font-semibold text-blue-800 mb-2">
                          Ready to meet your characters?
                        </h3>
                        <p className="text-blue-600">                          Every great story needs amazing characters! Click &quot;Add Character&quot; to create 
                          the heroes, friends, and magical beings that will make your story unforgettable.
                        </p>
                      </div>
                    )}

                    {/* Helpful Tips */}
                    {characters.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">💡</div>
                          <div>
                            <p className="text-green-800 font-medium">
                              Great work! You&apos;ve created {characters.length} character{characters.length === 1 ? '' : 's'}.
                            </p>
                            <p className="text-green-600 text-sm mt-1">
                              You can always add more characters later or continue to the next chapter to develop your story further.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <StepNavigation 
                  currentStep={3}
                  totalSteps={7}
                  nextHref={null} // We'll handle navigation programmatically
                  prevHref={null} // Disabled - don't allow going back to step 2
                  nextDisabled={isNavigating}
                  onNext={handleNextStep}
                  nextLabel={isNavigating ? "Continuing..." : "Next Chapter"}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
