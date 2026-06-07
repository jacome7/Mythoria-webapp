import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { writingPersonas } from '@/db/schema';
import type { ValidatedWritingPersonaCreate } from '@/lib/writing-persona-validation';
import { WRITING_PERSONA_MAX_SAVED } from '@/types/writing-persona';

export const writingPersonaService = {
  async listByAuthor(authorId: string) {
    return db
      .select()
      .from(writingPersonas)
      .where(eq(writingPersonas.authorId, authorId))
      .orderBy(desc(writingPersonas.updatedAt))
      .limit(WRITING_PERSONA_MAX_SAVED);
  },

  async countByAuthor(authorId: string) {
    const [result] = await db
      .select({ value: count() })
      .from(writingPersonas)
      .where(eq(writingPersonas.authorId, authorId));

    return result?.value ?? 0;
  },

  async getByCodename(authorId: string, codename: string) {
    const [persona] = await db
      .select()
      .from(writingPersonas)
      .where(and(eq(writingPersonas.authorId, authorId), eq(writingPersonas.codename, codename)))
      .limit(1);

    return persona ?? null;
  },

  async create(authorId: string, input: ValidatedWritingPersonaCreate) {
    const [persona] = await db
      .insert(writingPersonas)
      .values({
        ...input,
        authorId,
      })
      .returning();

    return persona;
  },

  async update(authorId: string, codename: string, input: ValidatedWritingPersonaCreate) {
    const [persona] = await db
      .update(writingPersonas)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(writingPersonas.authorId, authorId), eq(writingPersonas.codename, codename)))
      .returning();

    return persona ?? null;
  },

  async delete(authorId: string, codename: string) {
    const [persona] = await db
      .delete(writingPersonas)
      .where(and(eq(writingPersonas.authorId, authorId), eq(writingPersonas.codename, codename)))
      .returning({ codename: writingPersonas.codename });

    return persona ?? null;
  },
};
