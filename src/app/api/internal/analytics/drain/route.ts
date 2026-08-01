import { NextResponse } from 'next/server';
import { drainDurableOutboxes } from '@/lib/analytics/outbox';
import { verifySchedulerRequest } from '@/lib/scheduler-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!(await verifySchedulerRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await drainDurableOutboxes();
    console.info('[AnalyticsDrain]', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Analytics outbox drain failed:', error);
    return NextResponse.json({ error: 'Outbox drain failed' }, { status: 500 });
  }
}
