'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  pdfUri?: string;
  authorId: string;
  frontCoverImageUrl?: string;
  chapterCount: number;
}

interface StoryStepProps {
  story: Story;
  onNext: () => void;
}

export default function StoryStep({ story, onNext }: StoryStepProps) {
  const tPrintOrder = useTranslations('PrintOrder');

  return (
    <div>
      <h2 className="card-title mb-4">{story.title}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="prose max-w-none">
          <p>{story.synopsis}</p>
        </div>
        
        {/* Front Cover Image - Desktop: right side, Mobile: below synopsis */}
        {story.frontCoverImageUrl && (
          <div className="flex justify-center md:justify-end">
            <div className="relative w-64 h-80 rounded-lg overflow-hidden shadow-lg">
              <Image
                src={story.frontCoverImageUrl}
                alt={`Front cover of ${story.title}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 256px"
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="card-actions justify-end mt-6">
        <button 
          className="btn btn-primary"
          onClick={onNext}
        >
          {tPrintOrder('buttons.continue')}
        </button>
      </div>
    </div>
  );
}
