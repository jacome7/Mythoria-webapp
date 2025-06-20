/**
 * Image Utilities
 * Helper functions for working with story images from Google Cloud Storage
 */

export interface ImageVersion {
  url: string;
  version: string;
  timestamp: string;
  filename: string;
}

export interface StoryImage {
  type: 'frontcover' | 'backcover' | 'chapter';
  chapterNumber?: number;
  versions: ImageVersion[];
  latestVersion: ImageVersion;
}

/**
 * Parse image filename to extract metadata
 */
function parseImageFilename(filename: string): {
  type: 'frontcover' | 'backcover' | 'chapter';
  chapterNumber?: number;
  version: string;
  timestamp: string;
} | null {
  // Remove path and extension
  const nameWithoutPath = filename.split('/').pop() || '';
  const nameWithoutExt = nameWithoutPath.replace(/\.[^/.]+$/, '');  // Patterns for different image types
  const patterns = [
    // Simple frontcover.png
    {
      regex: /^frontcover$/,
      type: 'frontcover' as const,
      getMetadata: () => ({
        version: 'v001',
        timestamp: 'current'
      })
    },
    // frontcover_v001.png, frontcover_v002.png (no timestamp, just version)
    {
      regex: /^frontcover_v(\d+)$/,
      type: 'frontcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: `v${match[1].padStart(3, '0')}`,
        timestamp: 'current'
      })
    },
    // frontcover_v002_2025-06-20T10-54-21-533Z.png (version with timestamp)
    {
      regex: /^frontcover_v(\d+)_(.+)$/,
      type: 'frontcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: `v${match[1].padStart(3, '0')}`,
        timestamp: match[2]
      })
    },
    // frontcover_2025-06-20T10-54-21-533Z.png (timestamp only, default to v001)
    {
      regex: /^frontcover_(.+)$/,
      type: 'frontcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: 'v001', // Default version for legacy images
        timestamp: match[1]
      })
    },
    // Simple backcover.png
    {
      regex: /^backcover$/,
      type: 'backcover' as const,
      getMetadata: () => ({
        version: 'v001',
        timestamp: 'current'
      })
    },
    // backcover_v001.png (version only, no timestamp)
    {
      regex: /^backcover_v(\d+)$/,
      type: 'backcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: `v${match[1].padStart(3, '0')}`,
        timestamp: 'current'
      })
    },
    // backcover_v001_2025-06-20T10-55-12-493Z.png (version with timestamp)
    {
      regex: /^backcover_v(\d+)_(.+)$/,
      type: 'backcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: `v${match[1].padStart(3, '0')}`,
        timestamp: match[2]
      })
    },
    // backcover_2025-06-20T10-55-12-493Z.png (timestamp only, default to v001)
    {
      regex: /^backcover_(.+)$/,
      type: 'backcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: 'v001', // Default version for legacy images
        timestamp: match[1]
      })
    },
    // Simple chapter_1.png
    {
      regex: /^chapter_(\d+)$/,
      type: 'chapter' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        chapterNumber: parseInt(match[1]),
        version: 'v001',
        timestamp: 'current'
      })
    },
    // chapter_1_v001.png (chapter with version, no timestamp)
    {
      regex: /^chapter_(\d+)_v(\d+)$/,
      type: 'chapter' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        chapterNumber: parseInt(match[1]),
        version: `v${match[2].padStart(3, '0')}`,
        timestamp: 'current'
      })
    },
    // chapter_1__v001_2025-06-20T10-26-09-584Z.png (double underscore with version and timestamp)
    {
      regex: /^chapter_(\d+)__v(\d+)_(.+)$/,
      type: 'chapter' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        chapterNumber: parseInt(match[1]),
        version: `v${match[2].padStart(3, '0')}`,
        timestamp: match[3]
      })
    },
    // chapter_1_2025-06-20T10-26-09-584Z.png (chapter with timestamp, default to v001)
    {
      regex: /^chapter_(\d+)_(.+)$/,
      type: 'chapter' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        chapterNumber: parseInt(match[1]),
        version: 'v001', // Default version for legacy images
        timestamp: match[2]
      })
    }
  ];
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern.regex);
    if (match) {
      console.log('Debug: Pattern matched!', {
        regex: pattern.regex.toString(),
        match,
        type: pattern.type
      });
      const metadata = pattern.getMetadata(match);
      return {
        type: pattern.type,
        ...metadata
      };
    }
  }

  console.log('Debug: No pattern matched for filename:', filename, 'nameWithoutExt:', nameWithoutExt);

  return null;
}

