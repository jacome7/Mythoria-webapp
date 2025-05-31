'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { 
  FiEdit3, 
  FiTrash2,
  FiChevronUp,
  FiChevronDown
} from 'react-icons/fi';

interface Character {
  characterId: string;
  name: string;
  type: string | null;
  passions: string | null;
  superpowers: string | null;
  physicalDescription: string | null;
  photoUrl: string | null;
  createdAt: string;
}

type SortField = 'name' | 'type' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface MyCharactersTableProps {
  authorName: string;
}

export default function MyCharactersTable({ authorName }: MyCharactersTableProps) {
  const t = useTranslations('MyCharactersPage');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const handleDeleteClick = (character: Character) => {
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

  // Sorting functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <FiChevronUp className="w-4 h-4 inline ml-1" /> : 
      <FiChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Sorted characters
  const sortedCharacters = useMemo(() => {
    const sorted = [...characters];

    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = (a.type || '').toLowerCase();
          bValue = (b.type || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [characters, sortField, sortDirection]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (characters.length === 0) {
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>
                <button
                  className="btn btn-ghost btn-sm p-0 h-auto font-medium text-left justify-start"
                  onClick={() => handleSort('name')}
                >
                  {t('table.name') || 'Name'}
                  {getSortIcon('name')}
                </button>
              </th>
              <th>
                <button
                  className="btn btn-ghost btn-sm p-0 h-auto font-medium text-left justify-start"
                  onClick={() => handleSort('type')}
                >
                  {t('table.type') || 'Type'}
                  {getSortIcon('type')}
                </button>
              </th>
              <th className="text-center">{t('table.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedCharacters.map((character) => (
              <tr key={character.characterId}>
                <td className="font-medium">{character.name}</td>
                <td>{character.type || '-'}</td>
                <td>
                  <div className="flex justify-center gap-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        // TODO: Implement edit functionality
                        alert('Edit functionality coming soon!');
                      }}
                      title={t('actions.edit') || 'Edit'}
                    >
                      <FiEdit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content"
                      onClick={() => handleDeleteClick(character)}
                      title={t('actions.delete') || 'Delete'}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
