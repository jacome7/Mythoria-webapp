'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  FiPlus
} from 'react-icons/fi';
import CharacterCard from './CharacterCard';
import { Character } from '../lib/story-session';

// Extend Character type to include createdAt from the API response
interface CharacterWithDate extends Character {
  createdAt: string;
}

export default function MyCharactersTable() {
  const t = useTranslations('MyCharactersPage');  const [characters, setCharacters] = useState<CharacterWithDate[]>([]);
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
  };  const handleDeleteClick = async (character: CharacterWithDate) => {
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
        setCharacters(characters.filter(c => c.characterId !== characterToDelete.characterId));
        setDeleteModalOpen(false);
        setCharacterToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting character:', error);
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
      setCharacters(prev => [...prev, character]);
      setShowCreateForm(false);
      
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
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
      setEditingCharacter(null);
      
    } catch (error) {
      console.error('Error updating character:', error);
      throw error;
    }  };

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
            {t('noCharacters.title') || 'No characters yet!'}
          </h2>
          <p className="text-base-content/70">
            {t('noCharacters.subtitle') || 'Start creating characters for your stories to see them here.'}
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowCreateForm(true)}
          >
            <FiPlus className="w-5 h-5 mr-2" />
            {t('createCharacter') || 'Create Character'}
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
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            <FiPlus className="w-5 h-5 mr-2" />
            {t('createCharacter') || 'Create Character'}
          </button>
        </div>
      )}

      {/* Character Cards */}
      <div className="space-y-6">        {/* Existing Characters */}
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
            <h3 className="font-bold text-lg">{t('deleteConfirm.title') || 'Delete Character'}</h3>
            <p className="py-4">{t('deleteConfirm.message') || 'Are you sure you want to delete this character? This action cannot be undone.'}</p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteModalOpen(false)}
              >
                {t('deleteConfirm.cancel') || 'Cancel'}
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteConfirm}
              >
                {t('deleteConfirm.confirm') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
