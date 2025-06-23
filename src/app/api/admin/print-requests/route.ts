import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { printRequests, authors, addresses, printProviders, stories } from '@/db/schema';
import { desc, asc, count, ilike, or, SQL, eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'requestedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const statusFilter = searchParams.get('status') || 'all';

    // Build search conditions
    const conditions: SQL[] = [];
    
    if (search.trim()) {
      const searchCondition = or(
        ilike(authors.displayName, `%${search}%`),
        ilike(authors.email, `%${search}%`),
        ilike(addresses.city, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
      // Status filter - "all" shows all, otherwise filter by specific status
    if (statusFilter !== 'all') {
      conditions.push(eq(printRequests.status, statusFilter as 'requested' | 'in_printing' | 'packing' | 'shipped' | 'delivered' | 'cancelled' | 'error'));
    }
    
    const whereCondition = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

    // Build sort condition
    const validSortFields = ['requestedAt', 'status', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'requestedAt';
    
    // Get total count with search
    const countQuery = db
      .select({ value: count() })
      .from(printRequests)
      .leftJoin(authors, eq(printRequests.authorId, authors.authorId))
      .leftJoin(addresses, eq(printRequests.shippingId, addresses.addressId));
      
    if (whereCondition) {
      countQuery.where(whereCondition);
    }
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.value || 0;

    // Get print requests with all necessary joins
    const printRequestsQuery = db
      .select({
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
        shippingCity: addresses.city,
        shippingLine1: addresses.line1,
        shippingLine2: addresses.line2,
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
      .leftJoin(stories, eq(printRequests.storyId, stories.storyId));

    if (whereCondition) {
      printRequestsQuery.where(whereCondition);
    }

    // Apply sorting
    let orderBy;
    switch (sortField) {
      case 'status':
        orderBy = sortOrder === 'asc' ? asc(printRequests.status) : desc(printRequests.status);
        break;
      case 'updatedAt':
        orderBy = sortOrder === 'asc' ? asc(printRequests.updatedAt) : desc(printRequests.updatedAt);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(printRequests.requestedAt) : desc(printRequests.requestedAt);
    }

    const requests = await printRequestsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      printRequests: requests,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching print requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
