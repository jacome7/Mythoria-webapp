import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { printRequests, authors, addresses, printProviders, stories } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: printRequestId } = await params;

    // Get print request with all details
    const printRequestDetails = await db
      .select({
        // Print request info
        id: printRequests.id,
        storyId: printRequests.storyId,
        authorId: printRequests.authorId,
        status: printRequests.status,
        requestedAt: printRequests.requestedAt,
        printedAt: printRequests.printedAt,
        updatedAt: printRequests.updatedAt,
        pdfUrl: printRequests.pdfUrl,
        printingOptions: printRequests.printingOptions,
        
        // Author info
        authorName: authors.displayName,
        authorEmail: authors.email,
        authorMobilePhone: authors.mobilePhone,
        
        // Shipping address info
        shippingLine1: addresses.line1,
        shippingLine2: addresses.line2,
        shippingCity: addresses.city,
        shippingPostalCode: addresses.postalCode,
        shippingCountry: addresses.country,
        
        // Print provider info
        printProviderName: printProviders.name,
        printProviderEmail: printProviders.emailAddress,
        printProviderPhone: printProviders.phoneNumber,
        
        // Story info (if still exists)
        storyTitle: stories.title,
        storySynopsis: stories.synopsis,
        storyTargetAudience: stories.targetAudience,
        storyGraphicalStyle: stories.graphicalStyle,
        storyChapterCount: stories.chapterCount,
      })
      .from(printRequests)
      .leftJoin(authors, eq(printRequests.authorId, authors.authorId))
      .leftJoin(addresses, eq(printRequests.shippingId, addresses.addressId))
      .leftJoin(printProviders, eq(printRequests.printProviderId, printProviders.id))
      .leftJoin(stories, eq(printRequests.storyId, stories.storyId))
      .where(eq(printRequests.id, printRequestId))
      .limit(1);

    if (printRequestDetails.length === 0) {
      return NextResponse.json({ error: 'Print request not found' }, { status: 404 });
    }

    return NextResponse.json({
      printRequest: printRequestDetails[0]
    });
  } catch (error) {
    console.error('Error fetching print request details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: printRequestId } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['requested', 'in_printing', 'packing', 'shipped', 'delivered', 'cancelled', 'error'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }    // Update the print request status and updatedAt timestamp
    const updateData: {
      status: 'requested' | 'in_printing' | 'packing' | 'shipped' | 'delivered' | 'cancelled' | 'error';
      updatedAt: Date;
      printedAt?: Date;
    } = {
      status: status as 'requested' | 'in_printing' | 'packing' | 'shipped' | 'delivered' | 'cancelled' | 'error',
      updatedAt: new Date(),
    };

    // If status is being set to 'delivered', also set printedAt timestamp
    if (status === 'delivered' && !body.printedAt) {
      updateData.printedAt = new Date();
    }

    const updatedPrintRequest = await db
      .update(printRequests)
      .set(updateData)
      .where(eq(printRequests.id, printRequestId))
      .returning();

    if (updatedPrintRequest.length === 0) {
      return NextResponse.json({ error: 'Print request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      printRequest: updatedPrintRequest[0]
    });
  } catch (error) {
    console.error('Error updating print request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
