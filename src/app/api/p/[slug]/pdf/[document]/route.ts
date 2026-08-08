import { NextResponse } from 'next/server';
import { storyService } from '@/db/services';
import {
  getConfiguredStorageUrl,
  getFeaturedStoryPdfFilename,
  getFeaturedStoryPdfUri,
  isPublicStoryPdfDocument,
} from '@/lib/public-story-pdf';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; document: string }> },
) {
  const { slug, document } = await params;
  if (!slug || !isPublicStoryPdfDocument(document)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const story = await storyService.getStoryBySlug(slug);
    const pdfUri = story ? getFeaturedStoryPdfUri(story, document) : null;
    if (!story || !pdfUri) {
      return new NextResponse(null, { status: 404 });
    }

    const storageUrl = getConfiguredStorageUrl(pdfUri);
    if (!storageUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const sourceResponse = await fetch(storageUrl);
    if (!sourceResponse.ok || !sourceResponse.body) {
      return new NextResponse(null, { status: sourceResponse.status === 404 ? 404 : 502 });
    }

    const filename = getFeaturedStoryPdfFilename(story.title, document);
    const contentLength = sourceResponse.headers.get('content-length');
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(sourceResponse.body, { headers });
  } catch (error) {
    console.error('Failed to serve featured story PDF', { slug, document, error });
    return new NextResponse(null, { status: 502 });
  }
}
