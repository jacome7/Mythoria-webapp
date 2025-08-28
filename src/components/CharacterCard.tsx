'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { trackStoryCreation } from '../lib/analytics';
import { Character } from '../lib/story-session';
import { 
  getCharacterRoleOptions,
  getCharacterAgeOptions,
  getCharacterTraitOptions,
  CharacterType,
  CharacterTrait
} from '../types/character-enums';
import GroupedCharacterTypeSelect from './GroupedCharacterTypeSelect';
import RollableHints from './RollableHints';

// Translation keys for hints (mapped at render time)
const CHARACTERISTIC_HINT_KEYS = [
  'adjusts_glasses_when_thinking',
  'hums_softly',
  'cracks_knuckles_when_stressed',
  'fidgets_with_hair_or_clothes',
  'speaks_with_filler_words',
  'mutters_to_self',
  'avoids_eye_contact',
  'blinks_rapidly_under_stress',
  'always_sipping_a_drink',
  'winks_at_others',
  'refuses_public_restrooms',
  'eats_snacks_constantly',
  'obsesses_over_cleanliness',
  'mentions_horoscopes_or_superstitions',
  'uses_sophisticated_words',
  'taps_foot_or_finger'
];

const PHYSICAL_DESCRIPTION_HINT_KEYS = [
  'long_curly_hair',
  'wears_thin_rimmed_glasses',
  'freckled_cheeks',
  'scar_across_left_eyebrow',
  'broad_shouldered_build',
  'petite_frame',
  'vivid_green_eyes',
  'sun_creased_smile_lines',
  'shaved_head',
  'tall_and_lanky',
  'weather_beaten_skin',
  'tattoo_sleeve',
  'lean_muscular_arms',
  'hunched_posture',
  'pale_skin_with_dark_circles'
];

interface CharacterCardProps {
  character?: Character;
  mode: 'create' | 'edit' | 'view';
  onSave: (character: Character) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onCancel?: () => void;
}

