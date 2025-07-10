'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { trackStoryCreation } from '../lib/analytics';
import { Character } from '../lib/story-session';
import { 
  getCharacterTypeOptions, 
  getCharacterRoleOptions, 
  isValidCharacterType 
} from '../types/character-enums';

interface CharacterCardProps {
  character?: Character;
  mode: 'create' | 'edit' | 'view';
  onSave: (character: Character) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onCancel?: () => void;
}

// Function to format role names for display
const formatRoleName = (role: string, t: (key: string) => string): string => {
  const roleKey = `roles.${role}`;
  const translated = t(roleKey);
  // If no translation found, fall back to formatted version
  if (translated === roleKey) {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return translated;
};

export default function CharacterCard({
  character,
  mode,
  onSave,
  onEdit,
  onDelete,
  onCancel
}: CharacterCardProps) {
  const t = useTranslations('Characters');
  const characterTypes = getCharacterTypeOptions(t);
  const characterRoles = getCharacterRoleOptions(t);  const [formData, setFormData] = useState<Character>({
    name: character?.name || '',
    type: character?.type || 'Boy',
    role: character?.role || 'protagonist',
    passions: character?.passions || '',
    physicalDescription: character?.physicalDescription || '',
    ...character
  });
  const [showOtherTypeInput, setShowOtherTypeInput] = useState(
    character?.type ? !isValidCharacterType(character.type) : false
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const handleInputChange = (field: keyof Character, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'type' && value === 'Other') {
      setShowOtherTypeInput(true);
    } else if (field === 'type' && value !== 'Other') {
      setShowOtherTypeInput(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert(t('validation.nameRequired'));
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
      alert(t('errors.saveFailed'));
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
      alert(t('errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  // Helper function to get type display value
  const getTypeDisplayValue = (typeValue: string) => {
    const typeOption = characterTypes.find((ct: {value: string, label: string}) => ct.value === typeValue);
    return typeOption ? typeOption.label : typeValue;
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
                <div className="badge badge-primary badge-outline">{formatRoleName(formData.role || 'other', t)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">{t('fields.type')}</span>
              </label>
              <p className="text-gray-700">{getTypeDisplayValue(formData.type || '')}</p>
            </div>
          </div>          {formData.passions && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">{t('fields.passions')}</span>
              </label>
              <p className="text-gray-700">{formData.passions}</p>
            </div>
          )}

          {formData.physicalDescription && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">{t('fields.physicalDescription')}</span>
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
              ✏️ {t('actions.edit')}
            </button>
            <button
              className={`btn btn-error btn-sm ${deleting ? 'loading' : ''}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '' : `🗑️ ${t('actions.delete')}`}
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
          {mode === 'create' ? `✨ ${t('titles.addNew')}` : `✏️ ${t('titles.edit')}`}
        </h3>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{t('fields.role')}</span>
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
            <span className="label-text font-semibold">{t('fields.name')}</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={t('placeholders.name')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{t('fields.type')}</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={showOtherTypeInput ? 'Other' : formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
          >
            {characterTypes.map((type: {value: string, label: string}) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          {showOtherTypeInput && (
            <input
              type="text"
              className="input input-bordered w-full mt-2"
              placeholder={t('placeholders.otherType')}
              maxLength={32}
              value={formData.type === 'Other' ? '' : formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
            />
          )}
        </div>        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{t('fields.passions')}</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24 w-full"
            placeholder={t('placeholders.passions')}
            value={formData.passions}
            onChange={(e) => handleInputChange('passions', e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">{t('fields.physicalDescription')}</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24 w-full"
            placeholder={t('placeholders.physicalDescription')}
            value={formData.physicalDescription}
            onChange={(e) => handleInputChange('physicalDescription', e.target.value)}
          />
        </div>        <div className="card-actions justify-end">
          {onCancel && (
            <button
              className="btn btn-outline"
              onClick={onCancel}
              disabled={saving}
            >
              {t('actions.cancel')}
            </button>
          )}
          <button
            className={`btn btn-primary ${saving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
          >
            {saving ? '' : (mode === 'create' ? `➕ ${t('actions.addCharacter')}` : `💾 ${t('actions.saveChanges')}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
