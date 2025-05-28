import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  }
  // Get the body
  const payload = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);

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
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log(`Received webhook with ID ${evt.data.id} and event type of ${eventType}`);
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      // Create user in our database
      const newAuthor = await db.insert(authors).values({
        clerkUserId: id,
        email: email_addresses[0]?.email_address || '',
        displayName: `${first_name || ''} ${last_name || ''}`.trim() || email_addresses[0]?.email_address.split('@')[0] || 'Anonymous User',
      }).returning();

      console.log('Successfully created author:', newAuthor[0]);
    } catch (error) {
      console.error('Error creating author in database:', error);
      return new Response('Error creating user in database', {
        status: 500,
      });
    }
  }
  if (evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      // Update user in our database
      await db.update(authors)
        .set({
          email: email_addresses[0]?.email_address || '',
          displayName: `${first_name || ''} ${last_name || ''}`.trim() || email_addresses[0]?.email_address.split('@')[0] || 'Anonymous User',
        })
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