/**
 * Extract and organize story images from HTML content
 */
export function extractStoryImagesFromHtml(htmlContent: string): StoryImage[] {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return [];
  }

  const imageUrls: string[] = [];

  // Extract image URLs from HTML using regex to find img tags with storage.googleapis.com URLs
  const imgTagRegex = /<img[^>]+src=["']([^"']*storage\.googleapis\.com[^"']*\.(?:png|jpg|jpeg|webp|gif))[^"']*["'][^>]*>/gi;
  
  let match;
  while ((match = imgTagRegex.exec(htmlContent)) !== null) {
    const imageUrl = match[1];
    // Filter out logo images and only include story images
    if (!imageUrl.includes('Mythoria-logo') && !imageUrl.includes('logo')) {
      imageUrls.push(imageUrl);
    }
  }

  // Remove duplicates
  const uniqueImageUrls = [...new Set(imageUrls)];

  // Group images by type and organize versions
  const imageGroups = new Map<string, ImageVersion[]>();

  for (const url of uniqueImageUrls) {
    const filename = url.split('/').pop() || '';
    const parsed = parseImageFilename(filename);
    
    if (!parsed) continue;

    // Create a unique key for each image type
    const key = parsed.type === 'chapter' 
      ? `${parsed.type}_${parsed.chapterNumber}`
      : parsed.type;

    if (!imageGroups.has(key)) {
      imageGroups.set(key, []);
    }

    imageGroups.get(key)!.push({
      url,
      version: parsed.version,
      timestamp: parsed.timestamp,
      filename
    });
  }

  // Convert to StoryImage array and sort versions
  const storyImages: StoryImage[] = [];

  for (const [key, versions] of imageGroups) {
    // Sort versions by version number (v001, v002, etc.)
    versions.sort((a, b) => {
      const aNum = parseInt(a.version.replace('v', ''));
      const bNum = parseInt(b.version.replace('v', ''));
      return aNum - bNum;
    });

    const latestVersion = versions[versions.length - 1];
    
    let storyImage: StoryImage;
    
    if (key.startsWith('chapter_')) {
      const chapterNumber = parseInt(key.split('_')[1]);
      storyImage = {
        type: 'chapter',
        chapterNumber,
        versions,
        latestVersion
      };
    } else {
      storyImage = {
        type: key as 'frontcover' | 'backcover',
        versions,
        latestVersion
      };
    }

    storyImages.push(storyImage);
  }

  // Sort the final array: frontcover, backcover, then chapters in order
  storyImages.sort((a, b) => {
    const order = { frontcover: 0, backcover: 1, chapter: 2 };
    const aOrder = order[a.type];
    const bOrder = order[b.type];
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    if (a.type === 'chapter' && b.type === 'chapter') {
      return (a.chapterNumber || 0) - (b.chapterNumber || 0);
    }
    
    return 0;
  });

  return storyImages;
}

/**
 * Extract and organize story images from Google Cloud Storage data
 */
