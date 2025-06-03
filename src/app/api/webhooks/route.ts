import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authorService } from '@/db/services';

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
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }  // Get the body
  const payload = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: WebhookEvent;
  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
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
  console.log(`Received webhook with ID ${evt.data.id} and event type of ${eventType}`);
    if (evt.type === 'session.created') {
    // This event fires every time a user signs in
    const sessionData = evt.data as { user_id?: string };
    
    try {
      // Get the user ID from the session and fetch the full user data
      const userId = sessionData.user_id;
      if (userId) {
        // The sync function will handle existing users by updating lastLoginAt
        const existingAuthor = await authorService.getAuthorByClerkId(userId);
        if (existingAuthor) {
          // Update last login time for existing user
          const currentTime = new Date();
          await db
            .update(authors)
            .set({ lastLoginAt: currentTime })
            .where(eq(authors.clerkUserId, userId));
          console.log('Updated existing user login time:', userId);
        }
        // Note: If user doesn't exist, they should be created via user.created webhook
      }
    } catch (error) {
      console.error('Error updating user login time:', error);
      return new Response('Error updating user login time', {
        status: 500,
      });
    }
  }
  if (evt.type === 'user.created') {
    const userData = evt.data as ClerkUserWebhookData;
    const { id, email_addresses, first_name, last_name, phone_numbers } = userData;

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
      
      const newAuthor = await authorService.syncUserOnSignIn(userForSync);
      console.log('Successfully created author via webhook:', newAuthor);
    } catch (error) {
      console.error('Error creating author in database:', error);
      return new Response('Error creating user in database', {
        status: 500,
      });
    }
  }  if (evt.type === 'user.updated') {
    const userData = evt.data as ClerkUserWebhookData;
    const { id, email_addresses, first_name, last_name, phone_numbers } = userData;

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

      await db.update(authors)
        .set(updateData)
        .where(eq(authors.clerkUserId, id));

      console.log('Successfully updated author with Clerk ID:', id);
    } catch (error) {
      console.error('Error updating author in database:', error);
      return new Response('Error updating user in database', {
        status: 500,
      });
    }
  }
  if (evt.type === 'user.deleted') {
    const { id } = evt.data;

    if (!id) {
      return new Response('Error: Missing user ID', { status: 400 });
    }

    try {
      // Delete user from our database (or mark as deleted)
      await db.delete(authors).where(eq(authors.clerkUserId, id));
      console.log('Successfully deleted author with Clerk ID:', id);
    } catch (error) {
      console.error('Error deleting author from database:', error);
      return new Response('Error deleting user from database', {
        status: 500,
      });
    }
  }

  return new Response('', { status: 200 });
}
