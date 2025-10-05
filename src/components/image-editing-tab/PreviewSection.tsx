import Image from 'next/image';
import type { useTranslations } from 'next-intl';

type TFunc = ReturnType<typeof useTranslations>;

interface Props {
  previewImage: string | null;
  newImageGenerated: string | null;
  onReplace: () => void;
  isReplacing: boolean;
  t: TFunc;
}

export default function PreviewSection({
  previewImage,
  newImageGenerated,
  onReplace,
  isReplacing,
  t,
}: Props) {
  if (!previewImage) return null;
  return (
    <div>
      <label className="label">
        <span className="label-text font-medium">{t('imagePreview.label')}</span>
      </label>
      <div className="max-w-md mx-auto">
        <div className="aspect-square bg-base-200 rounded-lg overflow-hidden">
          <Image
            src={previewImage}
            alt="Preview"
            width={400}
            height={400}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      {newImageGenerated && (
        <div className="mt-4 text-center">
          <button onClick={onReplace} disabled={isReplacing} className="btn btn-success">
            {isReplacing ? t('buttons.replacingImage') : t('buttons.replaceImageInStory')}
          </button>
        </div>
      )}
    </div>
  );
}
