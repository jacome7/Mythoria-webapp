import Image from 'next/image';
import type { useTranslations } from 'next-intl';
import {
  StoryImage,
  ImageVersion,
  getImageDisplayName,
  formatVersionNumber,
  formatRelativeTime,
} from '@/utils/imageUtils';

type TFunc = ReturnType<typeof useTranslations>;

interface Props {
  storyImages: StoryImage[];
  selectedImage: StoryImage | null;
  selectedVersion: ImageVersion | null;
  onSelectImage: (img: StoryImage) => void;
  onSelectVersion: (v: ImageVersion) => void;
  t: TFunc;
}

export default function ReferenceImageSection({
  storyImages,
  selectedImage,
  selectedVersion,
  onSelectImage,
  onSelectVersion,
  t,
}: Props) {
  return (
    <div>
      <label className="label">
        <span className="label-text font-medium">{t('imageSelection.label')}</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {storyImages.map((img) => (
          <button
            key={img.latestVersion.url}
            onClick={() => onSelectImage(img)}
            className={`border rounded-lg overflow-hidden ${selectedImage === img ? 'ring-2 ring-primary' : ''}`}
          >
            <Image
              src={img.latestVersion.url}
              alt={getImageDisplayName(img)}
              width={200}
              height={200}
              className="w-full h-40 object-cover"
            />
          </button>
        ))}
      </div>
      {selectedImage && (
        <div className="mt-4 space-y-2">
          <label className="label">
            <span className="label-text font-medium">{t('versionSelection.label')}</span>
          </label>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {selectedImage.versions.map((v) => (
              <li key={v.url}>
                <button
                  onClick={() => onSelectVersion(v)}
                  className={`w-full text-left p-2 rounded border ${selectedVersion === v ? 'bg-base-200' : ''}`}
                >
                  <span className="block text-sm font-medium">
                    {formatVersionNumber(v.version)}
                  </span>
                  <span className="block text-xs text-base-content/70">
                    {formatRelativeTime(v.timestamp)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
