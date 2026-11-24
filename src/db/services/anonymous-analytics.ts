import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { anonymousAnalyticsDaily } from '@/db/schema';
import { anonymousAnalyticsEnabled, type AnonymousRequestSurface } from '@/lib/analytics/anonymous';

export async function recordAnonymousDocumentRequest(
  surface: AnonymousRequestSurface,
): Promise<void> {
  try {
    // The database receives a bounded category and a clock date, even before consent.
    await db
      .insert(anonymousAnalyticsDaily)
      .values({
        day: new Date().toISOString().slice(0, 10),
        category: 'request',
        surface,
        outcome: 'observed',
        count: 1,
      })
      .onConflictDoUpdate({
        target: [
          anonymousAnalyticsDaily.day,
          anonymousAnalyticsDaily.category,
          anonymousAnalyticsDaily.surface,
          anonymousAnalyticsDaily.outcome,
        ],
        set: { count: sql`${anonymousAnalyticsDaily.count} + 1` },
      });
  } catch {
    console.warn('[AnonymousAnalytics] Request count unavailable');
  }
}

/** Recompute recent UTC daily action totals from committed transactions. Safe to retry. */
export async function refreshAnonymousProductActions(): Promise<void> {
  if (!anonymousAnalyticsEnabled()) return;
  await db.execute(sql`
    with dates as (
      select day::date as day from generate_series(
        (now() at time zone 'UTC')::date - 7,
        (now() at time zone 'UTC')::date,
        '1 day'::interval
      ) as day
    ), actions as (
      select 'account_created' as surface, created_at as occurred_at
      from authors where created_at >= (now() at time zone 'UTC')::date - 7
      union all
      select 'story_generated', terminal_at
      from story_generation_requests
      where status = 'completed' and terminal_at >= (now() at time zone 'UTC')::date - 7
      union all
      select case action_type when 'self_print' then 'self_print' else 'audiobook' end, terminal_at
      from product_generation_requests
      where status = 'completed' and terminal_at >= (now() at time zone 'UTC')::date - 7
      union all
      select 'purchase', completed_at
      from payment_orders paid
      where (case when jsonb_typeof(paid.metadata#>'{stripe,amountTotal}') = 'number'
        then (paid.metadata#>>'{stripe,amountTotal}')::numeric else paid.amount end) > 0
        and paid.completed_at >= (now() at time zone 'UTC')::date - 7
        and coalesce(paid.metadata#>>'{stripe,livemode}', '') <> 'false'
        and not exists (
          select 1 from payment_events evidence
          where evidence.order_id = paid.order_id and evidence.event_type = 'webhook_received'
            and evidence.data #>> '{session,livemode}' = 'false'
        )
    ), surfaces (surface) as (
      values ('account_created'), ('story_generated'), ('self_print'), ('audiobook'), ('purchase')
    )
    insert into ${anonymousAnalyticsDaily} (day, category, surface, outcome, count)
    select dates.day, 'product', surfaces.surface, 'completed', count(actions.occurred_at)
    from dates cross join surfaces
    left join actions on actions.surface = surfaces.surface
      and (actions.occurred_at at time zone 'UTC')::date = dates.day
    group by dates.day, surfaces.surface
    on conflict (day, category, surface, outcome) do update set count = excluded.count
  `);
}
