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
 * Get the next version number for a story with concurrency protection
 * @param storyId - The story ID
 * @returns The next version number to use
 */
export async function getNextVersionWithLock(storyId: string): Promise<number> {
  // For now, we'll use the existing getNextVersion but add some randomization
  // to reduce collision probability. In a production system, you'd want 
  // proper distributed locking (Redis, etc.)
  const latestVersion = await getLatestVersion(storyId);
  
  // Add small random delay to reduce race conditions
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  
  // Re-check latest version after delay
  const recheckVersion = await getLatestVersion(storyId);
  
  return Math.max(latestVersion, recheckVersion) + 1;
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
 * Upload HTML content as a new version with verification and retry logic
 * @param storyId - The story ID
 * @param htmlContent - The HTML content to upload
 * @returns Object containing the new version number and URI
 */
export async function uploadNewVersion(storyId: string, htmlContent: string): Promise<{
  version: number;
  uri: string;
  filename: string;
}> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get next version with concurrency protection
      const nextVersion = await getNextVersionWithLock(storyId);
      const filename = generateVersionedFilename(nextVersion);
      const fullPath = `${storyId}/${filename}`;
      
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(fullPath);
      
      // Check if file already exists (race condition protection)
      const [exists] = await file.exists();
      if (exists) {
        console.warn(`File ${fullPath} already exists, retrying with new version...`);
        continue; // Retry with a new version number
      }
      
      // Upload the file
      await file.save(Buffer.from(htmlContent, 'utf-8'), {
        metadata: {
          contentType: 'text/html; charset=utf-8'
        },
        resumable: false, // Use simple upload for small files
        timeout: 30000 // 30 second timeout
      });
      
      // Verify the upload succeeded by checking file exists and has correct size
      const [uploadExists] = await file.exists();
      if (!uploadExists) {
        throw new Error('File upload completed but file does not exist in storage');
      }
        // Get file metadata to verify upload integrity
      const [metadata] = await file.getMetadata();
      const expectedSize = Buffer.byteLength(htmlContent, 'utf-8');
      const actualSize = typeof metadata.size === 'string' 
        ? parseInt(metadata.size, 10) 
        : metadata.size || 0;
      
      if (actualSize !== expectedSize) {
        throw new Error(`File size mismatch: expected ${expectedSize} bytes, got ${actualSize} bytes`);
      }
      
      const uri = `https://storage.googleapis.com/${bucketName}/${fullPath}`;
      
      console.log(`Successfully uploaded and verified ${fullPath} (${actualSize} bytes)`);
      
      return {
        version: nextVersion,
        uri,
        filename
      };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Upload attempt ${attempt}/${maxRetries} failed for story ${storyId}:`, error);
      
      if (attempt === maxRetries) {
        break; // Exit retry loop on final attempt
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // If we get here, all retries failed
  console.error(`All ${maxRetries} upload attempts failed for story ${storyId}`);
  throw new Error(`Failed to upload new version after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Rollback an uploaded file in case of database update failure
 * @param storyId - The story ID
 * @param filename - The filename to delete
 */
export async function rollbackUploadedFile(storyId: string, filename: string): Promise<void> {
  try {
    const bucket = storage.bucket(bucketName);
    const fullPath = `${storyId}/${filename}`;
    const file = bucket.file(fullPath);
    
    // Check if file exists before attempting deletion
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`Successfully deleted rollback file: ${fullPath}`);
    } else {
      console.log(`Rollback file does not exist: ${fullPath}`);
    }
  } catch (error) {
    console.error(`Error during rollback of file ${storyId}/${filename}:`, error);
    throw new Error(`Failed to rollback uploaded file: ${error}`);
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

/**
 * Verify that a story's HTML file actually exists in Google Cloud Storage
 * @param storyId - The story ID
 * @param htmlUri - The HTML URI to verify
 * @returns Object with verification results
 */
export async function verifyStoryFileExists(storyId: string, htmlUri: string): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: Date;
  error?: string;
}> {
  try {
    // Extract filename from URI
    const url = new URL(htmlUri);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 2) {
      return { exists: false, error: 'Invalid URI format' };
    }
    
    const filename = pathParts[pathParts.length - 1];
    const fullPath = `${storyId}/${filename}`;
    
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fullPath);
    
    const [exists] = await file.exists();
    
    if (!exists) {
      return { exists: false, error: 'File does not exist in storage' };
    }
    
    // Get file metadata
    const [metadata] = await file.getMetadata();
    const size = typeof metadata.size === 'string' 
      ? parseInt(metadata.size, 10) 
      : metadata.size || 0;
    const lastModified = metadata.timeCreated ? new Date(metadata.timeCreated) : undefined;
    
    return {
      exists: true,
      size,
      lastModified
    };
    
  } catch (error) {
    console.error(`Error verifying story file ${storyId}:`, error);
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Diagnose potential inconsistencies between database and Google Cloud Storage
 * @param storyId - The story ID to check
 * @param expectedUri - The URI that should exist according to the database
 * @returns Diagnostic information
 */
export async function diagnoseStorageInconsistency(storyId: string, expectedUri: string): Promise<{
  consistent: boolean;
  issues: string[];
  recommendations: string[];
  availableVersions: Array<{ version: number; filename: string; uri: string; }>;
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check if the expected file exists
    const verification = await verifyStoryFileExists(storyId, expectedUri);
    
    if (!verification.exists) {
      issues.push(`Expected file does not exist: ${expectedUri}`);
      if (verification.error) {
        issues.push(`Verification error: ${verification.error}`);
      }
    }
    
    // Get all available versions to see what actually exists
    const availableVersions = await getAllVersions(storyId);
    
    if (availableVersions.length === 0) {
      issues.push('No HTML files found in Google Cloud Storage for this story');
      recommendations.push('Story may need to be regenerated');
    } else {
      // Check if there's a version mismatch
      const expectedVersion = extractVersionFromFilename(expectedUri.split('/').pop() || '');
      const latestVersion = Math.max(...availableVersions.map(v => v.version));
      
      if (expectedVersion < latestVersion) {
        issues.push(`Database points to version ${expectedVersion} but latest available is version ${latestVersion}`);
        recommendations.push(`Consider updating database to point to version ${latestVersion}`);
      }
      
      if (expectedVersion > latestVersion) {
        issues.push(`Database points to version ${expectedVersion} but latest available is only version ${latestVersion}`);
        recommendations.push(`Database may have been updated with a non-existent version`);
      }
    }
    
    return {
      consistent: issues.length === 0,
      issues,
      recommendations,
      availableVersions
    };
    
  } catch (error) {
    issues.push(`Error during diagnosis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      consistent: false,
      issues,
      recommendations: ['Manual investigation required'],
      availableVersions: []
    };
  }
}
