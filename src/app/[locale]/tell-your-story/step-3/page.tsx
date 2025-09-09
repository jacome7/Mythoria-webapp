"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import StepNavigation from '@/components/StepNavigation';
import CharacterCard from '@/components/CharacterCard';
import ProgressIndicator from '@/components/ProgressIndicator';
import { trackStoryCreation } from '@/lib/analytics';
import {
  setStep3Data,
  Character,
  loadExistingStoryData,
  setEditMode,
  isEditMode,
} from '@/lib/story-session';
import { useStorySessionGuard } from '@/hooks/useStorySessionGuard';

export default function Step3PageWrapper() {
  return (
    <Suspense>
      <Step3Page />
    </Suspense>
  );
}

function Step3Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editStoryId = searchParams?.get('edit') ?? null;
  const tStoryStepsStep3 = useTranslations('StorySteps.step3');
  const tCharacters = useTranslations('Characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(
    null,
  );
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInEditMode, setIsInEditMode] = useState(false); // Helper function to format role names for display
  const sessionStoryId = useStorySessionGuard({ enabled: !editStoryId });
  const formatRoleName = (role: string): string => {
    const roleMap: Record<string, string> = {
      protagonist: "protagonist",
      antagonist: "antagonist",
      supporting: "supporting",
      mentor: "mentor",
      comic_relief: "comicRelief",
      love_interest: "loveInterest",
      sidekick: "sidekick",
      narrator: "narrator",
      other: "other",
    };

    const roleKey = `roles.${roleMap[role] || "other"}`;
    const translated = tCharacters(roleKey);
    // If no translation found, fall back to formatted version
    if (translated === roleKey) {
      return role
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return translated;
  };

  // Helper function to get type display value
  const getTypeDisplayValue = (typeValue: string) => {
    const typeMap: Record<string, string> = {
      Boy: "boy",
      Girl: "girl",
      Baby: "baby",
      Man: "man",
      Woman: "woman",
      Human: "human",
      Dog: "dog",
      Dragon: "dragon",
      "Fantasy Creature": "fantasyCreature",
      Animal: "animal",
      Other: "other",
    };

    const typeKey = `types.${typeMap[typeValue] || "other"}`;
    const translated = tCharacters(typeKey);
    // If no translation found, fall back to original value
    if (translated === typeKey) {
      return typeValue;
    }
    return translated;
  };

  const fetchStoryCharacters = useCallback(
    async (storyId?: string) => {
      const targetStoryId = storyId || currentStoryId;
      if (!targetStoryId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `/api/stories/${targetStoryId}/characters`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch story characters");
        }

        const data = await response.json();
        // Transform the data structure to match our expected format
        const transformedCharacters =
          data.characters?.map(
            (item: { character: Character; role: string }) => ({
              ...item.character,
              role: item.role, // Use the role from the story-character relationship
            }),
          ) || [];

        setCharacters(transformedCharacters);
      } catch (error) {
        console.error("Error fetching story characters:", error);
        alert(tStoryStepsStep3("alerts.failedToLoadStoryCharacters"));
      } finally {
        setLoading(false);
      }
    },
    [currentStoryId, tStoryStepsStep3],
  );

  const fetchAvailableCharacters = useCallback(
    async (storyId?: string) => {
      const targetStoryId = storyId || currentStoryId;
      if (!targetStoryId) return;

      try {
        const response = await fetch(
          `/api/stories/${targetStoryId}/available-characters`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch available characters');
        }

        const data = await response.json();
        setAvailableCharacters(data.characters || []);
      } catch (error) {
        console.error('Error fetching available characters:', error);
        // Don't show alert for this as it's not critical
      }
    },
    [currentStoryId],
  );
  useEffect(() => {
    const initializeStoryData = async () => {
      if (editStoryId) {
        try {
          setLoading(true);
          setIsInEditMode(true);
          setEditMode(true);

          // Load existing story data
          const success = await loadExistingStoryData(editStoryId);
          if (!success) {
            alert(tStoryStepsStep3('alerts.failedToLoadStoryData'));
            router.push('/my-stories');
            return;
          }

          // Set the current story ID
          setCurrentStoryId(editStoryId);

          // Fetch the story's characters
          await fetchStoryCharacters(editStoryId);
          await fetchAvailableCharacters(editStoryId);
        } catch (error) {
          console.error('Error initializing edit mode:', error);
          alert(tStoryStepsStep3('alerts.failedToLoadStoryForEditing'));
          router.push('/my-stories');
          return;
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!sessionStoryId) return;

      setCurrentStoryId(sessionStoryId);
      setIsInEditMode(isEditMode());

      fetchStoryCharacters(sessionStoryId);
      fetchAvailableCharacters(sessionStoryId);
      setLoading(false);
    };

    initializeStoryData();
  }, [
    router,
    editStoryId,
    sessionStoryId,
    fetchStoryCharacters,
    fetchAvailableCharacters,
    tStoryStepsStep3,
  ]);
  const handleCreateCharacter = async (characterData: Character) => {
    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(characterData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create character");
      }

      const { character } = await response.json();

      // Add character to story if we have a story ID
      if (currentStoryId) {
        await addCharacterToStory(character.characterId, characterData.role);
      }

      setCharacters((prev) => [
        ...prev,
        { ...character, role: characterData.role },
      ]);
      setShowCreateForm(false);
      setShowAddOptions(false);
    } catch (error) {
      console.error("Error creating character:", error);
      throw error;
    }
  };
  const addCharacterToStory = async (characterId: string, role?: string) => {
    if (!currentStoryId) return;

    try {
      const response = await fetch(
        `/api/stories/${currentStoryId}/characters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ characterId, role }),
        },
      );

      if (!response.ok) {
        console.warn("Failed to link character to story");
      }
    } catch (error) {
      console.warn("Error linking character to story:", error);
    }
  };

  const handleAddExistingCharacter = async (character: Character) => {
    try {
      // Add character to story with their current role or default to protagonist
      await addCharacterToStory(
        character.characterId!,
        character.role || "protagonist",
      );

      // Add to local state
      setCharacters((prev) => [...prev, character]);

      // Remove from available characters
      setAvailableCharacters((prev) =>
        prev.filter((c) => c.characterId !== character.characterId),
      );

      setShowAddOptions(false);
    } catch (error) {
      console.error("Error adding existing character:", error);
      alert(tStoryStepsStep3("alerts.failedToAddCharacter"));
    }
  };

  const handleUpdateCharacter = async (characterData: Character) => {
    if (!characterData.characterId) return;

    try {
      const response = await fetch(
        `/api/characters/${characterData.characterId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(characterData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update character");
      }

      const { character } = await response.json();

      setCharacters((prev) =>
        prev.map((c) =>
          c.characterId === character.characterId ? character : c,
        ),
      );
      setEditingCharacterId(null);
    } catch (error) {
      console.error("Error updating character:", error);
      throw error;
    }
  };
  const handleDeleteCharacter = async (characterId: string) => {
    if (!currentStoryId) {
      console.error("No current story ID available");
      return;
    }

    try {
      const response = await fetch(
        `/api/stories/${currentStoryId}/characters/${characterId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to remove character from story",
        );
      }

      // Remove character from the current story's character list
      setCharacters((prev) =>
        prev.filter((c) => c.characterId !== characterId),
      );

      // Add the character back to available characters list (since it's no longer associated with this story)
      const removedCharacter = characters.find(
        (c) => c.characterId === characterId,
      );
      if (removedCharacter) {
        setAvailableCharacters((prev) => [...prev, removedCharacter]);
      }
    } catch (error) {
      console.error("Error removing character from story:", error);
      throw error;
    }
  };
  const handleNextStep = async () => {
    try {
      setIsNavigating(true);
      // Save step 3 data to localStorage
      setStep3Data({ characters });
      // Track step 3 completion
      trackStoryCreation.step3Completed({
        step: 3,
        story_id: currentStoryId || undefined,
        character_count: characters.length,
        edit_mode: isInEditMode,
      });

      if (isInEditMode && editStoryId) {
        // In edit mode, pass the edit parameter to the next step
        router.push(`/tell-your-story/step-4?edit=${editStoryId}`);
      } else {
        // Normal flow - navigate to step 4
        router.push("/tell-your-story/step-4");
      }
    } catch (error) {
      console.error("Error navigating to next step:", error);
      alert(tStoryStepsStep3("alerts.failedToContinue"));
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
            <ProgressIndicator currentStep={3} totalSteps={5} />

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="card-title text-3xl">
                    {tStoryStepsStep3("heading")}
                  </h1>
                  {isInEditMode && (
                    <div className="badge badge-info">
                      {tStoryStepsStep3("badges.editingDraft")}
                    </div>
                  )}
                </div>

                <div className="prose max-w-none mb-6">
                  <p className="text-gray-600 text-lg">
                    {tStoryStepsStep3("intro")}
                  </p>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">
                      {tStoryStepsStep3("loadingCharacters")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Existing Characters */}
                    {characters.map((character) => (
                      <CharacterCard
                        key={character.characterId}
                        character={character}
                        mode={
                          editingCharacterId === character.characterId
                            ? "edit"
                            : "view"
                        }
                        onSave={handleUpdateCharacter}
                        onEdit={() =>
                          setEditingCharacterId(character.characterId!)
                        }
                        onDelete={() =>
                          handleDeleteCharacter(character.characterId!)
                        }
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

                    {/* Add Character Button/Options */}
                    {!showCreateForm && (
                      <div className="text-center">
                        {!showAddOptions ? (
                          <button
                            className="btn btn-primary btn-lg"
                            onClick={() => setShowAddOptions(true)}
                          >
                            {tStoryStepsStep3("addCharacter")}
                          </button>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-lg font-semibold">
                              {tStoryStepsStep3("chooseMethod")}
                            </div>
                            {/* Create New Character Option */}
                            <button
                              className="btn btn-primary btn-lg w-full"
                              onClick={() => {
                                setShowCreateForm(true);
                                setShowAddOptions(false);
                              }}
                            >
                              {tStoryStepsStep3("createNew")}
                            </button>
                            {/* Add Existing Character Option (only if available characters exist) */}{" "}
                            {availableCharacters.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm text-gray-600">
                                  {tStoryStepsStep3("orChooseExisting")}
                                </div>
                                <div className="dropdown dropdown-end w-full">
                                  <div
                                    tabIndex={0}
                                    role="button"
                                    className="btn btn-outline btn-lg w-full"
                                  >
                                    {tStoryStepsStep3("useExisting")}
                                  </div>
                                  <ul
                                    tabIndex={0}
                                    className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow-lg border max-h-60 overflow-y-auto"
                                  >
                                    {availableCharacters.map((character) => (
                                      <li key={character.characterId}>
                                        <button
                                          className="text-left w-full p-3 hover:bg-base-200"
                                          onClick={() =>
                                            handleAddExistingCharacter(
                                              character,
                                            )
                                          }
                                        >
                                          {" "}
                                          <div>
                                            <div className="font-semibold">
                                              {character.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {getTypeDisplayValue(
                                                character.type || "",
                                              )}{" "}
                                              • {tCharacters("fields.role")}:{" "}
                                              {formatRoleName(
                                                character.role || "protagonist",
                                              )}
                                            </div>
                                            {character.characteristics && (
                                              <div className="text-xs text-gray-400 mt-1">
                                                {character.characteristics
                                                  .length > 50
                                                  ? `${character.characteristics.substring(0, 50)}...`
                                                  : character.characteristics}
                                              </div>
                                            )}
                                          </div>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                            {/* Cancel Option */}
                            <button
                              className="btn btn-ghost"
                              onClick={() => setShowAddOptions(false)}
                            >
                              {tStoryStepsStep3("cancel")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Guidance Message */}
                    {characters.length === 0 &&
                      !showCreateForm &&
                      !showAddOptions && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                          <div className="text-4xl mb-4">🎭</div>
                          <h3 className="text-xl font-semibold text-blue-800 mb-2">
                            {tStoryStepsStep3("readyTitle")}
                          </h3>
                          <p className="text-blue-600">
                            {tStoryStepsStep3("readyDescription")}
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
                              {tStoryStepsStep3("greatWork", {
                                count: characters.length,
                              })}
                            </p>
                            <p className="text-green-600 text-sm mt-1">
                              {tStoryStepsStep3("youCanAlways")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <StepNavigation
                  currentStep={3}
                  totalSteps={5}
                  nextHref={null} // We'll handle navigation programmatically
                  prevHref={isInEditMode ? "/my-stories" : null} // In edit mode, allow going back to my-stories
                  nextDisabled={isNavigating}
                  onNext={handleNextStep}
                  nextLabel={
                    isNavigating
                      ? tStoryStepsStep3("continuing")
                      : tStoryStepsStep3("next")
                  }
                  prevLabel={isInEditMode ? "Back to My Stories" : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
