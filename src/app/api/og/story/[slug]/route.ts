import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stories, authors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    // Find the public story by slug
    const story = await db
      .select({
        title: stories.title,
        synopsis: stories.synopsis,
        plotDescription: stories.plotDescription,
        targetAudience: stories.targetAudience,
        graphicalStyle: stories.graphicalStyle,
        author: {
          displayName: authors.displayName,
        },
      })
      .from(stories)
      .leftJoin(authors, eq(authors.authorId, stories.authorId))
      .where(and(eq(stories.slug, slug), eq(stories.isPublic, true)))
      .limit(1);

    if (!story.length) {
      return new NextResponse('Story not found', { status: 404 });
    }

    const storyData = story[0];

    // Generate a simple SVG as Open Graph image
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Logo area -->
        <rect x="50" y="50" width="150" height="40" fill="rgba(255,255,255,0.2)" rx="20"/>
        <text x="125" y="75" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">Mythoria</text>
        
        <!-- Title -->
        <text x="600" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">
          ${storyData.title.length > 30 ? storyData.title.substring(0, 30) + '...' : storyData.title}
        </text>
          <!-- Author -->
        <text x="600" y="330" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="24">
          by ${storyData.author?.displayName || 'Unknown Author'}
        </text>
        
        <!-- Synopsis snippet -->
        ${
          storyData.synopsis
            ? `
          <text x="600" y="400" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="18">
            ${storyData.synopsis.length > 60 ? storyData.synopsis.substring(0, 60) + '...' : storyData.synopsis}
          </text>
        `
            : ''
        }
        
        <!-- Audience badge -->
        ${
          storyData.targetAudience
            ? `
          <rect x="500" y="480" width="200" height="30" fill="rgba(255,255,255,0.2)" rx="15"/>
          <text x="600" y="500" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14">
            ${storyData.targetAudience.replace('_', ' ').replace('-', ' to ')}
          </text>
        `
            : ''
        }
        
        <!-- Footer -->
        <text x="600" y="570" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="16">
          Create your own magical stories at Mythoria.com
        </text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new NextResponse('Error generating image', { status: 500 });
  }
}
