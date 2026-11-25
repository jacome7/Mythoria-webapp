'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';

export default function PremiumAudiobookPlayer({
  src,
  storyId,
}: {
  src: string;
  storyId?: string;
}) {
  const tListenStory = useTranslations('ListenStory');
  const tPublicStoryPage = useTranslations('PublicStoryPage');

  return (
    <div className="rounded-lg border bg-white p-4 text-gray-900 shadow-sm">
      <h3 className="mb-2 font-semibold">{tListenStory('fullAudiobook')}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <audio
          controls
          preload="none"
          aria-label={tListenStory('fullAudiobook')}
          className="w-full max-w-lg"
          src={src}
          onPlay={() =>
            trackEvent('audiobook_interaction', {
              action_type: 'play',
              story_id: storyId,
              chapter_index: 0,
              total_chapters: 1,
              interaction_type: 'play_audio',
            })
          }
        />
        <a
          className="btn btn-outline btn-sm"
          href={`${src}&download=1`}
          download
          onClick={() =>
            trackEvent('audiobook_interaction', {
              action_type: 'download',
              story_id: storyId,
              chapter_index: 0,
              interaction_type: 'download_audio',
            })
          }
        >
          <Download size={16} />
          {tPublicStoryPage('listen.controls.download')}
        </a>
      </div>
    </div>
  );
}
