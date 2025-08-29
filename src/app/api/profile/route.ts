import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { db } from '@/db';
import { authors, type Author } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

// Controlled vocabulary for interests
const ALLOWED_INTERESTS = [
  'adventure_exploration',
  'fantasy_magic',
  'science_discovery',
  'everyday_emotions',
  'sports',
  'comedy_fun',
  'educational'
] as const;

type ProfilePatchPayload = Partial<{
  displayName: string;
  gender: Author['gender'];
  literaryAge: Author['literaryAge'];
  primaryGoals: Author['primaryGoals']; // enum[]
  primaryGoalOther: string | null;
  audiences: Author['audiences']; // enum[]
  interests: string[] | null;
  fiscalNumber: string | null;
  mobilePhone: string | null;
  preferredLocale: string | null;
}>;

function sanitizeInterests(interests: unknown): string[] | undefined {
  if (!Array.isArray(interests)) return undefined;
  return interests
    .map(i => String(i))
    .filter((i): i is typeof ALLOWED_INTERESTS[number] => ALLOWED_INTERESTS.includes(i as typeof ALLOWED_INTERESTS[number]));
}

export async function GET() {
  const author = await getCurrentAuthor();
  if (!author) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return NextResponse.json({
    author: {
      displayName: author.displayName,
      gender: author.gender,
      literaryAge: author.literaryAge,
  fiscalNumber: author.fiscalNumber,
  mobilePhone: author.mobilePhone,
  preferredLocale: author.preferredLocale,
  primaryGoals: author.primaryGoals || [],
  primaryGoalOther: author.primaryGoalOther,
  audiences: author.audiences || [],
      interests: author.interests || []
    }
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

  const body: ProfilePatchPayload = await req.json();

    // Validation
  const updates: Partial<Pick<Author, 'displayName' | 'gender' | 'literaryAge' | 'primaryGoals' | 'primaryGoalOther' | 'audiences' | 'interests' | 'fiscalNumber' | 'mobilePhone' | 'preferredLocale'>> = {};

    if (body.displayName !== undefined) {
      const name = body.displayName.trim();
      if (!name) {
        return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
      }
      if (name.length > 120) {
        return NextResponse.json({ error: 'Display name too long' }, { status: 400 });
      }
      updates.displayName = name;
    }

    if (body.primaryGoalOther !== undefined) {
      const other = body.primaryGoalOther?.trim();
      if (other && other.length > 160) {
        return NextResponse.json({ error: 'primaryGoalOther too long' }, { status: 400 });
      }
      updates.primaryGoalOther = other || null;
    }

  if (body.gender !== undefined) updates.gender = body.gender ?? null;
  if (body.literaryAge !== undefined) updates.literaryAge = body.literaryAge ?? null;
  // Reject legacy singular fields if present
  const legacyPrimaryGoal = (body as unknown as { primaryGoal?: unknown }).primaryGoal;
  const legacyAudience = (body as unknown as { audience?: unknown }).audience;
  if (legacyPrimaryGoal !== undefined || legacyAudience !== undefined) {
    return NextResponse.json({ error: 'Legacy fields primaryGoal/audience no longer supported. Use primaryGoals[] / audiences[]' }, { status: 400 });
  }

  if (body.primaryGoals !== undefined) {
    if (!Array.isArray(body.primaryGoals)) {
      return NextResponse.json({ error: 'primaryGoals must be an array' }, { status: 400 });
    }
    // Basic validation: all values non-empty strings (enum constraint enforced by DB)
    updates.primaryGoals = body.primaryGoals.filter(Boolean) as Author['primaryGoals'];
  }

  if (body.audiences !== undefined) {
    if (!Array.isArray(body.audiences)) {
      return NextResponse.json({ error: 'audiences must be an array' }, { status: 400 });
    }
    updates.audiences = body.audiences.filter(Boolean) as Author['audiences'];
  }

  // If 'other' selected but no primaryGoalOther provided, keep existing (frontend may send separately)
  if (updates.primaryGoals && (updates.primaryGoals as string[]).includes('other') && body.primaryGoalOther === undefined) {
    // no-op
  } else if (updates.primaryGoals && !(updates.primaryGoals as string[]).includes('other')) {
    // Clear other text if 'other' removed
    updates.primaryGoalOther = null;
  }

    if (body.interests !== undefined) {
      const filtered = sanitizeInterests(body.interests);
      updates.interests = filtered || [];
    }

    // Optional contact / billing fields
    if (body.fiscalNumber !== undefined) {
      const fn = body.fiscalNumber?.trim();
      if (fn && fn.length > 40) {
        return NextResponse.json({ error: 'fiscalNumber too long' }, { status: 400 });
      }
      updates.fiscalNumber = fn || null;
    }
    if (body.mobilePhone !== undefined) {
      const mp = body.mobilePhone?.trim();
      if (mp && mp.length > 30) {
        return NextResponse.json({ error: 'mobilePhone too long' }, { status: 400 });
      }
      updates.mobilePhone = mp || null;
    }
    if (body.preferredLocale !== undefined) {
      const pl = body.preferredLocale?.trim();
      if (pl && (pl.length < 2 || pl.length > 5)) {
        return NextResponse.json({ error: 'preferredLocale invalid length' }, { status: 400 });
      }
      updates.preferredLocale = pl || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, author });
    }

  const [updated] = await db
      .update(authors)
      .set(updates)
      .where(eq(authors.authorId, author.authorId))
      .returning();

    // Sync Clerk metadata: full profile only in private; public only displayName
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUser(updated.clerkUserId, {
        privateMetadata: {
          ...( (author as unknown as { privateMetadata?: unknown }).privateMetadata || {} ),
          profile: {
            preferredName: updated.displayName,
            gender: updated.gender || null,
            literaryAge: updated.literaryAge || null,
    primaryGoals: updated.primaryGoals || [],
    primaryGoalOther: updated.primaryGoalOther || null,
    audiences: updated.audiences || [],
            interests: updated.interests || []
          }
        },
        publicMetadata: {
          displayName: updated.displayName
        }
      });
    } catch (e) {
      console.warn('Failed to sync Clerk metadata (non-fatal):', e);
    }

    return NextResponse.json({ success: true, author: {
      displayName: updated.displayName,
      gender: updated.gender,
      literaryAge: updated.literaryAge,
      fiscalNumber: updated.fiscalNumber,
      mobilePhone: updated.mobilePhone,
      preferredLocale: updated.preferredLocale,
      primaryGoals: updated.primaryGoals || [],
      primaryGoalOther: updated.primaryGoalOther,
      audiences: updated.audiences || [],
      interests: updated.interests || []
    }});
  } catch (err) {
    console.error('Profile PATCH error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
