import { db } from './src/db';
import { stories } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function diagnostic() {
  console.log('🔍 Running diagnostic for story sharing...');
  
  try {
    // Check if the slug and isPublic columns exist by trying to query them
    console.log('\n1. Checking database schema...');
    
    // First, let's check the story with the problematic slug
    const targetSlug = 'os-guardies-do-atlntico-a-aventura-do-amuleto-perdido';
    console.log(`\n2. Looking for story with slug: "${targetSlug}"`);
    
    try {
      const storyBySlug = await db
        .select({
          storyId: stories.storyId,
          title: stories.title,
          slug: stories.slug,
          isPublic: stories.isPublic,
          status: stories.status,
        })
        .from(stories)
        .where(eq(stories.slug, targetSlug))
        .limit(1);
        
      if (storyBySlug.length > 0) {
        console.log('✅ Found story:', storyBySlug[0]);
      } else {
        console.log('❌ No story found with this slug');
      }
    } catch (error) {
      console.error('❌ Error querying by slug (columns might not exist):', error);
    }
    
    // Check all public stories
    console.log('\n3. Checking all stories with public sharing...');
    try {
      const publicStories = await db
        .select({
          storyId: stories.storyId,
          title: stories.title,
          slug: stories.slug,
          isPublic: stories.isPublic,
          status: stories.status,
        })
        .from(stories)
        .where(eq(stories.isPublic, true))
        .limit(10);
        
      console.log(`Found ${publicStories.length} public stories:`);
      publicStories.forEach(story => {
        console.log(`  - "${story.title}" | slug: ${story.slug} | public: ${story.isPublic}`);
      });
    } catch (error) {
      console.error('❌ Error querying public stories:', error);
    }
    
    // Check recent stories to see if any have the title we're looking for
    console.log('\n4. Checking recent stories (last 10)...');
    try {
      const recentStories = await db
        .select({
          storyId: stories.storyId,
          title: stories.title,
          slug: stories.slug,
          isPublic: stories.isPublic,
          status: stories.status,
          createdAt: stories.createdAt,
        })
        .from(stories)
        .orderBy(stories.createdAt)
        .limit(10);
        
      console.log('Recent stories:');
      recentStories.forEach(story => {
        console.log(`  - "${story.title}" | slug: ${story.slug || 'null'} | public: ${story.isPublic || 'null'} | created: ${story.createdAt}`);
      });
    } catch (error) {
      console.error('❌ Error querying recent stories:', error);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
  
  process.exit(0);
}

diagnostic();