export default function CharacterCard({
  character,
  mode,
  onSave,
  onEdit,
  onDelete,
  onCancel
}: CharacterCardProps) {
  const tCharacters = useTranslations('Characters');

  // Function to format role names for display
  const formatRoleName = (role: string): string => {
    const roleKey = `roles.${role}`;
    const translated = tCharacters(roleKey);
    if (translated === roleKey) {
      return role
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return translated;
  };

  // Helper function to get translated trait name
  const getTraitDisplayName = (trait: string): string => {
    const traitKey = `traits.${trait}`;
    const translated = tCharacters(traitKey);
    if (translated === traitKey) {
      return trait.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return translated;
  };

  const characterRoles = getCharacterRoleOptions(tCharacters);
  
  // Get age options based on character type
  const getAgeOptions = () => {
    if (!formData.type) return [];
    return getCharacterAgeOptions(tCharacters, formData.type as CharacterType);
  };  const [formData, setFormData] = useState<Character>({
    name: character?.name || '',
    type: character?.type || 'boy',
    role: character?.role || 'protagonist',
    age: character?.age || '', // Add age field with empty default
    traits: character?.traits || [], // Add traits field with empty array default
    characteristics: character?.characteristics || '',
    physicalDescription: character?.physicalDescription || '',
    ...character
  });
  const [showOtherTypeInput, setShowOtherTypeInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [traitSearchTerm, setTraitSearchTerm] = useState('');
  const [showTraitDropdown, setShowTraitDropdown] = useState(false);
  const traitDropdownRef = useRef<HTMLDivElement>(null);

  // Get filtered traits based on search term
  const filteredTraits = getCharacterTraitOptions(traitSearchTerm, tCharacters);

  // Handle click outside to close trait dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (traitDropdownRef.current && !traitDropdownRef.current.contains(event.target as Node)) {
        setShowTraitDropdown(false);
      }
    };

    if (showTraitDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTraitDropdown]);

  const handleInputChange = (field: keyof Character, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'type') {
      // Check if it's one of our predefined types or a custom value
      const isPredefinedType = ['boy', 'girl', 'man', 'woman', 'person', 'dog', 'cat', 'bird', 'other_animal', 'dragon', 'elf_fairy_mythical', 'robot_cyborg', 'alien_extraterrestrial', 'other_creature', 'other'].includes(value);
      
      setShowOtherTypeInput(!isPredefinedType);
      
      // Reset age when changing character type to ensure valid age for new type
      setFormData(prev => ({ ...prev, age: '' }));
    }
  };

  const handleTraitToggle = (trait: CharacterTrait) => {
    setFormData(prev => {
      const currentTraits = prev.traits || [];
      const hasTraitAlready = currentTraits.includes(trait);
      
      if (hasTraitAlready) {
        // Remove trait
        return {
          ...prev,
          traits: currentTraits.filter(t => t !== trait)
        };
      } else {
        // Add trait (max 5)
        if (currentTraits.length >= 5) {
          alert(tCharacters('errors.maxTraits'));
          return prev;
        }
        return {
          ...prev,
          traits: [...currentTraits, trait]
        };
      }
    });
  };

  const handleTraitSearchChange = (value: string) => {
    setTraitSearchTerm(value);
    setShowTraitDropdown(value.length > 0);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert(tCharacters('validation.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);

      // Track character creation or customization
      if (mode === 'create') {
        trackStoryCreation.characterAdded({
          character_name: formData.name,
          character_type: formData.type,
          character_role: formData.role
        });      } else if (mode === 'edit') {
        trackStoryCreation.characterCustomized({
          character_name: formData.name,
          character_type: formData.type,
          character_role: formData.role
        });
      }
    } catch (error) {
      console.error('Error saving character:', error);
      alert(tCharacters('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting character:', error);
      alert(tCharacters('errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  // Helper function to get type display value
  const getTypeDisplayValue = (typeValue: string) => {
    const typeKey = `types.${typeValue}`;
    const translated = tCharacters(typeKey);
    // If translation exists, use it; otherwise fall back to formatted value
    if (translated !== typeKey) {
      return translated;
    }
    return typeValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (mode === 'view') {
    return (
      <div className="card bg-base-100 shadow-lg border">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {formData.photoUrl && (
                <div className="avatar">
                  <div className="w-16 h-16 rounded-full relative overflow-hidden">
                    <Image
                      src={formData.photoUrl}
                      alt={formData.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
              <div>
                <h3 className="card-title text-xl">{formData.name}</h3>
                <div className="badge badge-primary badge-outline">{formatRoleName(formData.role || 'other')}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">{tCharacters('fields.type')}</span>
              </label>
              <p className="text-gray-700">{getTypeDisplayValue(formData.type || '')}</p>
            </div>
            
            {formData.age && (
              <div>
                <label className="label">
                  <span className="label-text font-semibold">{tCharacters('fields.age')}</span>
                </label>
                <p className="text-gray-700">
                  {getAgeOptions().find(age => age.value === formData.age)?.label || formData.age}
                </p>
                {getAgeOptions().find(age => age.value === formData.age)?.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {getAgeOptions().find(age => age.value === formData.age)?.description}
                  </p>
                )}
              </div>
            )}
          </div>          {/* Traits Display in View Mode - show after age */}
          {formData.traits && formData.traits.length > 0 && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">{tCharacters('fields.traits')}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.traits.map((trait) => (
                  <div
                    key={trait}
                    className="px-2 py-1 rounded text-sm bg-gray-200 text-gray-700"
                  >
                    {getTraitDisplayName(trait)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.characteristics && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">{tCharacters('fields.characteristics')}</span>
              </label>
              <p className="text-gray-700">{formData.characteristics}</p>
            </div>
          )}

          {formData.physicalDescription && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">{tCharacters('fields.physicalDescription')}</span>
              </label>
              <p className="text-gray-700">{formData.physicalDescription}</p>
            </div>
          )}

          <div className="card-actions justify-end">
            <button
              className="btn btn-outline btn-sm"
              onClick={onEdit}
              disabled={deleting}
            >
              ✏️ {tCharacters('actions.edit')}
            </button>
            <button
              className={`btn btn-error btn-sm ${deleting ? 'loading' : ''}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '' : `🗑️ ${tCharacters('actions.delete')}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg border">
      <div className="card-body">
        <h3 className="card-title text-xl mb-4">
          {mode === 'create' ? `✨ ${tCharacters('titles.addNew')}` : `✏️ ${tCharacters('titles.edit')}`}
        </h3>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.role')}</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
          >
            {characterRoles.map((role: {value: string, label: string}) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.name')}</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={tCharacters('placeholders.name')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.type')}</span>
          </label>
          <GroupedCharacterTypeSelect
            value={formData.type}
            onChange={(value) => handleInputChange('type', value)}
            placeholder={tCharacters('placeholders.type')}
          />

          {showOtherTypeInput && (
            <input
              type="text"
              className="input input-bordered w-full mt-2"
              placeholder={tCharacters('placeholders.otherType')}
              maxLength={32}
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
            />
          )}
        </div>

        {/* Age Field */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.age')}</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={formData.age || ''}
            onChange={(e) => handleInputChange('age', e.target.value)}
          >
            <option value="">{tCharacters('placeholders.age')}</option>
            {getAgeOptions().map((age: {value: string, label: string, description: string}) => (
              <option key={age.value} value={age.value}>{age.label}</option>
            ))}
          </select>
          
          {/* Show description for selected age */}
          {formData.age && getAgeOptions().find(age => age.value === formData.age) && (
            <div className="text-sm text-gray-600 mt-2 px-3 py-2 bg-gray-50 rounded-md">
              {getAgeOptions().find(age => age.value === formData.age)?.description}
            </div>
          )}
        </div>

        {/* Traits Selection */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.traits')} ({tCharacters('placeholders.maxTraits')})</span>
          </label>
          
          {/* Trait Search */}
          <div className="relative mb-3" ref={traitDropdownRef}>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={tCharacters('placeholders.searchTraits')}
              value={traitSearchTerm}
              onChange={(e) => handleTraitSearchChange(e.target.value)}
              onFocus={() => setShowTraitDropdown(true)}
            />
            
            {showTraitDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {Object.entries(filteredTraits).map(([category, traits]) => (
                  traits.length > 0 && (
                    <div key={category}>
                      <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                        category === 'positive' ? 'text-green-700 bg-green-50' :
                        category === 'negative' ? 'text-red-700 bg-red-50' : 
                        'text-blue-700 bg-blue-50'
                      }`}>
                        {tCharacters(`traitCategories.${category}`)}
                      </div>
                      {traits.map((trait) => {
                        const isSelected = formData.traits?.includes(trait.value);
                        const isDisabled = !isSelected && (formData.traits?.length || 0) >= 5;
                        return (
                          <div
                            key={trait.value}
                            className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                              isSelected ? 'bg-blue-500 text-white' :
                              isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                              'hover:bg-gray-50'
                            }`}
                            onClick={() => !isDisabled && handleTraitToggle(trait.value)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{trait.label}</span>
                              {isSelected && <span className="text-xs">✓</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ))}
                
                {Object.values(filteredTraits).every(arr => arr.length === 0) && (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    {tCharacters('messages.noTraitsFound', { searchTerm: traitSearchTerm })}
                  </div>
                )}
                
                <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTraitDropdown(false);
                      setTraitSearchTerm('');
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    {tCharacters('actions.close')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Selected Traits Display */}
          <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded-md bg-gray-50">
            {formData.traits && formData.traits.length > 0 ? (
              formData.traits.map((trait) => (
                <div
                  key={trait}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded"
                >
                  <span>{getTraitDisplayName(trait)}</span>
                  <button
                    type="button"
                    onClick={() => handleTraitToggle(trait as CharacterTrait)}
                    className="ml-1 text-gray-500 hover:text-red-500 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <span className="text-gray-400 text-sm">{tCharacters('placeholders.noTraitsSelected')}</span>
            )}
          </div>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.characteristics')}</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24 w-full"
            placeholder={tCharacters('placeholders.characteristics')}
            value={formData.characteristics}
            onChange={(e) => handleInputChange('characteristics', e.target.value)}
          />
          <RollableHints
            hints={CHARACTERISTIC_HINT_KEYS.map(k => tCharacters(`characteristicHints.${k}`))}
            className="px-3 py-2 rounded-md border border-gray-200"
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{tCharacters('fields.physicalDescription')}</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24 w-full"
            placeholder={tCharacters('placeholders.physicalDescription')}
            value={formData.physicalDescription}
            onChange={(e) => handleInputChange('physicalDescription', e.target.value)}
          />
          <RollableHints
            hints={PHYSICAL_DESCRIPTION_HINT_KEYS.map(k => tCharacters(`physicalDescriptionHints.${k}`))}
            className="px-3 py-2 rounded-md border border-gray-200"
          />
        </div>

        <div className="card-actions justify-end">
          {onCancel && (
            <button
              className="btn btn-outline"
              onClick={onCancel}
              disabled={saving}
            >
              {tCharacters('actions.cancel')}
            </button>
          )}
          <button
            className={`btn btn-primary ${saving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
          >
            {saving ? '' : (mode === 'create' ? `➕ ${tCharacters('actions.addCharacter')}` : `💾 ${tCharacters('actions.saveChanges')}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
