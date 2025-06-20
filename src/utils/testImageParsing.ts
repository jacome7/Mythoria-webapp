/**
 * Test utility to debug image filename parsing
 */

// Copy the parseImageFilename function locally for testing
function parseImageFilename(filename: string): {
  type: 'frontcover' | 'backcover' | 'chapter';
  chapterNumber?: number;
  version: string;
  timestamp: string;
} | null {
  // Remove path and extension
  const nameWithoutPath = filename.split('/').pop() || '';
  const nameWithoutExt = nameWithoutPath.replace(/\.[^/.]+$/, '');
  
  console.log('Parsing filename:', {
    original: filename,
    nameWithoutPath,
    nameWithoutExt
  });
  
  // Patterns for different image types
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
    // frontcover_v002_2025-06-20T10-54-21-533Z.png
    {
      regex: /^frontcover_v(\d+)_(.+)$/,
      type: 'frontcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: `v${match[1].padStart(3, '0')}`,
        timestamp: match[2]
      })
    },
    // frontcover_2025-06-20T10-54-21-533Z.png
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
    // backcover_v001_2025-06-20T10-55-12-493Z.png
    {
      regex: /^backcover_v(\d+)_(.+)$/,
      type: 'backcover' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        version: `v${match[1].padStart(3, '0')}`,
        timestamp: match[2]
      })
    },
    // backcover_2025-06-20T10-55-12-493Z.png (legacy)
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
    // chapter_1__v001_2025-06-20T10-26-09-584Z.png
    {
      regex: /^chapter_(\d+)__v(\d+)_(.+)$/,
      type: 'chapter' as const,
      getMetadata: (match: RegExpMatchArray) => ({
        chapterNumber: parseInt(match[1]),
        version: `v${match[2].padStart(3, '0')}`,
        timestamp: match[3]
      })
    },
    // chapter_1_2025-06-20T10-26-09-584Z.png (legacy)
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
    console.log('Testing pattern:', {
      regex: pattern.regex.toString(),
      match: match ? match : 'no match'
    });
    
    if (match) {
      const metadata = pattern.getMetadata(match);
      const result = {
        type: pattern.type,
        ...metadata
      };
      console.log('Pattern matched! Result:', result);
      return result;
    }
  }

  console.log('No patterns matched for filename:', filename);
  return null;
}

// Test with some sample filenames
export function testImageParsing() {
  const testFilenames = [
    'frontcover.png',
    'frontcover_v001_2025-01-20T15-30-00-000Z.png',
    'frontcover_v002_2025-01-20T16-45-12-123Z.png',
    'frontcover_2025-01-20T15-30-00-000Z.png',
    'backcover.png',
    'backcover_v001_2025-01-20T15-30-00-000Z.png',
    'chapter_1.png',
    'chapter_1__v001_2025-01-20T15-30-00-000Z.png',
    'chapter_1__v002_2025-01-20T16-45-12-123Z.png',
    'chapter_1_2025-01-20T15-30-00-000Z.png',
    // With full paths
    '/mythoria/67890/images/frontcover_v002_2025-01-20T16-45-12-123Z.png',
    '/mythoria/67890/images/chapter_1__v003_2025-01-20T17-20-30-456Z.png'
  ];

  console.log('=== Testing Image Filename Parsing ===');
  
  testFilenames.forEach(filename => {
    console.log('\n--- Testing:', filename, '---');
    const result = parseImageFilename(filename);
    console.log('Result:', result);
  });
}
