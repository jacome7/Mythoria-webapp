import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors, addresses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { addressId } = await params;

    // Validate required fields
    if (!body.line1 || !body.city || !body.country) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: line1, city, country' },
        { status: 400 },
      );
    }

    // Find the author by clerk user ID
    const author = await db.select().from(authors).where(eq(authors.clerkUserId, userId)).limit(1);

    if (author.length === 0) {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    } // Update the address (ensure it belongs to the current user)
    const updatedAddress = await db
      .update(addresses)
      .set({
        type: body.type || 'delivery',
        line1: body.line1,
        line2: body.line2 || null,
        city: body.city,
        stateRegion: body.stateRegion || null,
        postalCode: body.postalCode || null,
        country: body.country,
        phone: body.phone || null,
      })
      .where(and(eq(addresses.addressId, addressId), eq(addresses.authorId, author[0].authorId)))
      .returning();

    if (updatedAddress.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Address not found or access denied' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      address: updatedAddress[0],
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update address' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { addressId } = await params;

    // Find the author by clerk user ID
    const author = await db.select().from(authors).where(eq(authors.clerkUserId, userId)).limit(1);

    if (author.length === 0) {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    }

    // Delete the address (ensure it belongs to the current user)
    const deletedAddress = await db
      .delete(addresses)
      .where(and(eq(addresses.addressId, addressId), eq(addresses.authorId, author[0].authorId)))
      .returning();

    if (deletedAddress.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Address not found or access denied' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete address' },
      { status: 500 },
    );
  }
}
