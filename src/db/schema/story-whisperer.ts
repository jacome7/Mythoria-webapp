import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  WhispererContext,
  WhispererSavedQuestion,
  WhispererReadiness,
} from '@/lib/story-whisperer/types';
import { authors } from './authors';
import { biographerProjects } from './biographer';
import { stories } from './stories';

export const storyWhispererInterviews = pgTable(
  'story_whisperer_interviews',
  {
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.authorId, { onDelete: 'cascade' }),
    // Step 2 assigns the UUID before the ordinary story row is created.
    draftId: uuid('draft_id').notNull(),
    projectId: uuid('project_id')
      .notNull()
      .unique()
      .references(() => biographerProjects.id, { onDelete: 'cascade' }),
    readiness: jsonb('readiness').$type<WhispererReadiness>(),
    readinessRevision: integer('readiness_revision'),
    context: jsonb('context').$type<WhispererContext>(),
    latestQuestion: jsonb('latest_question').$type<WhispererSavedQuestion>(),
  },
  (table) => [primaryKey({ columns: [table.authorId, table.draftId] })],
);

export const storyWhispererHandoffs = pgTable(
  'story_whisperer_handoffs',
  {
    requestId: uuid('request_id').primaryKey(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => storyWhispererInterviews.projectId, {
      onDelete: 'set null',
    }),
    revision: integer('revision').notNull(),
    userDescription: text('user_description').notNull(),
    imageObjectPaths: jsonb('image_object_paths').$type<string[]>().notNull(),
    dispatchReserved: boolean('dispatch_reserved').default(false).notNull(),
  },
  (table) => [
    index('story_whisperer_handoffs_project_idx').on(table.projectId),
    index('story_whisperer_handoffs_draft_idx').on(table.draftId),
  ],
);

// The UI can assign a draft UUID before the ordinary story exists. Keep only
// these identifiers after permanent deletion so a stale browser cannot reopen it.
export const storyWhispererDeletedDrafts = pgTable(
  'story_whisperer_deleted_drafts',
  {
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.authorId, { onDelete: 'cascade' }),
    draftId: uuid('draft_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.authorId, table.draftId] })],
);
