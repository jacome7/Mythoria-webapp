/**
 * Utility functions for managing HTML versioning in Google Cloud Storage
 */

import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'mythoria-generated-stories';

/**
 * Extract version number from filename
 * @param filename - The filename to parse (e.g., "story_v001.html" or "story.html")
 * @returns The version number, or 1 for legacy "story.html" files
 */
export function extractVersionFromFilename(filename: string): number {
  // Handle legacy format: story.html = version 1
  if (filename === 'story.html') {
    return 1;
  }
  
  // Handle versioned format: story_v001.html, story_v002.html, etc.
  const versionMatch = filename.match(/story_v(\d{3})\.html$/);
  if (versionMatch) {
    return parseInt(versionMatch[1], 10);
  }
  
  // If no match, assume it's version 1
  return 1;
}

/**
 * Generate filename for a specific version
 * @param version - The version number (1, 2, 3, etc.)
 * @returns The filename (e.g., "story_v001.html", "story_v002.html")
 */
export function generateVersionedFilename(version: number): string {
  // Always use 3-digit version numbers with leading zeros
  const versionStr = version.toString().padStart(3, '0');
  return `story_v${versionStr}.html`;
}

/**
 * Get the latest version number for a story by listing files in Google Cloud Storage
 * @param storyId - The story ID
 * @returns The latest version number
 */
export async function getLatestVersion(storyId: string): Promise<number> {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({
      prefix: `${storyId}/story`,
      delimiter: '/',
    });
    
    let latestVersion = 0;
    
    for (const file of files) {
      const filename = file.name.split('/').pop() || '';
      const version = extractVersionFromFilename(filename);
      if (version > latestVersion) {
        latestVersion = version;
      }
    }
    
    // If no files found, start with version 1
    return latestVersion || 1;
  } catch (error) {
    console.error('Error getting latest version for story', storyId, ':', error);
    return 1;
  }
}

/**
 * Get the next version number for a story
 * @param storyId - The story ID
 * @returns The next version number to use
 */
export async function getNextVersion(storyId: string): Promise<number> {
  const latestVersion = await getLatestVersion(storyId);
  return latestVersion + 1;
}

/**
 * Get the URI for the latest version of a story's HTML
 * @param storyId - The story ID
 * @returns The Google Cloud Storage URI for the latest HTML version
 */
export async function getLatestVersionUri(storyId: string): Promise<string> {
  const latestVersion = await getLatestVersion(storyId);
  const filename = generateVersionedFilename(latestVersion);
  return `https://storage.googleapis.com/${bucketName}/${storyId}/${filename}`;
}

/**
 * Upload HTML content as a new version
 * @param storyId - The story ID
 * @param htmlContent - The HTML content to upload
 * @returns Object containing the new version number and URI
 */
export async function uploadNewVersion(storyId: string, htmlContent: string): Promise<{
  version: number;
  uri: string;
  filename: string;
}> {
  try {
    const nextVersion = await getNextVersion(storyId);
    const filename = generateVersionedFilename(nextVersion);
    const fullPath = `${storyId}/${filename}`;
    
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fullPath);
    
    await file.save(Buffer.from(htmlContent, 'utf-8'), {
      metadata: {
        contentType: 'text/html; charset=utf-8'
      }
    });
    
    const uri = `https://storage.googleapis.com/${bucketName}/${fullPath}`;
    
    return {
      version: nextVersion,
      uri,
      filename
    };
  } catch (error) {
    console.error('Error uploading new version for story', storyId, ':', error);
    throw new Error(`Failed to upload new version: ${error}`);
  }
}

/**
 * Convert legacy htmlUri to versioned format if needed
 * @param currentUri - The current htmlUri from the database
 * @returns The URI updated to use versioned format
 */
export async function migrateLegacyUri(currentUri: string): Promise<string> {
  // Check if the URI is already versioned
  if (currentUri.includes('story_v') && currentUri.includes('.html')) {
    return currentUri;
  }
  
  // Check if it's the legacy format (ends with /story.html)
  if (currentUri.endsWith('/story.html')) {
    // This is a legacy URI, convert it to versioned format
    const baseUri = currentUri.replace('/story.html', '');
    const filename = generateVersionedFilename(1);
    return `${baseUri}/${filename}`;
  }
  
  // If it's neither versioned nor legacy, return as-is
  return currentUri;
}

/**
 * Get all versions of a story's HTML files
 * @param storyId - The story ID
 * @returns Array of version info objects
 */
export async function getAllVersions(storyId: string): Promise<Array<{
  version: number;
  filename: string;
  uri: string;
}>> {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({
      prefix: `${storyId}/story`,
      delimiter: '/',
    });
    
    const versions = [];
    
    for (const file of files) {
      const filename = file.name.split('/').pop() || '';
      if (filename.endsWith('.html') && (filename.startsWith('story_v') || filename === 'story.html')) {
        const version = extractVersionFromFilename(filename);
        const uri = `https://storage.googleapis.com/${bucketName}/${file.name}`;
        
        versions.push({
          version,
          filename,
          uri
        });
      }
    }
    
    // Sort by version number
    return versions.sort((a, b) => a.version - b.version);
  } catch (error) {
    console.error('Error getting all versions for story', storyId, ':', error);
    return [];
  }
}
