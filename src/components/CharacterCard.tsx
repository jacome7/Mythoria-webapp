'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Character } from '../lib/story-session';

interface CharacterCardProps {
  character?: Character;
  mode: 'create' | 'edit' | 'view';
  onSave: (character: Character) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onCancel?: () => void;
}

// Function to format role names for display
const formatRoleName = (role: string): string => {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const CHARACTER_TYPES = [
  'Boy',
  'Girl', 
  'Baby',
  'Man',
  'Woman',
  'Human',
  'Dog',
  'Dragon',
  'Fantasy Creature',
  'Animal',
  'Other'
];

const CHARACTER_ROLES = [
  'protagonist',
  'antagonist', 
  'supporting',
  'mentor',
  'comic_relief',
  'love_interest',
  'sidekick',
  'narrator',
  'other'
];

export default function CharacterCard({ 
  character, 
  mode, 
  onSave, 
  onEdit, 
  onDelete, 
  onCancel 
}: CharacterCardProps) {  const [formData, setFormData] = useState<Character>({
    name: character?.name || '',
    type: character?.type || 'Boy',
    role: character?.role || 'protagonist',
    superpowers: character?.superpowers || '',
    passions: character?.passions || '',
    physicalDescription: character?.physicalDescription || '',
    photoUrl: character?.photoUrl || '',
    ...character
  });
  
  const [showOtherTypeInput, setShowOtherTypeInput] = useState(
    character?.type ? !CHARACTER_TYPES.includes(character.type) : false
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof Character, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'type' && value === 'Other') {
      setShowOtherTypeInput(true);
    } else if (field === 'type' && value !== 'Other') {
      setShowOtherTypeInput(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // In a real app, you'd upload to a service like S3 or Cloudinary
      // For now, we'll just create a local URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, photoUrl: e.target?.result as string }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Character name is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving character:', error);
      alert('Failed to save character. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Failed to delete character. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (mode === 'view') {
    return (
      <div className="card bg-base-100 shadow-lg border">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {formData.photoUrl && (
                <div className="avatar">                  <div className="w-16 h-16 rounded-full relative overflow-hidden">
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
                <span className="label-text font-semibold">Type</span>
              </label>
              <p className="text-gray-700">{formData.type}</p>
            </div>
          </div>          {formData.superpowers && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">Special Powers</span>
              </label>
              <p className="text-gray-700">{formData.superpowers}</p>
            </div>
          )}

          {formData.passions && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">Peculiarities</span>
              </label>
              <p className="text-gray-700">{formData.passions}</p>
            </div>
          )}

          {formData.physicalDescription && (
            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">Physical Description</span>
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
              ✏️ Edit
            </button>
            <button
              className={`btn btn-error btn-sm ${deleting ? 'loading' : ''}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '' : '🗑️ Delete'}
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
          {mode === 'create' ? '✨ Add New Character' : '✏️ Edit Character'}
        </h3>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Role</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
          >
            {CHARACTER_ROLES.map(role => (
              <option key={role} value={role}>{formatRoleName(role)}</option>
            ))}
          </select>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter character name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={showOtherTypeInput ? 'Other' : formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
          >
            {CHARACTER_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          {showOtherTypeInput && (
            <input
              type="text"
              className="input input-bordered w-full mt-2"
              placeholder="Specify other type (max 32 chars)"
              maxLength={32}
              value={formData.type === 'Other' ? '' : formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
            />
          )}
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Special Powers</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="e.g. invisibility, super strength, talking to animals..."
            value={formData.superpowers}
            onChange={(e) => handleInputChange('superpowers', e.target.value)}
          />
        </div>        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Peculiarities</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="Describe funny or quirky traits..."
            value={formData.passions}
            onChange={(e) => handleInputChange('passions', e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Physical Description</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="Describe how the character looks (hair, eyes, height, clothing, etc.)..."
            value={formData.physicalDescription}
            onChange={(e) => handleInputChange('physicalDescription', e.target.value)}
          />
        </div>

        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-semibold">Photo (Optional)</span>
          </label>
          
          {formData.photoUrl ? (
            <div className="flex items-center space-x-4">
              <div className="avatar">                <div className="w-16 h-16 rounded-full relative overflow-hidden">
                  <Image 
                    src={formData.photoUrl} 
                    alt="Character"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  🔄 Change
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              className={`btn btn-outline w-full ${uploading ? 'loading' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '' : '📸 Upload Photo'}
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        <div className="card-actions justify-end">
          {onCancel && (
            <button
              className="btn btn-outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          )}
          <button
            className={`btn btn-primary ${saving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
          >
            {saving ? '' : (mode === 'create' ? '➕ Add Character' : '💾 Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
