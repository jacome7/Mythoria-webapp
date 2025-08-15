'use client';

import { useState } from 'react';
import { FiEdit3 } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface ImageEditButtonProps {
  imageUri: string;
  imageType: 'cover' | 'backcover' | 'chapter';
  chapterNumber?: number;
  onEdit: (imageData: {
    imageUri: string;
    imageType: string;
    chapterNumber?: number;
  }) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function ImageEditButton({
  imageUri,
  imageType,
  chapterNumber,
  onEdit,
  className = '',
  children
}: ImageEditButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tImageEditButton = useTranslations('ImageEditButton');

  const handleEdit = () => {
    onEdit({
      imageUri,
      imageType,
      chapterNumber
    });
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <button
          onClick={handleEdit}
          className="absolute top-2 right-2 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 transform hover:scale-105"
          title={tImageEditButton('tooltip')}
        >
          <FiEdit3 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
