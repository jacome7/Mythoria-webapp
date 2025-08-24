import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { printRequests, printProviders, stories, addresses } from '@/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService } from '@/db/services';
import { getEnvironmentConfig } from '../../../../config/environment';
import { PrintPubSubService } from '@/lib/print-pubsub';
import { v4 as uuidv4 } from 'uuid';

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
    if (!body.storyId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: storyId' },
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
          eq(stories.status, 'published'),
          // Allow if story is public OR if user is the author
          or(
            eq(stories.isPublic, true),
            eq(stories.authorId, author.authorId)
          )
        )
      )
      .limit(1);

    if (story.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found, not published, or not accessible for printing' },
        { status: 404 }
      );
    }

    // Get shipping address to determine country for print provider selection
    let shippingCountry = 'PT'; // Default to Portugal
    if (body.shippingId) {
      const shippingAddress = await db
        .select({ country: addresses.country })
        .from(addresses)
        .where(eq(addresses.addressId, body.shippingId))
        .limit(1);
      
      if (shippingAddress.length > 0) {
        shippingCountry = shippingAddress[0].country;
      }
    }

    // Auto-select the first active print provider available for the shipping country
    const availableProviders = await db
      .select()
      .from(printProviders)
      .where(eq(printProviders.isActive, true));

    const suitableProvider = availableProviders.find(provider => {
      const availableCountries = provider.availableCountries as string[];
      return availableCountries.includes(shippingCountry);
    });    if (!suitableProvider) {
      return NextResponse.json(
        { success: false, error: `No print provider available for country: ${shippingCountry}` },
        { status: 404 }
      );
    }
    // Check and deduct credits for print order
    try {
      // Calculate total cost based on printing option and extra chapters
      const totalCost = body.totalCost || 0;
      
      if (!totalCost) {
        return NextResponse.json(
          { success: false, error: 'Total cost not provided' },
          { status: 400 }
        );
      }

      // Check if user has sufficient credits
      const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
      if (currentBalance < totalCost) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient credits',
            required: totalCost,
            available: currentBalance,
            shortfall: totalCost - currentBalance
          }, 
          { status: 402 } // Payment Required
        );
      }

      // Deduct credits for print order
      await creditService.deductCredits(
        author.authorId,
        totalCost,
        'printOrder', // Use the correct enum value
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
      authorId: author.authorId,
      storyId: body.storyId,
  // PDF is generated asynchronously after the request; store placeholder for now
  pdfUrl: '',
      printProviderId: suitableProvider.id,
      shippingId: body.shippingId || null,
      printingOptions: {
        serviceCode: body.printingOption?.serviceCode,
        credits: body.printingOption?.credits,
        title: body.printingOption?.title,
        chapterCount: body.chapterCount,
        totalCost: body.totalCost,
        extraChapters: Math.max(0, (body.chapterCount || 4) - 4),
      },
      status: 'requested',
    }).returning();

    // Fetch the complete request with joined data
    const fullRequest = await db
      .select({
        id: printRequests.id,
        storyId: printRequests.storyId,
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

    // Create ticket in admin system for print request (async, don't block the response)
    try {
      const config = getEnvironmentConfig();
      const ticketResponse = await fetch(`${config.admin.apiUrl}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'print_request',
          storyId: body.storyId,
          userId: author.authorId,
          shippingAddress: body.shippingId ? {
            addressId: body.shippingId,
            // We could fetch full address details here if needed
          } : null,
          printingOption: {
            serviceCode: body.printingOption?.serviceCode,
            title: body.printingOption?.title,
            credits: body.printingOption?.credits,
          },
          totalCost: body.totalCost,
          orderDetails: {
            printRequestId: newRequest[0].id,
            requestedAt: new Date().toISOString(),
            status: 'pending_processing',
          }
        }),
      });

      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        console.log('Print request ticket created:', ticketData.id);
      } else {
        console.warn('Failed to create print request ticket:', ticketResponse.statusText);
      }
    } catch (ticketError) {
      console.warn('Print request ticket creation failed:', ticketError);
      // Don't fail the entire process if ticket creation fails
    }

    // Trigger print PDF generation (async, don't block the response)
    try {
      const printPubSub = new PrintPubSubService();
      const runId = uuidv4();
      
      await printPubSub.triggerPrintGeneration(body.storyId, runId);
      console.log('Print generation triggered for story:', body.storyId, 'runId:', runId);
    } catch (printError) {
      console.warn('Print generation trigger failed:', printError);
      // Don't fail the entire process if print generation trigger fails
    }

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
