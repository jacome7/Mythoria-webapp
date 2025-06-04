import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authorService } from '@/db/services';

// Debugging helper function
function logWebhookDebug(message: string, data?: Record<string, unknown> | unknown) {
  const isDebugMode = process.env.CLERK_DEBUG === 'true';
  const logLevel = process.env.CLERK_LOG_LEVEL;
  
  if (isDebugMode || logLevel === 'debug') {
    console.log(`[Clerk Webhook Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

interface ClerkUserWebhookData {
  id: string;
  email_addresses?: Array<{
    id: string;
    email_address: string;
  }>;
  phone_numbers?: Array<{
    id: string;
    phone_number: string;
  }>;
  primary_email_address_id?: string | null;
  primary_phone_number_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}

export async function POST(req: NextRequest) {
  logWebhookDebug('Webhook POST request received', {
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    contentType: req.headers.get('content-type'),
  });

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  logWebhookDebug('Webhook headers received', {
    hasSvixId: !!svix_id,
    hasSvixTimestamp: !!svix_timestamp,
    hasSvixSignature: !!svix_signature,
    svixId: svix_id?.substring(0, 20) + '...' || '[MISSING]',
    svixTimestamp: svix_timestamp || '[MISSING]',
    allHeaders: Object.fromEntries(headerPayload.entries()),
  });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    logWebhookDebug('Missing required Svix headers');
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.text();
  
  logWebhookDebug('Webhook payload received', {
    payloadLength: payload.length,
    payloadPreview: payload.substring(0, 200) + (payload.length > 200 ? '...' : ''),
  });

  // Create a new Svix instance with your secret.
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  logWebhookDebug('Webhook secret configuration', {
    hasWebhookSecret: !!webhookSecret,
    hasLegacySecret: !!process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    secretPrefix: webhookSecret?.substring(0, 10) + '...' || '[MISSING]',
  });

  const wh = new Webhook(webhookSecret!);

  let evt: WebhookEvent;
  // Verify the payload with the headers
  try {
    logWebhookDebug('Attempting to verify webhook signature');
    
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
      logWebhookDebug('Webhook signature verified successfully', {
      eventType: evt.type,
      eventId: evt.data.id,
      eventTimestamp: svix_timestamp || new Date().toISOString(),
    });
  } catch (err) {
    logWebhookDebug('Webhook verification failed', {
      error: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      hasWebhookSigningSecret: !!process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      payloadLength: payload.length,
      headers: { svix_id, svix_timestamp, svix_signature }
    });
    
    console.error('Error verifying webhook:', err);
    console.error('Webhook verification details:', {
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      hasWebhookSigningSecret: !!process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      payloadLength: payload.length,
      headers: { svix_id, svix_timestamp, svix_signature }
    });
    
    return new Response(`Webhook verification failed: ${err instanceof Error ? err.message : String(err)}`, {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  logWebhookDebug('Processing webhook event', {
    eventType,
    eventId: evt.data.id,
    timestamp: new Date().toISOString(),
  });
  
  console.log(`Received webhook with ID ${evt.data.id} and event type of ${eventType}`);

  if (evt.type === 'session.created') {
    // This event fires every time a user signs in
    const sessionData = evt.data as { user_id?: string };
    
    logWebhookDebug('Processing session.created event', {
      userId: sessionData.user_id || '[MISSING]',
      sessionData: sessionData,
    });

    try {
      // Get the user ID from the session and fetch the full user data
      const userId = sessionData.user_id;
      if (userId) {
        logWebhookDebug('Updating login time for user', { userId });
        
        // The sync function will handle existing users by updating lastLoginAt
        const existingAuthor = await authorService.getAuthorByClerkId(userId);
        if (existingAuthor) {
          // Update last login time for existing user
          const currentTime = new Date();
          await db
            .update(authors)
            .set({ lastLoginAt: currentTime })
            .where(eq(authors.clerkUserId, userId));
          
          logWebhookDebug('Successfully updated existing user login time', {
            userId,
            authorId: existingAuthor.authorId,
            lastLoginAt: currentTime.toISOString(),
          });
          
          console.log('Updated existing user login time:', userId);
        } else {
          logWebhookDebug('User not found in database during session.created', { userId });
        }
        // Note: If user doesn't exist, they should be created via user.created webhook
      } else {
        logWebhookDebug('No user_id in session.created event data');
      }
    } catch (error) {
      logWebhookDebug('Error updating user login time', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      console.error('Error updating user login time:', error);
      return new Response('Error updating user login time', {
        status: 500,
      });
    }
  }

  if (evt.type === 'user.created') {
    const userData = evt.data as ClerkUserWebhookData;
    const { id, email_addresses, first_name, last_name, phone_numbers } = userData;

    logWebhookDebug('Processing user.created event', {
      userId: id,
      emailCount: email_addresses?.length || 0,
      phoneCount: phone_numbers?.length || 0,
      firstName: first_name || '[NONE]',
      lastName: last_name || '[NONE]',
      username: userData.username || '[NONE]',
    });

    try {
      // Create a user object in the same format as Clerk's currentUser()
      const userForSync = {
        id,
        emailAddresses: email_addresses?.map((email) => ({ 
          id: email.id, 
          emailAddress: email.email_address 
        })),
        phoneNumbers: phone_numbers?.map((phone) => ({ 
          id: phone.id, 
          phoneNumber: phone.phone_number 
        })),
        primaryEmailAddressId: userData.primary_email_address_id,
        primaryPhoneNumberId: userData.primary_phone_number_id,
        firstName: first_name,
        lastName: last_name,
        username: userData.username
      };

      logWebhookDebug('Creating new author via webhook', { userForSync });
      
      const newAuthor = await authorService.syncUserOnSignIn(userForSync, true);
      
      logWebhookDebug('Successfully created author via webhook', {
        authorId: newAuthor.authorId,
        clerkUserId: newAuthor.clerkUserId,
        email: newAuthor.email,
        displayName: newAuthor.displayName,
      });
      
      console.log('Successfully created author via webhook:', newAuthor);
    } catch (error) {
      logWebhookDebug('Error creating author in database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: id,
      });
      
      console.error('Error creating author in database:', error);
      return new Response('Error creating user in database', {
        status: 500,
      });
    }
  }

  if (evt.type === 'user.updated') {
    const userData = evt.data as ClerkUserWebhookData;
    const { id, email_addresses, first_name, last_name, phone_numbers } = userData;

    logWebhookDebug('Processing user.updated event', {
      userId: id,
      emailCount: email_addresses?.length || 0,
      phoneCount: phone_numbers?.length || 0,
      firstName: first_name || '[NONE]',
      lastName: last_name || '[NONE]',
    });

    try {
      // Create a user object in the same format as Clerk's currentUser()
      const userForSync = {
        id,
        emailAddresses: email_addresses?.map((email) => ({ 
          id: email.id, 
          emailAddress: email.email_address 
        })),
        phoneNumbers: phone_numbers?.map((phone) => ({ 
          id: phone.id, 
          phoneNumber: phone.phone_number 
        })),
        primaryEmailAddressId: userData.primary_email_address_id,
        primaryPhoneNumberId: userData.primary_phone_number_id,
        firstName: first_name,
        lastName: last_name,
        username: userData.username
      };

      // Update user information
      const primaryEmail = email_addresses?.find((email) => email.id === userData.primary_email_address_id);
      const primaryPhone = phone_numbers?.find((phone) => phone.id === userData.primary_phone_number_id);
      const displayName = authorService.buildDisplayName(userForSync);
      
      const updateData: Record<string, unknown> = {
        email: primaryEmail?.email_address || email_addresses?.[0]?.email_address || '',
        displayName,
      };
      
      if (primaryPhone?.phone_number) {
        updateData.mobilePhone = primaryPhone.phone_number;
      }

      logWebhookDebug('Updating author data', {
        userId: id,
        updateData,
      });

      await db.update(authors)
        .set(updateData)
        .where(eq(authors.clerkUserId, id));

      logWebhookDebug('Successfully updated author', {
        userId: id,
        updatedFields: Object.keys(updateData),
      });

      console.log('Successfully updated author with Clerk ID:', id);
    } catch (error) {
      logWebhookDebug('Error updating author in database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: id,
      });
      
      console.error('Error updating author in database:', error);
      return new Response('Error updating user in database', {
        status: 500,
      });
    }
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data;

    logWebhookDebug('Processing user.deleted event', { userId: id });

    if (!id) {
      logWebhookDebug('Missing user ID in user.deleted event');
      return new Response('Error: Missing user ID', { status: 400 });
    }

    try {
      // Delete user from our database (or mark as deleted)
      await db.delete(authors).where(eq(authors.clerkUserId, id));
      
      logWebhookDebug('Successfully deleted author', { userId: id });
      console.log('Successfully deleted author with Clerk ID:', id);
    } catch (error) {
      logWebhookDebug('Error deleting author from database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: id,
      });
      
      console.error('Error deleting author from database:', error);
      return new Response('Error deleting user from database', {
        status: 500,
      });
    }
  }

  logWebhookDebug('Webhook processing completed successfully', {
    eventType,
    eventId: evt.data.id,
    timestamp: new Date().toISOString(),
  });

  return new Response('', { status: 200 });
}
