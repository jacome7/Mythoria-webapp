'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

// Define the available graphical styles with their corresponding file names
const GRAPHICAL_STYLES = [
  { key: 'cartoon', fileName: 'cartoon.jpg' },
  { key: 'realistic', fileName: 'realistic.jpg' },
  { key: 'watercolor', fileName: 'watercolor.jpg' },
  { key: 'digital_art', fileName: 'digital_art.jpg' },
  { key: 'hand_drawn', fileName: 'hand_drawn.jpg' },
  { key: 'minimalist', fileName: 'minimalist.jpg' },
  { key: 'vintage', fileName: 'vintage.jpg' },
  { key: 'comic_book', fileName: 'comic_book.jpg' },
  { key: 'anime', fileName: 'anime.jpg' },
  { key: 'pixar_style', fileName: 'pixar.jpg' },
  { key: 'disney_style', fileName: 'disney.jpg' },
  { key: 'sketch', fileName: 'sketch.jpg' },
  { key: 'oil_painting', fileName: 'oil-painting.jpg' },
  { key: 'colored_pencil', fileName: 'colored_pencil.jpg' },
] as const;

interface AnimatedLogoProps {
  className?: string;
}

export default function AnimatedLogo({ className = '' }: AnimatedLogoProps) {
  const t = useTranslations('GetInspiredPage');
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentStyleIndex((prevIndex) => 
          (prevIndex + 1) % GRAPHICAL_STYLES.length
        );
        setIsVisible(true);
      }, 1000); // 1 second fade-out duration
    }, 8000); // 8 seconds display duration

    return () => clearInterval(interval);
  }, []);

  const currentStyle = GRAPHICAL_STYLES[currentStyleIndex];
  const logoSrc = `/images/logo/${currentStyle.fileName}`;
  const styleLabel = t(`graphicalStyle.${currentStyle.key}`);

  return (
    <div className={`relative ${className}`}>
      {/* Logo image with border */}
      <div className="relative">
        <Image
          src={logoSrc}
          alt={`Mythoria Logo - ${styleLabel}`}
          width={390}
          height={390}
          className={`
            rounded-lg border-1 border-gray-600 
            transition-opacity duration-1000 ease-in-out
            ${isVisible ? 'opacity-100' : 'opacity-0'}
          `}
          priority
        />
      </div>
      
      {/* Style label positioned below the logo, aligned to the right */}
      <div className="flex justify-end mt-2">
        <span 
          className={`
            text-sm md:text-base text-base-content/70 italic 
            transition-opacity duration-1000 ease-in-out
            ${isVisible ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {styleLabel}
        </span>
      </div>
    </div>
  );
}
