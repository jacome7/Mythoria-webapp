import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { db } from "@/db";
import { stories, chapters } from "@/db/schema";
import { and, asc, eq, max } from "drizzle-orm";
import { Storage } from "@google-cloud/storage";

// Load suffix from i18n messages at runtime based on locale
type ActionsMessages = {
  Actions?: { duplicateTitleSuffix?: string };
  duplicateTitleSuffix?: string;
};

async function getDuplicateTitleSuffix(locale?: string): Promise<string> {
  const loc = locale || 'en-US';
  try {
    const actions = (await import(`@/messages/${loc}/Actions.json`).then(m => m.default)) as ActionsMessages;
    const ns = actions && Object.prototype.hasOwnProperty.call(actions, 'Actions') && actions.Actions ? actions.Actions : actions;
    return ns?.duplicateTitleSuffix || ' - copy';
  } catch {
    // Fallback to English if locale file is missing
    try {
      const actions = (await import(`@/messages/en-US/Actions.json`).then(m => m.default)) as ActionsMessages;
      const ns = actions && Object.prototype.hasOwnProperty.call(actions, 'Actions') && actions.Actions ? actions.Actions : actions;
      return ns?.duplicateTitleSuffix || ' - copy';
    } catch {
      return ' - copy';
    }
  }
}

const storage = new Storage();
const bucketName = process.env.STORAGE_BUCKET_NAME || 'mythoria-generated-stories';

// Utilities to work with URIs and Google Cloud Storage paths
function isAbsoluteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri) || /^gs:\/\//i.test(uri);
}

type ParsedUri =
  | { kind: 'gcs-gs'; bucket: string; path: string }
  | { kind: 'gcs-https-storage'; bucket: string; path: string }
  | { kind: 'gcs-https-bucket'; bucket: string; path: string }
  | { kind: 'http-other'; origin: string; path: string; search: string; hash: string }
  | { kind: 'relative'; path: string };

