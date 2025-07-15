/**
 * Test endpoint to manually trigger story generation workflow
 * This helps verify that the Pub/Sub -> Workflow integration is working
 * 
 * Usage: POST /api/test/migrate-stories
 * Body: { "storyId": "<uuid>", "runId": "<uuid>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { publishStoryRequest } from "@/lib/pubsub";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { Storage } from "@google-cloud/storage";
import { stories, chapters } from "@/db/schema/stories";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { JSDOM } from 'jsdom';

// Helper function to extract version number from filename
function extractVersionFromFilename(filename: string): number {
  const match = filename.match(/story_v(\d+)\.html$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Parser for HTML format 1 (well-structured)
function parseHtmlFormat1(htmlString: string) {
  const dom = new JSDOM(htmlString);
  const document = dom.window.document;
  
  // Extract cover images
  const frontCoverImg = document.querySelector('.mythoria-front-cover img');
  const backCoverImg = document.querySelector('.mythoria-back-cover img');
  
  const frontCoverUri = frontCoverImg?.getAttribute('src') || null;
  const backCoverUri = backCoverImg?.getAttribute('src') || null;
  
  // Extract chapters
  const chapters: Array<{
    chapterNumber: number;
    title: string;
    imageUri: string | null;
    htmlContent: string;
  }> = [];
  const chapterElements = document.querySelectorAll('.mythoria-chapter');
  
  chapterElements.forEach((chapterEl, index) => {
    const titleEl = chapterEl.querySelector('.mythoria-chapter-title');
    const imageEl = chapterEl.querySelector('.mythoria-chapter-img');
    const contentEl = chapterEl.querySelector('.mythoria-chapter-content');
    
    if (titleEl && contentEl) {
      const title = titleEl.textContent?.trim() || `Chapter ${index + 1}`;
      const imageUri = imageEl?.getAttribute('src') || null;
      const htmlContent = contentEl.innerHTML.trim();
      
      chapters.push({
        chapterNumber: index + 1,
        title,
        imageUri,
        htmlContent
      });
    }
  });
  
  if (chapters.length === 0) {
    throw new Error('No chapters found in HTML format 1');
  }
  
  return {
    frontCoverUri,
    backCoverUri,
    chapters
  };
}

// Parser for HTML format 2 (nested structure)
function parseHtmlFormat2(htmlString: string) {
  const dom = new JSDOM(htmlString);
  const document = dom.window.document;
  
  // Extract cover images
  const frontCoverImg = document.querySelector('.mythoria-front-cover + img, .mythoria-front-cover img');
  const backCoverImg = document.querySelector('.mythoria-back-cover img');
  
  const frontCoverUri = frontCoverImg?.getAttribute('src') || null;
  const backCoverUri = backCoverImg?.getAttribute('src') || null;
  
  // Extract chapters
  const chapters: Array<{
    chapterNumber: number;
    title: string;
    imageUri: string | null;
    htmlContent: string;
  }> = [];
  const chapterElements = document.querySelectorAll('.mythoria-chapter');
  
  chapterElements.forEach((chapterEl, index) => {
    const titleEl = chapterEl.querySelector('.mythoria-chapter-title, h2[level="2"]');
    const imageEl = chapterEl.querySelector('.mythoria-chapter-img');
    
    if (titleEl) {
      const title = titleEl.textContent?.trim() || `Chapter ${index + 1}`;
      const imageUri = imageEl?.getAttribute('src') || null;
      
      // Get chapter content (everything after the title and image)
      const contentElements: string[] = [];
      let currentElement = titleEl.nextElementSibling;
      
      while (currentElement && !currentElement.classList.contains('mythoria-page-break')) {
        if (currentElement.classList.contains('mythoria-chapter-image')) {
          // Skip image container, but get content after it
          currentElement = currentElement.nextElementSibling;
          continue;
        }
        
        if (currentElement.classList.contains('mythoria-chapter')) {
          // Stop if we hit another chapter
          break;
        }
        
        if (currentElement.classList.contains('mythoria-chapter-paragraph') ||
            currentElement.tagName === 'P') {
          contentElements.push(currentElement.outerHTML);
        }
        
        currentElement = currentElement.nextElementSibling;
      }
      
      const htmlContent = contentElements.join('\n').trim();
      
      if (htmlContent) {
        chapters.push({
          chapterNumber: index + 1,
          title,
          imageUri,
          htmlContent
        });
      }
    }
  });
  
  if (chapters.length === 0) {
    throw new Error('No chapters found in HTML format 2');
  }
  
  return {
    frontCoverUri,
    backCoverUri,
    chapters
  };
}

export async function POST(request: NextRequest) {
  try {
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { storyId, runId } = await request.json();

    if (!storyId) {
      return NextResponse.json(
        { error: 'storyId is required' },
        { status: 400 }
      );
    }

    // Verify the story exists and belongs to the current author
    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    let actualRunId = runId;
    
    // If no runId provided, generate a test runId
    if (!actualRunId) {
      console.log('📝 Generating test runId for test trigger...');
      // Since storyGenerationRuns table was removed, generate a temporary test ID
      actualRunId = `test-run-${Date.now()}`;
      console.log('✅ Test runId generated:', actualRunId);
    }

    // Publish Pub/Sub message to trigger the workflow
    console.log('📢 Publishing test Pub/Sub message to trigger workflow...');
    const messageId = await publishStoryRequest({
      storyId: storyId,
      runId: actualRunId,
      testTrigger: true,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Test Pub/Sub message published successfully');

    return NextResponse.json({
      success: true,
      message: 'Workflow trigger test completed successfully',
      data: {
        storyId,
        runId: actualRunId,
        messageId,
        pubsubTopic: process.env.PUBSUB_TOPIC,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Test workflow trigger failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to trigger test workflow'
      },
      { status: 500 }
    );
  }
}

/**
 * Migration utility endpoint - TEMPORARY
 * This endpoint migrates stories from HTML files to the new database structure
 * 
 * Usage: GET /api/test/migrate-stories
 * This will process all story folders in the mythoria-generated-stories bucket
 */
