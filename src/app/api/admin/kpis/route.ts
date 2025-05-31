import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { authorService, storyService } from '@/db/services';

export async function GET() {
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