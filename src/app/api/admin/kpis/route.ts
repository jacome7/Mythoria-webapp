import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { authorService, storyService } from '@/db/services';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated and authorized
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access (check for admin role in Auth0)
    const userRoles = session.user['https://mythoria.com/roles'] || [];
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get KPI data
    const [usersCount, storiesCount] = await Promise.all([
      authorService.getTotalAuthorsCount(),
      storyService.getTotalStoriesCount()
    ]);

    const kpis = {
      users: usersCount,
      stories: storiesCount,
      revenue: 6324 // Fixed value as requested
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}