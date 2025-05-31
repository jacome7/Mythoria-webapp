import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { desc, asc, count, ilike, or, SQL } from 'drizzle-orm';
import { creditService } from '@/db/services';

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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';    // Build search conditions
    let whereCondition: SQL | undefined;
    if (search.trim()) {
      whereCondition = or(
        ilike(authors.displayName, `%${search}%`),
        ilike(authors.email, `%${search}%`),
        ilike(authors.mobilePhone, `%${search}%`)
      );
    }    // Build sort condition
    const validSortFields = ['displayName', 'email', 'createdAt', 'lastLoginAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const orderDirection = sortOrder === 'asc' ? asc : desc;
    
    // Get total count with search
    const countQuery = db.select({ value: count() }).from(authors);
    if (whereCondition) {
      countQuery.where(whereCondition);
    }
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.value || 0;

    // Get users with pagination, search, and sorting
    const usersQuery = db
      .select({
        authorId: authors.authorId,
        displayName: authors.displayName,
        email: authors.email,
        mobilePhone: authors.mobilePhone,
        createdAt: authors.createdAt,
        lastLoginAt: authors.lastLoginAt,
      })
      .from(authors);

    if (whereCondition) {
      usersQuery.where(whereCondition);
    }    // Build sort condition
    let orderBy;
    switch (sortField) {
      case 'displayName':
        orderBy = sortOrder === 'asc' ? asc(authors.displayName) : desc(authors.displayName);
        break;
      case 'email':
        orderBy = sortOrder === 'asc' ? asc(authors.email) : desc(authors.email);
        break;
      case 'lastLoginAt':
        orderBy = sortOrder === 'asc' ? asc(authors.lastLoginAt) : desc(authors.lastLoginAt);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(authors.createdAt) : desc(authors.createdAt);
    }    const users = await usersQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Fetch credit balances for each user
    const usersWithCredits = await Promise.all(
      users.map(async (user) => {
        const credits = await creditService.getAuthorCreditBalance(user.authorId);
        return {
          ...user,
          credits
        };
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      users: usersWithCredits,
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
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
