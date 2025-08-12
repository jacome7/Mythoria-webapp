'use client';

import { FiShare2 } from 'react-icons/fi';

interface ShareButtonProps {
  title: string;
  summary: string;
  url: string;
  shareText: string;
}

export default function ShareButton({ title, summary, url, shareText }: ShareButtonProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: summary,
          url,
        });
  } catch {
        // User cancelled sharing or other error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(url);
        // You could add a toast notification here
        console.log('URL copied to clipboard');
  } catch {
        console.error('Failed to copy URL');
      }
    }
  };

  return (
    <button
      className="btn btn-outline btn-sm gap-2"
      onClick={handleShare}
    >
      <FiShare2 className="w-4 h-4" />
      {shareText}
    </button>
  );
}
