import { FiX, FiFileText, FiImage } from 'react-icons/fi';
import type { useTranslations } from 'next-intl';
import ImageEditingTab from '../ImageEditingTab';
import { StoryImage } from '@/utils/imageUtils';

type TFunc = ReturnType<typeof useTranslations>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'text' | 'images';
  setActiveTab: (tab: 'text' | 'images') => void;
  t: TFunc;
  chapters: { number: number; title: string }[];
  selectedChapter: number | null;
  setSelectedChapter: (n: number | null) => void;
  userRequest: string;
  setUserRequest: (v: string) => void;
  storyId: string;
  storyImages: StoryImage[];
  onEditSuccess: (html: string, autoSave?: boolean) => void;
  onImageEditSuccess: (originalUrl: string, newUrl: string) => void;
  onImageUpdated: (images: StoryImage[]) => void;
}

export default function AIEditModalLayout({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  t,
  chapters,
  selectedChapter,
  setSelectedChapter,
  userRequest,
  setUserRequest,
  storyId,
  storyImages,
  onEditSuccess,
  onImageEditSuccess,
  onImageUpdated,
}: Props) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{t('title')}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex space-x-2 p-4 border-b">
          <button
            className={`btn btn-sm ${activeTab === 'text' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <FiFileText className="w-4 h-4 mr-1" /> {t('tabs.text')}
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'images' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <FiImage className="w-4 h-4 mr-1" /> {t('tabs.images')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'text' ? (
            <div className="space-y-4">
              <select
                className="select select-bordered w-full"
                value={selectedChapter ?? ''}
                onChange={(e) => setSelectedChapter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t('editSelection.entireStory')}</option>
                {chapters.map((c) => (
                  <option key={c.number} value={c.number}>
                    {c.title}
                  </option>
                ))}
              </select>
              <textarea
                className="textarea textarea-bordered w-full h-40"
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder={t('editRequest.placeholder')}
              />
              <button
                className="btn btn-primary"
                onClick={() => onEditSuccess(userRequest)}
                disabled={!userRequest.trim()}
              >
                {t('buttons.applyChanges')}
              </button>
            </div>
          ) : (
            <ImageEditingTab
              storyId={storyId}
              storyImages={storyImages}
              onImageEditSuccess={onImageEditSuccess}
              onImageUpdated={onImageUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
}
