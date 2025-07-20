import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { pricingService } from '@/db/services';

/**
 * Detect user's preferred locale from webhook context or other indicators
 */
function detectUserLocale(email: string, webhookHeaders?: Headers): string {
  // First, try to detect from the webhook request headers/context
  // (This would need additional context passing which we don't have access to in webhooks)
  
  // For now, fall back to email domain detection until the client-side sync takes over
  if (email.endsWith('.pt') || email.includes('@mythoria.pt') || email.includes('.pt')) {
    return 'pt-PT';
  }
  
  // Default to English for all other cases
  // Note: The LocaleSync component will update this to the correct locale
  // based on the user's actual webapp usage within 2 minutes of sign-up
  return 'en-US';
}

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

/**
 * Send welcome notification to newly registered user
 */
async function sendWelcomeNotification(email: string, name: string) {
  const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL;
  const notificationEngineApiKey = process.env.NOTIFICATION_ENGINE_API_KEY;
  
  if (!notificationEngineUrl) {
    console.warn('NOTIFICATION_ENGINE_URL not configured, skipping welcome notification');
    return;
  }

  try {
    // Get dynamic story credits amount
    const storyCredits = await pricingService.getInitialAuthorCredits();
    
    // Use the same locale detection logic as user creation
    const language = detectUserLocale(email);
    
    const notificationPayload = {
      templateId: 'welcome',
      recipients: [
        {
          email: email,
          name: name,
          language: language
        }
      ],
      variables: {
        name: name,
        storyCredits: storyCredits,
        currentDate: new Date().toISOString()
      },
      priority: 'normal',
      metadata: {
        source: 'user_signup',
        userEmail: email
      }
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (notificationEngineApiKey) {
      headers['Authorization'] = `Bearer ${notificationEngineApiKey}`;
    }

    console.log('Sending welcome notification to:', email, 'Language:', language, 'Credits:', storyCredits);
    
    const response = await fetch(`${notificationEngineUrl}/email/template`, {
      method: 'POST',
      headers,
      body: JSON.stringify(notificationPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notification API responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Welcome notification sent successfully:', result);
    
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    throw error;
  }
}

async function handleUserCreated(evt: WebhookEvent) {
  if (evt.type !== 'user.created') return;

  const { id, email_addresses, first_name, last_name } = evt.data;

  const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);
  
  if (!primaryEmail) {
    console.error('No primary email found for user:', id);
    return;
  }

  const userName = `${first_name || ''} ${last_name || ''}`.trim() || 'Anonymous User';

  const userLocale = detectUserLocale(primaryEmail.email_address);

  try {
    // Try to insert new user first
    await db.insert(authors).values({
      clerkUserId: id,
      email: primaryEmail.email_address,
      displayName: userName,
      preferredLocale: userLocale,
      lastLoginAt: new Date(),
      createdAt: new Date(),
    });
    console.log('User created in database:', id, 'for email:', primaryEmail.email_address, 'with locale:', userLocale);

    // Send welcome notification (don't block user creation if this fails)
    try {
      await sendWelcomeNotification(primaryEmail.email_address, userName);
      console.log('Welcome notification sent successfully for user:', id);
    } catch (notificationError) {
      console.error('Failed to send welcome notification for user:', id, 'Error:', notificationError);
      // We don't re-throw this error - user creation should still succeed
    }

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
          
          // Send welcome notification for this "new" user account (don't block if fails)
          try {
            await sendWelcomeNotification(primaryEmail.email_address, userName);
            console.log('Welcome notification sent successfully for updated user:', id);
          } catch (notificationError) {
            console.error('Failed to send welcome notification for updated user:', id, 'Error:', notificationError);
          }
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
    // Try updating by clerkUserId first
    const updateResult = await db
      .update(authors)
      .set({
        email: primaryEmail.email_address,
        displayName: `${first_name || ''} ${last_name || ''}`.trim() || 'Anonymous User',
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
          displayName: `${first_name || ''} ${last_name || ''}`.trim() || 'Anonymous User',
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
