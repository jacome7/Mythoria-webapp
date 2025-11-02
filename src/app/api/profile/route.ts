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
  'educational',
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
  notificationPreference: Author['notificationPreference'];
}>;

function sanitizeInterests(interests: unknown): string[] | undefined {
  if (!Array.isArray(interests)) return undefined;
  return interests
    .map((i) => String(i))
    .filter((i): i is (typeof ALLOWED_INTERESTS)[number] =>
      ALLOWED_INTERESTS.includes(i as (typeof ALLOWED_INTERESTS)[number]),
    );
}

export async function GET() {
  const author = await getCurrentAuthor();
  if (!author) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return NextResponse.json({
    author: {
      authorId: author.authorId,
      displayName: author.displayName,
      gender: author.gender,
      literaryAge: author.literaryAge,
      fiscalNumber: author.fiscalNumber,
      mobilePhone: author.mobilePhone,
      preferredLocale: author.preferredLocale,
      primaryGoals: author.primaryGoals || [],
      primaryGoalOther: author.primaryGoalOther,
      audiences: author.audiences || [],
      interests: author.interests || [],
      notificationPreference: author.notificationPreference,
      email: author.email,
      welcomeEmailSentAt: author.welcomeEmailSentAt,
    },
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
    const updates: Partial<
      Pick<
        Author,
        | 'displayName'
        | 'gender'
        | 'literaryAge'
        | 'primaryGoals'
        | 'primaryGoalOther'
        | 'audiences'
        | 'interests'
        | 'fiscalNumber'
        | 'mobilePhone'
        | 'preferredLocale'
        | 'notificationPreference'
      >
    > = {};

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
      return NextResponse.json(
        {
          error:
            'Legacy fields primaryGoal/audience no longer supported. Use primaryGoals[] / audiences[]',
        },
        { status: 400 },
      );
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
    if (
      updates.primaryGoals &&
      (updates.primaryGoals as string[]).includes('other') &&
      body.primaryGoalOther === undefined
    ) {
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

    if (body.notificationPreference !== undefined) {
      // Value constrained by enum at DB, just basic presence validation
      updates.notificationPreference = body.notificationPreference;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, author });
    }

    // Check if this is a first-time displayName update (for welcome email trigger)
    // The welcome email should be sent when the user sets their name during onboarding
    // within 10 minutes of account creation. We detect this by checking if:
    // 1. displayName is being updated
    // 2. The new name is meaningful (> 1 char)
    // 3. The new name differs from the current stored name
    // 4. The update happens within 10 minutes of account creation
    // Note: We don't check the old displayName length because Clerk may pre-populate it
    // from email/username, but onboarding is still the first intentional name setting
    const existingDisplayName = (author.displayName || '').trim();
    const normalizedExisting = existingDisplayName.toLowerCase();
    const normalizedIncoming =
      updates.displayName !== undefined ? updates.displayName.toLowerCase() : undefined;
    const shouldTriggerWelcomeEmail =
      updates.displayName !== undefined &&
      updates.displayName.length > 1 &&
      normalizedIncoming !== normalizedExisting;

    const [updated] = await db
      .update(authors)
      .set(updates)
      .where(eq(authors.authorId, author.authorId))
      .returning();

    if (!updated) {
      console.error(
        'Profile PATCH: database update returned no row for authorId',
        author.authorId,
        'updates attempted:',
        Object.keys(updates),
      );
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Trigger welcome email if displayName was updated and account is new (within 10 minutes)
    if (shouldTriggerWelcomeEmail && updated.createdAt) {
      const ageMs = Date.now() - new Date(updated.createdAt).getTime();
      // Only send if:
      // 1. Account was created within the last 10 minutes
      // 2. Welcome email has NOT been sent yet (welcomeEmailSentAt is null)
      if (ageMs >= 0 && ageMs < 10 * 60 * 1000 && !updated.welcomeEmailSentAt) {
        try {
          const { triggerWelcomeEmailSafe } = await import('../webhooks/welcome-email');
          const effectiveLocale = updated.preferredLocale || 'en-US';
          console.log('welcome-email.attempt.profile-update', {
            authorId: updated.authorId,
            clerkUserId: updated.clerkUserId,
            ageMs,
            accountAgeMinutes: Math.floor(ageMs / 60000),
            locale: effectiveLocale,
            displayName: updated.displayName,
            email: updated.email,
          });

          // Fire and forget - don't await
          triggerWelcomeEmailSafe({
            authorId: updated.authorId,
            email: updated.email,
            name: updated.displayName,
            locale: effectiveLocale,
          })
            .then(async () => {
              // Mark the welcome email as sent in the database
              try {
                await db
                  .update(authors)
                  .set({ welcomeEmailSentAt: new Date() })
                  .where(eq(authors.authorId, updated.authorId));
                console.log('welcome-email.sent-timestamp-recorded', {
                  authorId: updated.authorId,
                });
              } catch (dbErr) {
                console.error('welcome-email.timestamp-update-failed', {
                  authorId: updated.authorId,
                  error: dbErr,
                });
              }
            })
            .catch((err) => {
              console.error('welcome-email.error.profile-update', {
                authorId: updated.authorId,
                clerkUserId: updated.clerkUserId,
                error: err,
              });
            });
        } catch (err) {
          console.error('welcome-email.import-error', { error: err });
        }
      } else {
        const skipReason = updated.welcomeEmailSentAt
          ? 'already-sent'
          : ageMs >= 10 * 60 * 1000
            ? 'account-too-old'
            : 'unknown';
        console.log('welcome-email.skipped.profile-update', {
          authorId: updated.authorId,
          reason: skipReason,
          ageMs,
          accountAgeMinutes: Math.floor(ageMs / 60000),
          welcomeEmailSentAt: updated.welcomeEmailSentAt,
        });
      }
    }

    // Sync Clerk metadata: full profile only in private; public only displayName
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUser(updated.clerkUserId, {
        privateMetadata: {
          ...((author as unknown as { privateMetadata?: unknown }).privateMetadata || {}),
          profile: {
            preferredName: updated.displayName,
            gender: updated.gender || null,
            literaryAge: updated.literaryAge || null,
            primaryGoals: updated.primaryGoals || [],
            primaryGoalOther: updated.primaryGoalOther || null,
            audiences: updated.audiences || [],
            interests: updated.interests || [],
          },
        },
        publicMetadata: {
          displayName: updated.displayName,
        },
      });
    } catch (e) {
      console.warn('Failed to sync Clerk metadata (non-fatal):', e);
    }

    return NextResponse.json({
      success: true,
      author: {
        authorId: updated.authorId,
        displayName: updated.displayName,
        gender: updated.gender,
        literaryAge: updated.literaryAge,
        fiscalNumber: updated.fiscalNumber,
        mobilePhone: updated.mobilePhone,
        preferredLocale: updated.preferredLocale,
        primaryGoals: updated.primaryGoals || [],
        primaryGoalOther: updated.primaryGoalOther,
        audiences: updated.audiences || [],
        interests: updated.interests || [],
        notificationPreference: updated.notificationPreference,
        email: updated.email,
        welcomeEmailSentAt: updated.welcomeEmailSentAt,
      },
    });
  } catch (err) {
    console.error('Profile PATCH error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