export async function GET() {
  try {
    console.log('🚀 Starting story migration process...');
    
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'mythoria-generated-stories';
    const bucket = storage.bucket(bucketName);
    
    // Get all folders (story IDs) in the bucket
    const [files] = await bucket.getFiles({ prefix: '' });
    const storyFolders = new Set<string>();
    
    // Extract unique story folder names
    files.forEach(file => {
      const pathParts = file.name.split('/');
      if (pathParts.length > 1) {
        storyFolders.add(pathParts[0]);
      }
    });
    
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    console.log(`📁 Found ${storyFolders.size} story folders to process`);
    
    for (const storyId of storyFolders) {
      console.log(`\n🔄 Processing story: ${storyId}`);
      results.processed++;
      
      try {
        // Check if migration already completed
        const successFile = bucket.file(`${storyId}/migrate_success.md`);
        const [successExists] = await successFile.exists();
        
        if (successExists) {
          console.log(`⏭️  Story ${storyId} already migrated, skipping`);
          results.skipped++;
          continue;
        }
        
        // Get story from database
        const [story] = await db.select().from(stories).where(eq(stories.storyId, storyId));
        
        if (!story) {
          console.log(`❌ Story ${storyId} not found in database, skipping`);
          results.skipped++;
          continue;
        }
        
        // Find the latest HTML file
        const htmlFiles = files.filter(f => 
          f.name.startsWith(`${storyId}/`) && 
          f.name.endsWith('.html') && 
          f.name.includes('story_v')
        );
        
        if (htmlFiles.length === 0) {
          throw new Error(`No HTML files found for story ${storyId}`);
        }
        
        // Find the latest version
        const latestFile = htmlFiles.reduce((latest, current) => {
          const latestVersion = extractVersionFromFilename(latest.name);
          const currentVersion = extractVersionFromFilename(current.name);
          return currentVersion > latestVersion ? current : latest;
        });
        
        console.log(`📄 Processing HTML file: ${latestFile.name}`);
        
        // Download and parse HTML content
        const [htmlContent] = await latestFile.download();
        const htmlString = htmlContent.toString('utf-8');
        
        // Parse HTML using both parsers
        let parsedData;
        try {
          parsedData = parseHtmlFormat1(htmlString);
        } catch {
          console.log('⚠️  Format 1 parser failed, trying format 2...');
          parsedData = parseHtmlFormat2(htmlString);
        }
        
        // Update story with cover images
        await db.update(stories)
          .set({
            coverUri: parsedData.frontCoverUri || null,
            backcoverUri: parsedData.backCoverUri || null,
            hasAudio: false // Default to false for now
          })
          .where(eq(stories.storyId, storyId));
        
        // Insert chapters
        for (const chapter of parsedData.chapters) {
          await db.insert(chapters).values({
            id: uuidv4(),
            storyId: storyId,
            authorId: story.authorId,
            version: 1,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            imageUri: chapter.imageUri,
            imageThumbnailUri: null, // Will be added later
            htmlContent: chapter.htmlContent,
            audioUri: null // Will be added later
          });
        }
        
        // Create success marker file
        const successContent = `# Migration Success\n\nMigration completed successfully on ${new Date().toISOString()}\n\n## Summary\n- Story ID: ${storyId}\n- Chapters migrated: ${parsedData.chapters.length}\n- Front cover: ${parsedData.frontCoverUri || 'Not found'}\n- Back cover: ${parsedData.backCoverUri || 'Not found'}\n`;
        
        await successFile.save(successContent);
        
        console.log(`✅ Story ${storyId} migrated successfully with ${parsedData.chapters.length} chapters`);
        results.succeeded++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate story ${storyId}:`, error);
        results.failed++;
        results.errors.push(`${storyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Create error marker file
        const errorFile = bucket.file(`${storyId}/migrate_error.md`);
        const errorContent = `# Migration Error\n\nMigration failed on ${new Date().toISOString()}\n\n## Error Details\n${error instanceof Error ? error.message : 'Unknown error'}\n\n## Stack Trace\n${error instanceof Error ? error.stack : 'No stack trace available'}\n`;
        
        try {
          await errorFile.save(errorContent);
        } catch (saveError) {
          console.error(`Failed to save error file for ${storyId}:`, saveError);
        }
      }
    }
    
    console.log('\n🎉 Migration process completed!');
    console.log(`📊 Results: ${results.succeeded} succeeded, ${results.failed} failed, ${results.skipped} skipped`);
    
    return NextResponse.json({
      success: true,
      message: 'Story migration completed',
      results
    });
    
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to run migration process'
      },
      { status: 500 }
    );
  }
}
