import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Cropper from 'react-easy-crop';
import { FiX } from 'react-icons/fi';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropperProps {
  imageSrc: string;
  aspect: number;
  onConfirm: (area: CropArea) => void;
  onCancel: () => void;
  processing: boolean;
}

export default function CropperModal({
  imageSrc,
  aspect,
  onConfirm,
  onCancel,
  processing,
}: CropperProps) {
  const t = useTranslations('AIImageEditor.cropper');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);

  const handleCropComplete = useCallback((_c: CropArea, pixels: CropArea) => {
    setCroppedArea(pixels);
  }, []);

  const handleConfirm = () => {
    if (croppedArea) {
      onConfirm(croppedArea);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">{t('title')}</h3>
          <button onClick={onCancel} className="p-2 rounded hover:bg-gray-100">
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 relative bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
            minZoom={1}
            maxZoom={3}
            restrictPosition
            objectFit="contain"
            showGrid
          />
        </div>
        <div className="p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex w-full flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500 sm:w-20 sm:text-right text-center mt-1 sm:mt-0">
              {t('zoom', { value: Math.abs(zoom - Math.round(zoom)) < 0.01 ? Math.round(zoom).toString() : zoom.toFixed(2) })}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={onCancel} className="w-28 px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">{t('cancel')}</button>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="w-28 px-4 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300"
            >
              {processing ? t('processing') : t('crop')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
