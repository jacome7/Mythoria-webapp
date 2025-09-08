import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { printRequests, printProviders, stories, addresses, authors } from '@/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService } from '@/db/services';
import { getEnvironmentConfig } from '@/config/environment';
import { PrintPubSubService } from '@/lib/print-pubsub';
import { v4 as uuidv4 } from 'uuid';
import { normalizeLocale } from '@/utils/locale-utils';

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
    });
    if (!suitableProvider) {
      return NextResponse.json(
        { success: false, error: `No print provider available for country: ${shippingCountry}` },
        { status: 404 }
      );
    }
    // ------------------------------------------------------------------
    // PRE-CHECK: Validate total cost & credit sufficiency (do NOT deduct yet)
    // ------------------------------------------------------------------
    const totalCost = body.totalCost || 0;
    if (!totalCost) {
      return NextResponse.json(
        { success: false, error: 'Total cost not provided' },
        { status: 400 }
      );
    }
    const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
    if (currentBalance < totalCost) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        required: totalCost,
        available: currentBalance,
        shortfall: totalCost - currentBalance
      }, { status: 402 });
    }

    // ------------------------------------------------------------------
    // Create the print request record (without deducting credits yet)
    // ------------------------------------------------------------------
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
        totalCost: totalCost,
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

    // ------------------------------------------------------------------
    // Create ticket in admin system (MUST succeed before deducting credits)
    // ------------------------------------------------------------------
    let ticketId: string | null = null;
    try {
      const config = getEnvironmentConfig();
      const ticketResponse = await fetch(`${config.admin.apiUrl}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.admin.apiKey || '',
        },
        body: JSON.stringify({
          category: 'print_request',
          storyId: body.storyId,
          userId: author.authorId,
          shippingAddress: body.shippingId ? { addressId: body.shippingId } : null,
          printingOption: {
            serviceCode: body.printingOption?.serviceCode,
            title: body.printingOption?.title,
            credits: body.printingOption?.credits,
          },
          totalCost: totalCost,
          orderDetails: {
            printRequestId: newRequest[0].id,
            requestedAt: new Date().toISOString(),
            status: 'pending_processing',
          }
        }),
      });

      if (!ticketResponse.ok) {
        console.error('Ticket creation failed with status:', ticketResponse.status);
        // Roll back the print request row since external orchestration failed
        await db.delete(printRequests).where(eq(printRequests.id, newRequest[0].id));
        return NextResponse.json({
          success: false,
          error: 'We could not complete your print order. Please try again.'
        }, { status: 500 });
      }
      try {
        const ticketJson = await ticketResponse.json();
        ticketId = ticketJson.id || null;
      } catch { /* ignore parse issues */ }
    } catch (ticketError) {
      console.error('Ticket creation exception:', ticketError);
      await db.delete(printRequests).where(eq(printRequests.id, newRequest[0].id));
      return NextResponse.json({
        success: false,
        error: 'We could not complete your print order. Please try again.'
      }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // Deduct credits ONLY after ticket success
    // ------------------------------------------------------------------
    try {
      await creditService.deductCredits(author.authorId, totalCost, 'printOrder', body.storyId);
    } catch (deductError) {
      console.error('Credit deduction failed after ticket creation:', deductError);
      // Roll back print request (avoid orphan order with no payment)
      await db.delete(printRequests).where(eq(printRequests.id, newRequest[0].id));
      if ((deductError as Error).message === 'Insufficient credits') {
        return NextResponse.json({
          success: false,
          error: 'Insufficient credits',
          required: totalCost,
          available: await creditService.getAuthorCreditBalance(author.authorId)
        }, { status: 402 });
      }
      return NextResponse.json({
        success: false,
        error: 'We could not complete your print order. Please try again.'
      }, { status: 500 });
    }

    // ---------------------------------------------------------------
    // Send user notification email (non-blocking; best-effort)
    // ---------------------------------------------------------------
    (async () => {
      try {
        const config = getEnvironmentConfig();
        if (!config.notification.engineUrl || !config.notification.apiKey) {
          console.warn('Notification engine config missing; skipping email');
          return;
        }
        // Fetch address details if available
        let addressRecord: { line1: string; line2: string | null; city: string; stateRegion: string | null; postalCode: string | null; country: string; phone: string | null } | null = null;
        if (body.shippingId) {
          const addr = await db
            .select({ line1: addresses.line1, line2: addresses.line2, city: addresses.city, stateRegion: addresses.stateRegion, postalCode: addresses.postalCode, country: addresses.country, phone: addresses.phone })
            .from(addresses)
            .where(eq(addresses.addressId, body.shippingId))
            .limit(1);
          addressRecord = addr[0] || null;
        }
        // Fetch author email/displayName (author object may already contain these; fallback to DB)
        let authorEmail = author.email;
        let authorName = author.displayName || 'Storyteller';
        if (!authorEmail || !authorName) {
          const dbAuthor = await db.select({ email: authors.email, displayName: authors.displayName }).from(authors).where(eq(authors.authorId, author.authorId)).limit(1);
            if (dbAuthor.length > 0) {
              authorEmail = authorEmail || dbAuthor[0].email;
              authorName = authorName || dbAuthor[0].displayName;
            }
        }
        // Derive order number from ticket (preferred) or print request id
        const sourceId = ticketId || newRequest[0].id;
        const parts = sourceId.split('-');
        const orderNumber = parts.length >= 2 ? parts[1].toUpperCase() : sourceId.replace(/-/g, '').substring(0,8).toUpperCase();
        const orderDate = new Date().toISOString().slice(0,10); // YYYY-MM-DD
        const listenURL = `https://mythoria.pt/stories/listen/${body.storyId}`;
        const contactURL = 'https://mythoria.pt/contactUs';
        // Always use author's preferredLocale (not story language) for template selection
  const userLocale = normalizeLocale(author.preferredLocale || undefined);
        const payload = {
          templateId: 'print-request-created',
          recipients: [ { email: authorEmail, name: authorName, language: userLocale } ],
          variables: {
            name: authorName,
            OrderNumber: orderNumber,
            OrderDate: orderDate,
            CreditCost: totalCost,
            storyTitle: story[0]?.title || '',
            CoverImageURL: story[0]?.featureImageUri || '',
            line1: addressRecord?.line1 || '',
            line2: addressRecord?.line2 || '',
            city: addressRecord?.city || '',
            stateRegion: addressRecord?.stateRegion || '',
            postalCode: addressRecord?.postalCode || '',
            country: addressRecord?.country || '',
            phone: addressRecord?.phone || '',
            listenURL,
            contactURL
          }
        };
        const resp = await fetch(`${config.notification.engineUrl}/email/template`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.notification.apiKey
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          console.warn('Failed to send print request email', resp.status);
        }
      } catch (notifyErr) {
        console.warn('Notification email failed', notifyErr);
      }
    })();

  // Trigger print PDF generation (async, non-blocking; failure does not invalidate order)
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
