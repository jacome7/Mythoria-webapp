import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors, addresses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the author by clerk user ID
    const author = await db
      .select()
      .from(authors)
      .where(eq(authors.clerkUserId, userId))
      .limit(1);

    if (author.length === 0) {
      return NextResponse.json({
        success: true,
        addresses: []
      });
    }

    // Get all addresses for this author
    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.authorId, author[0].authorId));
    
    return NextResponse.json({
      success: true,
      addresses: userAddresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.line1 || !body.city || !body.country) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: line1, city, country' },
        { status: 400 }
      );
    }

    // Find the author by clerk user ID
    const author = await db
      .select()
      .from(authors)
      .where(eq(authors.clerkUserId, userId))
      .limit(1);

    if (author.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      );
    }    // Create the address
    const newAddress = await db
      .insert(addresses)
      .values({
        authorId: author[0].authorId,
        type: body.type || 'delivery',
        line1: body.line1,
        line2: body.line2 || null,
        city: body.city,
        stateRegion: body.stateRegion || null,
        postalCode: body.postalCode || null,
        country: body.country,
        phone: body.phone || null,
      })
      .returning();
    
    return NextResponse.json({
      success: true,
      address: newAddress[0]
    });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create address' },
      { status: 500 }
    );
  }
}
