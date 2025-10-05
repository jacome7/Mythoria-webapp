import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { sql } from 'drizzle-orm';
import { isVpcDirectEgress } from '@/lib/database-config';
// Removed direct GenAI probing; webapp no longer calls providers directly

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true' || searchParams.get('debug') === '1';

  try {
    console.log('Health check starting...');

    // Test basic database connectivity
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Database connection test successful:', result);
    // GenAI probing removed; webapp no longer calls providers directly
    const genaiStatus: 'working' | 'failed' = 'working';

    const basicInfo = {
      status: 'healthy' as const,
      database: 'connected' as const,
      genai: genaiStatus,
      timestamp: new Date().toISOString(),
    };

    if (debug) {
      const connectionType = isVpcDirectEgress() ? 'VPC Direct Egress' : 'Public IP';
      return NextResponse.json({
        ...basicInfo,
        connectionType,
        environment: process.env.NODE_ENV,
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME,
      });
    }

    return NextResponse.json({
      ...basicInfo,
    });
  } catch (error) {
    console.error('Health check failed:', error);

    const basicInfo = {
      status: 'unhealthy' as const,
      database: 'disconnected' as const,
      timestamp: new Date().toISOString(),
    };

    if (debug) {
      const connectionType = isVpcDirectEgress() ? 'VPC Direct Egress' : 'Public IP';
      return NextResponse.json(
        {
          ...basicInfo,
          connectionType,
          error: error instanceof Error ? error.message : 'Unknown error',
          environment: process.env.NODE_ENV,
          dbHost: process.env.DB_HOST,
          dbName: process.env.DB_NAME,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ...basicInfo,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
