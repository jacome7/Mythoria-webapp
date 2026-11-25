import { NextResponse } from 'next/server';
import { drainDurableOutboxes } from '@/lib/analytics/outbox';
import { analyticsPrivacyPaused } from '@/lib/analytics/destinations';
import { refreshAnonymousProductActions } from '@/db/services/anonymous-analytics';
import {
  purgeRevokedGrowthMeasurement,
  reconcileShareFirstPayments,
} from '@/lib/growth/measurement-server';
import { verifySchedulerRequest } from '@/lib/scheduler-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!(await verifySchedulerRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await drainDurableOutboxes();
    await refreshAnonymousProductActions().catch(() => {
      console.warn('[AnonymousAnalytics] Product action totals unavailable');
    });
    const sharePaymentsReconciled = await reconcileShareFirstPayments().catch(() => {
      console.warn('[AnalyticsDrain] Share payment reconciliation unavailable');
      return 0;
    });
    if (!analyticsPrivacyPaused()) {
      await purgeRevokedGrowthMeasurement().catch(() => {
        console.warn('[AnalyticsDrain] Growth measurement cleanup unavailable');
      });
    }
    console.info('[AnalyticsDrain]', result);
    return NextResponse.json({ success: true, ...result, sharePaymentsReconciled });
  } catch (error) {
    console.error('Analytics outbox drain failed:', error);
    return NextResponse.json({ error: 'Outbox drain failed' }, { status: 500 });
  }
}
