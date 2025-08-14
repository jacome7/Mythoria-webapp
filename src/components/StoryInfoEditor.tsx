'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  FiSave, 
  FiImage, 
  FiUser,
  FiBook,
  FiHeart
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { toAbsoluteImageUrl } from '../utils/image-url';

interface Story {
  storyId: string;
  title: string;
  synopsis?: string;
  dedicationMessage?: string;
  customAuthor?: string;
  coverUri?: string;
  backcoverUri?: string;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoryInfoEditorProps {
  story: Story;
  onSave: (updates: Partial<Story>) => Promise<void>;
  onEditCover: () => void;
  onEditBackcover: () => void;
  isLoading?: boolean;
}

export default function StoryInfoEditor({
  story,
  onSave,
  onEditCover,
  onEditBackcover,
  isLoading = false,
}: StoryInfoEditorProps) {
  const tComponentsStoryInfoEditor = useTranslations('components.storyInfoEditor');
  
  const [formData, setFormData] = useState({
    title: story.title || '',
    synopsis: story.synopsis || '',
    dedicationMessage: story.dedicationMessage || '',
    customAuthor: story.customAuthor || '',
    targetAudience: story.targetAudience || '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanges = 
      formData.title !== (story.title || '') ||
      formData.synopsis !== (story.synopsis || '') ||
      formData.dedicationMessage !== (story.dedicationMessage || '') ||
      formData.customAuthor !== (story.customAuthor || '') ||
      formData.targetAudience !== (story.targetAudience || '');
    
    setHasUnsavedChanges(hasChanges);
  }, [formData, story]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      await onSave(formData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error(tComponentsStoryInfoEditor('logging.errorSavingStoryInfo'), error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FiBook className="w-6 h-6" />
          {tComponentsStoryInfoEditor('title')}
        </h2>
        <button
          onClick={handleSave}
          disabled={isLoading || !hasUnsavedChanges}
          className="btn btn-primary"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <FiSave className="w-4 h-4" />
          )}
          {isLoading ? tComponentsStoryInfoEditor('saving') : tComponentsStoryInfoEditor('saveButton')}
        </button>
      </div>

      <div className="space-y-6">
        {/* Text Fields */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content">
              {tComponentsStoryInfoEditor('storyTitle')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="input input-bordered w-full"
              placeholder={tComponentsStoryInfoEditor('titlePlaceholder')}
            />
          </div>

          {/* Synopsis */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content">
              {tComponentsStoryInfoEditor('synopsis')}
            </label>
            <textarea
              value={formData.synopsis}
              onChange={(e) => handleInputChange('synopsis', e.target.value)}
              className="textarea textarea-bordered w-full h-24"
              placeholder={tComponentsStoryInfoEditor('synopsisPlaceholder')}
            />
          </div>

          {/* Dedication Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content flex items-center gap-2">
              <FiHeart className="w-4 h-4" />
              {tComponentsStoryInfoEditor('dedicationMessage')}
            </label>
            <textarea
              value={formData.dedicationMessage}
              onChange={(e) => handleInputChange('dedicationMessage', e.target.value)}
              className="textarea textarea-bordered w-full h-20"
              placeholder={tComponentsStoryInfoEditor('dedicationPlaceholder')}
            />
          </div>

          {/* Custom Author */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content flex items-center gap-2">
              <FiUser className="w-4 h-4" />
              {tComponentsStoryInfoEditor('authorName')}
            </label>
            <input
              type="text"
              value={formData.customAuthor}
              onChange={(e) => handleInputChange('customAuthor', e.target.value)}
              className="input input-bordered w-full"
              placeholder={tComponentsStoryInfoEditor('authorPlaceholder')}
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content">
              {tComponentsStoryInfoEditor('targetAudience')}
            </label>
            <select
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="">{tComponentsStoryInfoEditor('targetAudiencePlaceholder')}</option>
              <option value="children_0-2">{tComponentsStoryInfoEditor('targetAudienceOptions.children_0-2')}</option>
              <option value="children_3-6">{tComponentsStoryInfoEditor('targetAudienceOptions.children_3-6')}</option>
              <option value="children_7-10">{tComponentsStoryInfoEditor('targetAudienceOptions.children_7-10')}</option>
              <option value="children_11-14">{tComponentsStoryInfoEditor('targetAudienceOptions.children_11-14')}</option>
              <option value="young_adult_15-17">{tComponentsStoryInfoEditor('targetAudienceOptions.young_adult_15-17')}</option>
              <option value="adult_18+">{tComponentsStoryInfoEditor('targetAudienceOptions.adult_18+')}</option>
              <option value="all_ages">{tComponentsStoryInfoEditor('targetAudienceOptions.all_ages')}</option>
            </select>
          </div>
        </div>

        {/* Cover Images Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Front Cover */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content">
              {tComponentsStoryInfoEditor('frontCover')}
            </label>
            <div className="border-2 border-dashed border-base-300 rounded-lg p-4 text-center w-full">
              {story.coverUri ? (
                <div className="space-y-2">
                  <div className="relative mx-auto max-h-48 w-fit">
                    <Image
                      src={toAbsoluteImageUrl(story.coverUri) || ''}
                      alt={tComponentsStoryInfoEditor('altTexts.storyCover')}
                      width={200}
                      height={300}
                      className="max-h-48 rounded-lg object-contain"
                    />
                  </div>
                  <button
                    onClick={onEditCover}
                    className="btn btn-sm btn-outline"
                  >
                    <FiImage className="w-4 h-4" />
                    {tComponentsStoryInfoEditor('editCover')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <FiImage className="w-12 h-12 mx-auto text-base-content/30" />
                  <p className="text-sm text-base-content/70">{tComponentsStoryInfoEditor('noCoverImage')}</p>
                  <button
                    onClick={onEditCover}
                    className="btn btn-sm btn-primary"
                  >
                    <FiImage className="w-4 h-4" />
                    {tComponentsStoryInfoEditor('addCover')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Back Cover */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-base-content">
              {tComponentsStoryInfoEditor('backCover')}
            </label>
            <div className="border-2 border-dashed border-base-300 rounded-lg p-4 text-center w-full">
              {story.backcoverUri ? (
                <div className="space-y-2">
                  <div className="relative mx-auto max-h-48 w-fit">
                    <Image
                      src={toAbsoluteImageUrl(story.backcoverUri) || ''}
                      alt={tComponentsStoryInfoEditor('altTexts.storyBackCover')}
                      width={200}
                      height={300}
                      className="max-h-48 rounded-lg object-contain"
                    />
                  </div>
                  <button
                    onClick={onEditBackcover}
                    className="btn btn-sm btn-outline"
                  >
                    <FiImage className="w-4 h-4" />
                    {tComponentsStoryInfoEditor('editBackCover')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <FiImage className="w-12 h-12 mx-auto text-base-content/30" />
                  <p className="text-sm text-base-content/70">{tComponentsStoryInfoEditor('noBackCover')}</p>
                  <button
                    onClick={onEditBackcover}
                    className="btn btn-sm btn-primary"
                  >
                    <FiImage className="w-4 h-4" />
                    {tComponentsStoryInfoEditor('addBackCover')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Story Info */}
        <div className="bg-base-200 rounded-lg p-4 space-y-2">
          <h3 className="font-medium">{tComponentsStoryInfoEditor('storyDetails')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-base-content/70">{tComponentsStoryInfoEditor('graphicalStyleLabel')}</span>
              <span>{story.graphicalStyle?.replace('_', ' ') || tComponentsStoryInfoEditor('notSpecified')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">{tComponentsStoryInfoEditor('created')}</span>
              <span>{new Date(story.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">{tComponentsStoryInfoEditor('lastUpdated')}</span>
              <span>{new Date(story.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
