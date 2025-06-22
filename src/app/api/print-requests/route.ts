import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { printRequests, printProviders, stories, addresses } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, pricingService } from '@/db/services';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const status = searchParams.get('status');

    // Build where conditions
    const whereConditions = [];
    
    if (storyId) {
      whereConditions.push(eq(printRequests.storyId, storyId));
    }
      if (status) {
      whereConditions.push(eq(printRequests.status, status as 'requested' | 'in_printing' | 'packing' | 'shipped' | 'delivered' | 'cancelled' | 'error'));
    }

    const requests = await db
      .select({
        id: printRequests.id,
        storyId: printRequests.storyId,
        pdfUrl: printRequests.pdfUrl,
        status: printRequests.status,
        requestedAt: printRequests.requestedAt,
        printedAt: printRequests.printedAt,
        updatedAt: printRequests.updatedAt,
        provider: {
          id: printProviders.id,
          name: printProviders.name,
          companyName: printProviders.companyName,
          integration: printProviders.integration,
        },
        story: {
          id: stories.storyId,
          title: stories.title,
          authorId: stories.authorId,
        },
        shippingAddress: {
          id: addresses.addressId,
          line1: addresses.line1,
          line2: addresses.line2,
          city: addresses.city,
          postalCode: addresses.postalCode,
          country: addresses.country,
          phone: addresses.phone,
        }
      })
      .from(printRequests)
      .leftJoin(printProviders, eq(printRequests.printProviderId, printProviders.id))
      .leftJoin(stories, eq(printRequests.storyId, stories.storyId))
      .leftJoin(addresses, eq(printRequests.shippingId, addresses.addressId))
      .where(whereConditions.length > 0 ? 
        (whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)) 
        : undefined
      )
      .orderBy(desc(printRequests.requestedAt));

    return NextResponse.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching print requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch print requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.storyId || !body.pdfUrl || !body.printProviderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: storyId, pdfUrl, printProviderId' },
        { status: 400 }
      );
    }

    // Verify the story exists and is published
    const story = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.storyId, body.storyId),
          eq(stories.authorId, author.authorId),
          eq(stories.status, 'published')
        )
      )
      .limit(1);

    if (story.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found or not published' },
        { status: 404 }
      );
    }

    // Verify the print provider exists and is active
    const provider = await db
      .select()
      .from(printProviders)
      .where(
        and(
          eq(printProviders.id, body.printProviderId),
          eq(printProviders.isActive, true)
        )
      )
      .limit(1);

    if (provider.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Print provider not found or inactive' },
        { status: 404 }
      );
    }    // Check and deduct credits for print order
    try {
      const printOrderPricing = await pricingService.getPricingByServiceCode('printOrder');
      if (!printOrderPricing) {
        return NextResponse.json(
          { success: false, error: 'Print order pricing not configured' },
          { status: 500 }
        );
      }

      // Check if user has sufficient credits
      const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
      if (currentBalance < printOrderPricing.credits) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient credits',
            required: printOrderPricing.credits,
            available: currentBalance,
            shortfall: printOrderPricing.credits - currentBalance
          }, 
          { status: 402 } // Payment Required
        );
      }

      // Deduct credits for print order
      await creditService.deductCredits(
        author.authorId,
        printOrderPricing.credits,
        'printOrder',
        body.storyId
      );
    } catch (error) {
      console.error('Error processing credits for print order:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to process payment. Please try again.' },
        { status: 500 }
      );
    }

    // Create the print request
    const newRequest = await db.insert(printRequests).values({
      storyId: body.storyId,
      pdfUrl: body.pdfUrl,
      printProviderId: body.printProviderId,
      shippingId: body.shippingId || null,
      status: 'requested',
    }).returning();

    // Fetch the complete request with joined data
    const fullRequest = await db
      .select({
        id: printRequests.id,
        storyId: printRequests.storyId,
        pdfUrl: printRequests.pdfUrl,
        status: printRequests.status,
        requestedAt: printRequests.requestedAt,
        provider: {
          id: printProviders.id,
          name: printProviders.name,
          companyName: printProviders.companyName,
        },
        story: {
          id: stories.storyId,
          title: stories.title,
        }
      })
      .from(printRequests)
      .leftJoin(printProviders, eq(printRequests.printProviderId, printProviders.id))
      .leftJoin(stories, eq(printRequests.storyId, stories.storyId))
      .where(eq(printRequests.id, newRequest[0].id))
      .limit(1);

    return NextResponse.json({
      success: true,
      request: fullRequest[0]
    });
  } catch (error) {
    console.error('Error creating print request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create print request' },
      { status: 500 }
    );
  }
}
