import { pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { analyticsAttributions } from './analytics';
import type { ExperimentArm, ExperimentId } from '@/lib/product-experiments/release';

export const productExperimentAssignments = pgTable(
  'product_experiment_assignments',
  {
    experimentId: varchar('experiment_id', { length: 32 }).$type<ExperimentId>().notNull(),
    attributionId: uuid('attribution_id')
      .notNull()
      .references(() => analyticsAttributions.attributionId, { onDelete: 'cascade' }),
    arm: varchar('arm', { length: 12 }).$type<ExperimentArm>().notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
    readerStartedAt: timestamp('reader_started_at', { withTimezone: true }),
    readerEndedAt: timestamp('reader_ended_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.experimentId, table.attributionId] })],
);
