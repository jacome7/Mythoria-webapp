import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stories, authors } from '@/db/schema';
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
    }    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const isPublicParam = searchParams.get('isPublic');
    const isFeaturedParam = searchParams.get('isFeatured');

    // Build search conditions
    const conditions: SQL[] = [];
      if (search.trim()) {
      const searchCondition = or(
        ilike(stories.title, `%${search}%`),
        ilike(authors.displayName, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    
    if (isPublicParam !== null) {
      conditions.push(eq(stories.isPublic, isPublicParam === 'true'));
    }
    
    if (isFeaturedParam !== null) {
      conditions.push(eq(stories.isFeatured, isFeaturedParam === 'true'));
    }
    
    const whereCondition = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

    // Build sort condition
    const validSortFields = ['title', 'authorName', 'createdAt', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    // Get total count with search
    const countQuery = db
      .select({ value: count() })
      .from(stories)
      .innerJoin(authors, eq(stories.authorId, authors.authorId));
    
    if (whereCondition) {
      countQuery.where(whereCondition);
    }
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.value || 0;    // Get stories with pagination, search, and sorting
    const storiesQuery = db
      .select({
        storyId: stories.storyId,
        title: stories.title,
        authorName: authors.displayName,
        status: stories.status,
        isPublic: stories.isPublic,
        isFeatured: stories.isFeatured,
        featureImageUri: stories.featureImageUri,
        createdAt: stories.createdAt,
      })
      .from(stories)
      .innerJoin(authors, eq(stories.authorId, authors.authorId));

    if (whereCondition) {
      storiesQuery.where(whereCondition);
    }

    // Build sort condition
    let orderBy;
    switch (sortField) {
      case 'title':
        orderBy = sortOrder === 'asc' ? asc(stories.title) : desc(stories.title);
        break;
      case 'authorName':
        orderBy = sortOrder === 'asc' ? asc(authors.displayName) : desc(authors.displayName);
        break;
      case 'status':
        orderBy = sortOrder === 'asc' ? asc(stories.status) : desc(stories.status);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(stories.createdAt) : desc(stories.createdAt);
    }

    const storiesResult = await storiesQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      stories: storiesResult,
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
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