function parseUri(uri: string): ParsedUri {
  if (!isAbsoluteUri(uri)) {
    const p = uri.replace(/^\//, '');
    return { kind: 'relative', path: p };
  }

  if (/^gs:\/\//i.test(uri)) {
    // gs://bucket/path
    const withoutScheme = uri.replace(/^gs:\/\//i, '');
    const firstSlash = withoutScheme.indexOf('/')
    const bucket = firstSlash === -1 ? withoutScheme : withoutScheme.slice(0, firstSlash);
    const path = firstSlash === -1 ? '' : withoutScheme.slice(firstSlash + 1);
    return { kind: 'gcs-gs', bucket, path };
  }

  // https://storage.googleapis.com/bucket/path
  const m1 = uri.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/i);
  if (m1) {
    return { kind: 'gcs-https-storage', bucket: m1[1], path: m1[2] };
  }

  // https://bucket.storage.googleapis.com/path
  const m2 = uri.match(/^https?:\/\/([^.]+)\.storage\.googleapis\.com\/(.+)$/i);
  if (m2) {
    return { kind: 'gcs-https-bucket', bucket: m2[1], path: m2[2] };
  }

  // Fallback: generic HTTP(S) host, attempt to preserve origin and path
  try {
    const u = new URL(uri);
    const path = u.pathname.replace(/^\//, '');
    return { kind: 'http-other', origin: u.origin, path, search: u.search, hash: u.hash };
  } catch {
    // If URL parsing fails, treat as relative
    const p = uri.replace(/^\//, '');
    return { kind: 'relative', path: p };
  }
}

function buildAbsoluteUri(parsed: ParsedUri, newPath: string): string {
  switch (parsed.kind) {
    case 'gcs-gs':
      return `gs://${parsed.bucket}/${newPath}`;
    case 'gcs-https-storage':
      return `https://storage.googleapis.com/${parsed.bucket}/${newPath}`;
    case 'gcs-https-bucket':
      return `https://${parsed.bucket}.storage.googleapis.com/${newPath}`;
    case 'http-other':
      // Preserve query/hash only when path didn't change
      const suffix = `${parsed.search ?? ''}${parsed.hash ?? ''}`;
      return `${parsed.origin}/${newPath}${suffix}`;
    case 'relative':
    default:
      // Default to canonical GCS HTTPS URL using our configured bucket
      return `https://storage.googleapis.com/${bucketName}/${newPath}`;
  }
}

// Copy a single image if it exists, returning the new ABSOLUTE URI when copied/repointed
async function copyImageAndRewriteUri(uri: string | null | undefined, oldStoryId: string, newStoryId: string): Promise<string | null> {
  if (!uri) return null;

  const parsed = parseUri(uri);
  const originalPath = parsed.kind === 'relative' ? parsed.path : parsed.path;

  // Replace only if the storyId appears as a path segment
  const parts = originalPath.split('/');
  const idx = parts.indexOf(oldStoryId);
  const hasStoryFolder = idx >= 0;
  const newPath = hasStoryFolder ? (() => { const cp = parts.slice(); cp[idx] = newStoryId; return cp.join('/'); })() : originalPath;

  // Attempt to copy within the same bucket when we can identify a GCS bucket and the path changed
  const isGcs = parsed.kind === 'gcs-gs' || parsed.kind === 'gcs-https-storage' || parsed.kind === 'gcs-https-bucket' || parsed.kind === 'relative';
  const effectiveBucket = parsed.kind === 'gcs-gs' || parsed.kind === 'gcs-https-storage' || parsed.kind === 'gcs-https-bucket' ? parsed.bucket : bucketName;

  if (isGcs && hasStoryFolder && newPath !== originalPath) {
    try {
      const bucket = storage.bucket(effectiveBucket);
      const src = bucket.file(originalPath);
      const dest = bucket.file(newPath);
      const [exists] = await src.exists();
      if (exists) {
        await src.copy(dest);
      }
    } catch {
      // Swallow copy errors; we'll still return the rewritten URI
    }
  }

  // Always return an absolute URI that references the (potentially) new story folder
  return buildAbsoluteUri(parsed, newPath);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    const updates = await request.json();
    const updatedStory = await storyService.updateStory(storyId, updates);
    
    return NextResponse.json({ story: updatedStory });
  } catch (error) {
    console.error("Error updating story:", error);
    return NextResponse.json(
      { error: "Failed to update story" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    await storyService.deleteStory(storyId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const locale = body?.locale as string | undefined;

    if (action !== 'duplicate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Fetch and verify original story
    const original = await storyService.getStoryById(storyId);
    if (!original || original.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Only allow duplicating published stories
    if (original.status !== 'published') {
      return NextResponse.json({ error: 'Only published stories can be duplicated' }, { status: 400 });
    }

  const suffix = await getDuplicateTitleSuffix(locale);
    const newTitle = `${original.title}${suffix}`;

    // Begin transaction – create new story id, copy images, duplicate chapters
    const result = await db.transaction(async (tx) => {
      // 1) Create new story with minimal fields to get new ID
      const [newStory] = await tx
        .insert(stories)
        .values({
          authorId: original.authorId,
          title: newTitle,
          plotDescription: original.plotDescription ?? null,
          storyLanguage: (locale as string | undefined) || original.storyLanguage,
          synopsis: original.synopsis ?? null,
          place: original.place ?? null,
          additionalRequests: original.additionalRequests ?? null,
          imageGenerationInstructions: original.imageGenerationInstructions ?? null,
          targetAudience: original.targetAudience ?? null,
          novelStyle: original.novelStyle ?? null,
          graphicalStyle: original.graphicalStyle ?? null,
          status: 'published',
          // Sharing and media – will be updated below after GCS copy
          slug: null,
          isPublic: false,
          // feature image is not guaranteed to be present or required for duplication; will be set after targeted copies if needed
          featureImageUri: null,
          coverUri: null,
          backcoverUri: null,
          hasAudio: false,
          audiobookUri: null,
          audiobookStatus: null,
          interiorPdfUri: null,
          coverPdfUri: null,
          customAuthor: original.customAuthor ?? null,
          dedicationMessage: original.dedicationMessage ?? null,
          chapterCount: original.chapterCount,
          storyGenerationStatus: null,
          storyGenerationCompletedPercentage: 0,
        })
        .returning();

      const newStoryId = newStory.storyId;

  // 2) Copy only referenced images (cover/backcover and those in chapter image URIs) and compute updated ABSOLUTE URIs
  const copiedCoverUri = await copyImageAndRewriteUri(original.coverUri, original.storyId, newStoryId);
  const copiedBackcoverUri = await copyImageAndRewriteUri(original.backcoverUri, original.storyId, newStoryId);

      // 3) Compute updated media URIs for story
      const updateFields: Partial<typeof stories.$inferInsert> = {};
      // If original had cover/backcover, replace storyId in relative paths
      if (copiedCoverUri) {
        updateFields.coverUri = copiedCoverUri;
      }
      if (copiedBackcoverUri) {
        updateFields.backcoverUri = copiedBackcoverUri;
      }
  // Do not copy or set featureImageUri as per simplified image-copy rules

      // 4) Apply updates to new story
      const [finalStory] = await tx
        .update(stories)
        .set(updateFields)
        .where(eq(stories.storyId, newStoryId))
        .returning();

      // 5) Duplicate only latest version of each chapter, reset version to 1
      const latestVersions = tx
        .select({
          chapterNumber: chapters.chapterNumber,
          latestVersion: max(chapters.version).as('latest_version'),
        })
        .from(chapters)
        .where(eq(chapters.storyId, original.storyId))
        .groupBy(chapters.chapterNumber)
        .as('lv');

      const latestChapters = await tx
        .select({
          id: chapters.id,
          chapterNumber: chapters.chapterNumber,
          title: chapters.title,
          imageUri: chapters.imageUri,
          imageThumbnailUri: chapters.imageThumbnailUri,
          htmlContent: chapters.htmlContent,
          audioUri: chapters.audioUri,
          version: chapters.version,
          authorId: chapters.authorId,
        })
        .from(chapters)
        .innerJoin(
          latestVersions,
          and(
            eq(chapters.chapterNumber, latestVersions.chapterNumber),
            eq(chapters.version, latestVersions.latestVersion),
            eq(chapters.storyId, original.storyId)
          )
        )
        .orderBy(asc(chapters.chapterNumber));

      for (const ch of latestChapters) {
        // Copy chapter images if referenced and point to the same version in the new folder, return ABSOLUTE URIs
        const newImageUri = await copyImageAndRewriteUri(ch.imageUri, original.storyId, newStoryId);
        const newImageThumbUri = await copyImageAndRewriteUri(ch.imageThumbnailUri, original.storyId, newStoryId);
        await tx.insert(chapters).values({
          storyId: newStoryId,
          authorId: author.authorId,
          title: ch.title,
          htmlContent: ch.htmlContent,
          chapterNumber: ch.chapterNumber,
          version: 1,
          imageUri: newImageUri,
          imageThumbnailUri: newImageThumbUri,
          audioUri: null,
        });
      }

      return finalStory;
    });

    return NextResponse.json({ success: true, story: result });
  } catch (error) {
    console.error('Error duplicating story:', error);
    return NextResponse.json({ error: 'Failed to duplicate story' }, { status: 500 });
  }
}