export function extractStoryImages(storageData: Record<string, { url: string; timeCreated?: string; updated?: string; size?: string | number; contentType?: string }>): StoryImage[] {
  if (!storageData || typeof storageData !== 'object') {
    return [];
  }

  const imageUrls: Array<{ url: string; filename: string; timeCreated?: string; updated?: string }> = [];

  // Extract all image URLs from Google Cloud Storage data
  for (const [filename, value] of Object.entries(storageData)) {
    if (value && typeof value === 'object' && 'url' in value) {
      // Google Storage format with metadata
      const imageData = value as { url: string; timeCreated?: string; updated?: string; size?: string | number; contentType?: string };
      if (typeof imageData.url === 'string' && imageData.url.includes('storage.googleapis.com')) {
        if (/\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
          imageUrls.push({
            url: imageData.url,
            filename,
            timeCreated: imageData.timeCreated,
            updated: imageData.updated
          });
        }
      }
    }
  }

  // Group images by type and organize versions
  const imageGroups = new Map<string, ImageVersion[]>();
  for (const { url, filename, timeCreated, updated } of imageUrls) {
    const parsed = parseImageFilename(filename);
    
    console.log('Debug: Processing image file:', {
      filename,
      parsed,
      timeCreated,
      updated
    });
    
    if (!parsed) {
      console.log('Debug: Could not parse filename:', filename);
      continue;
    }

    // Create a unique key for each image type
    const key = parsed.type === 'chapter' 
      ? `${parsed.type}_${parsed.chapterNumber}`
      : parsed.type;

    if (!imageGroups.has(key)) {
      imageGroups.set(key, []);
    }

    // Use the actual creation time from Google Cloud Storage metadata
    const actualTimestamp = timeCreated || updated || parsed.timestamp;

    console.log('Debug: Adding version to group:', {
      key,
      version: parsed.version,
      actualTimestamp,
      filename
    });

    imageGroups.get(key)!.push({
      url,
      version: parsed.version,
      timestamp: actualTimestamp,
      filename
    });
  }

  // Convert to StoryImage array and sort versions
  const storyImages: StoryImage[] = [];

  for (const [key, versions] of imageGroups) {
    // Sort versions by version number (v001, v002, etc.)
    versions.sort((a, b) => {
      const aNum = parseInt(a.version.replace('v', ''));
      const bNum = parseInt(b.version.replace('v', ''));
      return aNum - bNum;
    });

    const latestVersion = versions[versions.length - 1];
    
    let storyImage: StoryImage;
    
    if (key.startsWith('chapter_')) {
      const chapterNumber = parseInt(key.split('_')[1]);
      storyImage = {
        type: 'chapter',
        chapterNumber,
        versions,
        latestVersion
      };
    } else {
      storyImage = {
        type: key as 'frontcover' | 'backcover',
        versions,
        latestVersion
      };
    }

    storyImages.push(storyImage);
  }

  // Sort the final array: frontcover, backcover, then chapters in order
  storyImages.sort((a, b) => {
    const order = { frontcover: 0, backcover: 1, chapter: 2 };
    const aOrder = order[a.type];
    const bOrder = order[b.type];
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    if (a.type === 'chapter' && b.type === 'chapter') {
      return (a.chapterNumber || 0) - (b.chapterNumber || 0);
    }
    
    return 0;
  });

  return storyImages;
}

/**
 * Get a display name for an image
 */
export function getImageDisplayName(image: StoryImage): string {
  switch (image.type) {
    case 'frontcover':
      return 'Front Cover';
    case 'backcover':
      return 'Back Cover';
    case 'chapter':
      return `Chapter ${image.chapterNumber}`;
    default:
      return 'Unknown Image';
  }
}

/**
 * Format version number for display
 */
export function formatVersionNumber(version: string): string {
  const match = version.match(/v(\d+)/);
  if (match) {
    return `Version ${parseInt(match[1])}`;
  }
  return version;
}

/**
 * Format relative time (e.g., "5 minutes ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // If invalid date, return "unknown time"
    if (isNaN(date.getTime())) {
      return 'unknown time';
    }
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
      return diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else if (diffWeeks < 4) {
      return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
    } else if (diffMonths < 12) {
      return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    } else {
      return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'unknown time';
  }
}
