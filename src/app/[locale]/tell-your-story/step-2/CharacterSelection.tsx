'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Character {
  characterId: string;
  name: string;
  type?: string;
  role?: string;
}

interface Props {
  onChange: (ids: string[]) => void;
}

export default function CharacterSelection({ onChange }: Props) {
  const t = useTranslations('StorySteps.step2');
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/characters');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.characters) {
            setExistingCharacters(data.characters);
          }
        }
      } catch (error) {
        console.error('Error fetching existing characters:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  const toggle = (id: string) => {
    // Do not call onChange inside the state updater (runs during render) – causes React warning
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    const ids = existingCharacters.map((c) => c.characterId);
    setSelectedIds(ids);
  };

  // Notify parent of selection changes after render commit (safe side-effect phase)
  useEffect(() => {
    onChange(selectedIds);
  }, [selectedIds, onChange]);

  if (existingCharacters.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg">
      <div className="p-4 flex items-center gap-3">
        <span className="text-xl">👥</span>
        <div>
          <h3 className="font-semibold text-gray-800">
            {t('characterSelection.includeExistingTitle')}
          </h3>
          <p className="text-sm text-gray-600">
            {selectedIds.length > 0
              ? t('characterSelection.selectedCount', { count: selectedIds.length })
              : t('characterSelection.noneSelected')}
          </p>
        </div>
      </div>
      <div className="border-t border-gray-200 p-4 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-md"></span>
            <span className="ml-2 text-gray-600">{t('characterSelection.loading')}</span>
          </div>
        ) : (
          <>
            {existingCharacters.length > 1 && (
              <div className="mb-3 pb-3 border-b border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedIds.length === existingCharacters.length}
                    onChange={selectAll}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {t('characterSelection.selectAll', { count: existingCharacters.length })}
                  </span>
                </label>
              </div>
            )}
            <div className="space-y-2">
              {existingCharacters.map((character) => (
                <label
                  key={character.characterId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedIds.includes(character.characterId)}
                    onChange={() => toggle(character.characterId)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{character.name}</div>
                    {(character.type || character.role) && (
                      <div className="text-xs text-gray-500">
                        {[character.type, character.role].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
