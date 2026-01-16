'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FiPlus } from 'react-icons/fi';
import CharacterCard from './CharacterCard';
import { Character } from '../lib/story-session';

// Extend Character type to include createdAt from the API response
interface CharacterWithDate extends Character {
  createdAt: string;
}

export default function MyCharactersTable() {
  const tMyCharactersPage = useTranslations('MyCharactersPage');
  const locale = useLocale();
  const [characters, setCharacters] = useState<CharacterWithDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<CharacterWithDate | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<CharacterWithDate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await fetch('/api/characters');
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteClick = async (character: CharacterWithDate) => {
    setCharacterToDelete(character);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!characterToDelete) return;

    try {
      const response = await fetch(`/api/characters/${characterToDelete.characterId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCharacters(characters.filter((c) => c.characterId !== characterToDelete.characterId));
        setDeleteModalOpen(false);
        setCharacterToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  };

  const handleCreateCharacter = async (characterData: Character) => {
    try {
      const { photoDataUrl, requestPhotoAnalysis, ...characterBody } = characterData;
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(characterBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create character');
      }

      const { character } = await response.json();

      let enrichedCharacter = character;

      if (character.characterId && photoDataUrl) {
        const uploadResponse = await fetch('/api/media/character-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ characterId: character.characterId, dataUrl: photoDataUrl }),
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload photo');
        }

        enrichedCharacter = uploadResult.character || {
          ...character,
          photoUrl: uploadResult.photoUrl,
          photoGcsUri: uploadResult.photoGcsUri,
        };

        if (requestPhotoAnalysis) {
          const analysisResponse = await fetch('/api/media/analyze-character-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterId: enrichedCharacter.characterId,
              dataUrl: photoDataUrl,
              locale,
            }),
          });

          const analysisResult = await analysisResponse.json();

          if (!analysisResponse.ok || !analysisResult.success) {
            throw new Error(analysisResult.error || 'Failed to analyze photo');
          }

          enrichedCharacter = {
            ...enrichedCharacter,
            physicalDescription: analysisResult.description,
          };

          const descriptionUpdate = await fetch(
            `/api/characters/${enrichedCharacter.characterId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...enrichedCharacter,
                physicalDescription: analysisResult.description,
              }),
            },
          );

          if (descriptionUpdate.ok) {
            const updated = await descriptionUpdate.json();
            enrichedCharacter = updated.character;
          }
        }
      }

      setCharacters((prev) => [...prev, enrichedCharacter]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
    }
  };

  const handleUpdateCharacter = async (characterData: Character) => {
    if (!characterData.characterId) return;

    try {
      const { photoDataUrl, requestPhotoAnalysis, ...characterBody } = characterData;
      const response = await fetch(`/api/characters/${characterData.characterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(characterBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update character');
      }

      const { character } = await response.json();

      setCharacters((prev) =>
        prev.map((c) => (c.characterId === character.characterId ? character : c)),
      );
      setEditingCharacter(null);
    } catch (error) {
      console.error('Error updating character:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (characters.length === 0 && !showCreateForm) {
    return (
      <div className="text-center py-16 bg-base-200 rounded-lg">
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-4xl mb-4">🎭</div>
          <h2 className="text-2xl font-semibold text-base-content">
            {tMyCharactersPage('noCharacters.title') || 'No characters yet!'}
          </h2>
          <p className="text-base-content/70">
            {tMyCharactersPage('noCharacters.subtitle') ||
              'Start creating characters for your stories to see them here.'}
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setShowCreateForm(true)}>
            <FiPlus className="w-5 h-5 mr-2" />
            {tMyCharactersPage('createCharacter') || 'Create Character'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Character Button */}
      {!showCreateForm && !editingCharacter && (
        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            <FiPlus className="w-5 h-5 mr-2" />
            {tMyCharactersPage('createCharacter') || 'Create Character'}
          </button>
        </div>
      )}

      {/* Character Cards */}
      <div className="space-y-6">
        {' '}
        {/* Existing Characters */}
        {characters.map((character) => (
          <CharacterCard
            key={character.characterId}
            character={character}
            mode={editingCharacter?.characterId === character.characterId ? 'edit' : 'view'}
            onSave={handleUpdateCharacter}
            onEdit={() => setEditingCharacter(character)}
            onDelete={async () => handleDeleteClick(character)}
            onCancel={() => setEditingCharacter(null)}
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {tMyCharactersPage('deleteConfirm.title') || 'Delete Character'}
            </h3>
            <p className="py-4">
              {tMyCharactersPage('deleteConfirm.message') ||
                'Are you sure you want to delete this character? This action cannot be undone.'}
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteModalOpen(false)}>
                {tMyCharactersPage('deleteConfirm.cancel') || 'Cancel'}
              </button>
              <button className="btn btn-error" onClick={handleDeleteConfirm}>
                {tMyCharactersPage('deleteConfirm.confirm') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
