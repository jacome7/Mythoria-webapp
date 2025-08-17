import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage();
const bucketName = process.env.STORAGE_BUCKET_NAME || 'mythoria-generated-stories';

/**
 * Get all image files from Google Cloud Storage for a specific story
 */
export async function getStoryImagesFromStorage(storyId: string): Promise<Record<string, { url: string; timeCreated?: string; updated?: string; size?: string | number; contentType?: string }>> {
  try {
    const bucket = storage.bucket(bucketName);
    const prefix = `${storyId}/images/`;
    
    // List all files in the story's images folder
    const [files] = await bucket.getFiles({
      prefix,
      delimiter: '/' // Only get files in the direct folder, not subfolders
    });

    const mediaLinks: Record<string, { url: string; timeCreated?: string; updated?: string; size?: string | number; contentType?: string }> = {};

    // Process each file and create the media links object with metadata
    for (const file of files) {
      // Skip if it's a folder (ends with /)
      if (file.name.endsWith('/')) {
        continue;
      }

      // Extract filename without the prefix
      const filename = file.name.replace(prefix, '');
      
      // Only include image files
      if (/\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
        // Get file metadata
        const [metadata] = await file.getMetadata();
        
        // Generate public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${file.name}`;
        
        // Store both URL and metadata
        mediaLinks[filename] = {
          url: publicUrl,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          size: metadata.size,
          contentType: metadata.contentType
        };
      }
    }

    console.log(`Found ${Object.keys(mediaLinks).length} images for story ${storyId}:`, Object.keys(mediaLinks));
    
    return mediaLinks;
  } catch (error) {
    console.error('Error fetching story images from Google Cloud Storage:', error);
    return {};
  }
}
