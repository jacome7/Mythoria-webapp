import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { detectUserLocaleFromEmail } from '@/utils/locale-utils';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }
  // Get the body
  const payload = await req.text();
  // Get the signing secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
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
        // You can add session tracking logic here if needed
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing webhook', {
      status: 500,
    });
  }
}

// (Welcome email dispatch removed – now handled fully inside notification-engine)

async function handleUserCreated(evt: WebhookEvent) {
  if (evt.type !== 'user.created') return;

  const { id, email_addresses, first_name, last_name } = evt.data;

  const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);
  
  if (!primaryEmail) {
    console.error('No primary email found for user:', id);
    return;
  }

  const userName = `${first_name || ''} ${last_name || ''}`.trim() || '';

  const userLocale = detectUserLocaleFromEmail(primaryEmail.email_address);

  try {
    // Try to insert new user first
  const [insertedAuthor] = await db.insert(authors).values({
      clerkUserId: id,
      email: primaryEmail.email_address,
      displayName: userName,
      preferredLocale: userLocale,
      lastLoginAt: new Date(),
      createdAt: new Date(),
  }).returning({ authorId: authors.authorId });
  console.log('User created in database:', id, 'for email:', primaryEmail.email_address, 'with locale:', userLocale, 'authorId:', insertedAuthor?.authorId);

  // (Welcome notification no longer sent from webapp. Responsibility moved to notification-engine.)

  } catch (error: unknown) {
    // Log the full error structure for debugging
    console.log('Error structure:', JSON.stringify(error, null, 2));
    
    // Type guard for error object
    const isDbError = (err: unknown): err is { code?: string; constraint?: string; cause?: { code?: string; constraint?: string }; message?: string } => {
      return typeof err === 'object' && err !== null;
    };

    if (isDbError(error)) {
      console.log('Error code:', error.code);
      console.log('Error constraint:', error.constraint);
      console.log('Error cause:', error.cause);

      // Check if it's a duplicate email constraint violation
      // Try multiple ways to detect the constraint violation
      const isDuplicateEmail = (
        error.code === '23505' && error.constraint === 'authors_email_unique'
      ) || (
        error.cause?.code === '23505' && error.cause?.constraint === 'authors_email_unique'
      ) || (
        error.message?.includes('duplicate key value violates unique constraint "authors_email_unique"')      );

      if (isDuplicateEmail) {
        console.log('Duplicate email detected, updating existing user with new clerkUserId:', id);
        
        try {
          // Update existing user with new clerkUserId
          await db
            .update(authors)
            .set({
              clerkUserId: id, // Update to new clerkId
              displayName: userName,
              preferredLocale: userLocale,
              lastLoginAt: new Date(),
              // Keep original createdAt, don't update it
            })
            .where(eq(authors.email, primaryEmail.email_address));

          console.log('User updated (clerkUserId changed) for email:', primaryEmail.email_address, 'with locale:', userLocale);
          
          // (Welcome notification intentionally omitted even on duplicate path.)
        } catch (updateError) {
          console.error('Error updating user after duplicate email:', updateError);
          throw updateError;
        }
      } else {
        // Re-throw other errors
        console.error('Error creating user in database:', error);
        throw error;
      }
    } else {
      // If error doesn't match expected structure, re-throw
      console.error('Unexpected error creating user in database:', error);
      throw error;
    }
  }
}

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
    const preferredName = (evt.data as any)?.private_metadata?.profile?.preferredName;
    const rebuiltName = `${first_name || ''} ${last_name || ''}`.trim() || '';
    const newDisplayName = (preferredName && typeof preferredName === 'string' && preferredName.trim()) ? preferredName.trim() : rebuiltName;

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
