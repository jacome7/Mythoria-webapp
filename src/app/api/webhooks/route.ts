import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { detectUserLocaleFromEmail } from '@/utils/locale-utils';
import { authorService } from '@/db/services';
import { creditLedger } from '@/db/schema';

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 });
  }

  const payload = await req.text();
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', { status: 400 });
  }

  const eventType = evt.type;
  console.log(`Webhook received: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt);
        break;
      case 'user.updated':
        await handleUserUpdated(evt);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt);
        break;
      case 'session.created':
        console.log('Session created for user:', evt.data.user_id);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}

// NOTE: We (re)introduce a direct welcome email trigger here so that the email
// is sent immediately upon confirmed user + author creation, rather than
// relying on an external derivation cycle. This call is designed to be
// idempotent: notification-engine's /email/template endpoint supports
// (templateId, authorId) pairing for dedupe via ruleKey/entityId mapping.

async function handleUserCreated(evt: WebhookEvent) {
  if (evt.type !== 'user.created') return;

  const { id, email_addresses, first_name, last_name } = evt.data;
  const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id);
  if (!primaryEmail) {
    console.error('No primary email found for user:', id);
    return;
  }

  const userName = `${first_name || ''} ${last_name || ''}`.trim() || '';
  const userLocale = detectUserLocaleFromEmail(primaryEmail.email_address);

  // Idempotency guard: if author already exists (perhaps created on sign-in) just ensure data is up to date.
  const existing = await db.select({ authorId: authors.authorId }).from(authors).where(eq(authors.clerkUserId, id)).limit(1);
  if (existing.length > 0) {
    await db.update(authors)
      .set({ displayName: userName, preferredLocale: userLocale, lastLoginAt: new Date() })
      .where(eq(authors.clerkUserId, id));

    // Ensure initial credits exist (race-safe check)
    await ensureInitialCredits(existing[0].authorId);
    console.log('Webhook user already existed, ensured initial credits:', id);
    return;
  }

  try {
    const author = await authorService.createAuthor({
      clerkUserId: id,
      email: primaryEmail.email_address,
      displayName: userName,
      preferredLocale: userLocale,
    });
    console.log('User created in database via webhook service logic:', id, 'email:', primaryEmail.email_address, 'authorId:', author.authorId);
  } catch (err) {
    // If creation failed due to duplicate email (possible race with other flow), attempt to link clerkUserId to existing email.
    const message = (err as { message?: string }).message || '';
    const isDup = message.includes('duplicate key value') && message.includes('authors_email_unique');
    if (isDup) {
      await db.update(authors)
        .set({ clerkUserId: id, displayName: userName, preferredLocale: userLocale, lastLoginAt: new Date() })
        .where(eq(authors.email, primaryEmail.email_address));
      // Fetch updated author to run credit guard
      const [updated] = await db.select({ authorId: authors.authorId }).from(authors).where(eq(authors.clerkUserId, id));
      if (updated) await ensureInitialCredits(updated.authorId);
      console.log('Duplicate email on webhook, updated existing author and ensured credits for:', primaryEmail.email_address);
      // No welcome email dispatch here; handled by user.updated heuristic.
    } else {
      console.error('Failed to create user via webhook:', err);
      throw err;
    }
  }
}

async function ensureInitialCredits(authorId: string) {
  // Check if initialCredit already exists
  const existingInitial = await db.select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.authorId, authorId), eq(creditLedger.creditEventType, 'initialCredit')))
    .limit(1);
  if (existingInitial.length > 0) return; // Already initialized
  // Reuse pricingService logic via authorService path already handled normally; here just be safe.
  // We import dynamically to avoid circular import (pricingService imported indirectly in authorService)
  const { pricingService } = await import('@/db/services/pricing');
  const { creditService } = await import('@/db/services');
  const amount = await pricingService.getInitialAuthorCredits();
  if (amount > 0) {
    await creditService.initializeAuthorCredits(authorId, amount); // This function itself will become idempotent after our patch.
  }
}

// Fire-and-forget welcome email trigger with defensive error handling.
// Does not throw; logs failures. Idempotency is enforced by notification-engine
// using (templateId=welcome, authorId) mapping to a unique rule key.
// triggerWelcomeEmailSafe moved to separate module for testability.

async function handleUserUpdated(evt: WebhookEvent) {
  if (evt.type !== 'user.updated') return;

  const { id, email_addresses, first_name, last_name } = evt.data;

  const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);
  
  if (!primaryEmail) {
    console.error('No primary email found for user:', id);
    return;
  }

  try {
    // Respect a user-defined preferred name if present in private metadata (set via profile PATCH)
    // Clerk webhooks include private_metadata and public_metadata in evt.data.
    // We store preferred name at private_metadata.profile.preferredName.
    // If present, we use that instead of rebuilding from first/last names so that
    // profile PATCHes are not immediately reverted by this webhook.
    // If not present, we fall back to "first last" as before.
    // Safely extract preferredName without using 'any'. The Clerk typings do not (yet) expose
    // the nested shape of private_metadata, so we defensively narrow at runtime.
    const extractPreferredName = (e: WebhookEvent): string | undefined => {
      const data: unknown = e.data;
      if (typeof data !== 'object' || data === null) return undefined;
      const privateMetadata = (data as { private_metadata?: { profile?: { preferredName?: unknown } } }).private_metadata;
      const candidate = privateMetadata?.profile?.preferredName;
      return (typeof candidate === 'string' && candidate.trim()) ? candidate.trim() : undefined;
    };

    const preferredName = extractPreferredName(evt);
    const rebuiltName = `${first_name || ''} ${last_name || ''}`.trim() || '';
    const newDisplayName = preferredName ?? rebuiltName;

    // Try updating by clerkUserId first
    const updateResult = await db
      .update(authors)
      .set({
        email: primaryEmail.email_address,
        displayName: newDisplayName,
        lastLoginAt: new Date(),
      })
      .where(eq(authors.clerkUserId, id));    // If no rows were updated, the clerkUserId might have changed
    // Try to find and update by email instead
    if ((updateResult.rowCount || 0) === 0) {
      console.log('No user found with clerkUserId:', id, 'trying to update by email:', primaryEmail.email_address);
      
      const emailUpdateResult = await db
        .update(authors)
        .set({
          clerkUserId: id, // Update the clerkUserId
          displayName: newDisplayName,
          lastLoginAt: new Date(),
        })
        .where(eq(authors.email, primaryEmail.email_address));

      if ((emailUpdateResult.rowCount || 0) > 0) {
        console.log('User updated by email - clerkUserId changed for:', primaryEmail.email_address);
      } else {
        console.warn('No user found with email:', primaryEmail.email_address, 'for update');
      }
    } else {
      console.log('User updated in database:', id);
    }
  } catch (error) {
    console.error('Error updating user in database:', error);
    throw error;
  }

  // Welcome email heuristic (author displayName based)
  try {
    const createdAtMs = (evt.data as unknown as { created_at?: number }).created_at;
    if (typeof createdAtMs === 'number' && createdAtMs > 0) {
      const ageMs = Date.now() - createdAtMs;
      if (ageMs >= 0 && ageMs < 10 * 60 * 1000) { // within 10 minutes
        // Fetch persisted displayName and locale
        const authorRow = (await db
          .select({ displayName: authors.displayName, preferredLocale: authors.preferredLocale })
          .from(authors)
          .where(eq(authors.clerkUserId, id))
          .limit(1))[0];
        if (authorRow) {
          const effectiveName = (authorRow.displayName || '').trim();
            if (effectiveName.length > 1) {
              const locale = authorRow.preferredLocale || detectUserLocaleFromEmail(primaryEmail.email_address) || 'en-US';
              const { notificationFetch } = await import('@/lib/notification-client');
              console.log('welcome-email.attempt', { clerkUserId: id, ageMs, locale, displayName: effectiveName });
              const res = await notificationFetch('/email/template', {
                method: 'POST',
                body: JSON.stringify({
                  templateId: 'welcome',
                  // Provide both authorId (for enrichment) and entityId (dedupe key)
                  authorId: id,
                  entityId: id,
                  recipients: [{ email: primaryEmail.email_address, name: effectiveName, language: locale }],
                  variables: { userName: effectiveName },
                }),
              });
              if (!res.ok) {
                const txt = await res.text().catch(() => '');
                console.warn('welcome-email.failed', { clerkUserId: id, status: res.status, body: txt.slice(0, 500) });
              } else {
                console.log('welcome-email.sent', { clerkUserId: id });
              }
            }
        }
      }
    }
  } catch (err) {
    console.error('welcome-email.error', { clerkUserId: id, error: err });
  }
}

async function handleUserDeleted(evt: WebhookEvent) {
  if (evt.type !== 'user.deleted') return;

  const { id } = evt.data;

  if (!id) {
    console.error('No user ID found for deletion');
    return;
  }

  try {
    // Try deleting by clerkUserId first
    const deleteResult = await db
      .delete(authors)
      .where(eq(authors.clerkUserId, id));

    if ((deleteResult.rowCount || 0) > 0) {
      console.log('User deleted from database:', id);
    } else {
      console.warn('No user found with clerkUserId:', id, 'for deletion');
      // Note: For deletion, we don't try to delete by email as that could be dangerous
      // without additional verification from the webhook payload
    }
  } catch (error) {
    console.error('Error deleting user from database:', error);
    throw error;
  }
}
