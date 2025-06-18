import { db } from "../index";
import { tokenUsageTracking, type InsertTokenUsage, type SelectTokenUsage } from "../schema/token-usage";
import { eq, desc, sum, count } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Token Usage Tracking Utilities
// -----------------------------------------------------------------------------

/**
 * Insert a new token usage record
 */
export async function insertTokenUsage(data: InsertTokenUsage): Promise<SelectTokenUsage> {
  const [result] = await db.insert(tokenUsageTracking).values(data).returning();
  return result;
}

/**
 * Get token usage for a specific story
 */
export async function getTokenUsageByStory(storyId: string): Promise<SelectTokenUsage[]> {
  return await db
    .select()
    .from(tokenUsageTracking)
    .where(eq(tokenUsageTracking.storyId, storyId))
    .orderBy(desc(tokenUsageTracking.createdAt));
}

/**
 * Get token usage for a specific author
 */
export async function getTokenUsageByAuthor(authorId: string): Promise<SelectTokenUsage[]> {
  return await db
    .select()
    .from(tokenUsageTracking)
    .where(eq(tokenUsageTracking.authorId, authorId))
    .orderBy(desc(tokenUsageTracking.createdAt));
}

/**
 * Get total cost for a story
 */
export async function getStoryCost(storyId: string): Promise<number> {
  const result = await db
    .select({ 
      totalCost: sum(tokenUsageTracking.estimatedCostInEuros).mapWith(Number)
    })
    .from(tokenUsageTracking)
    .where(eq(tokenUsageTracking.storyId, storyId));
  
  return result[0]?.totalCost || 0;
}

/**
 * Get total cost for an author
 */
export async function getAuthorCost(authorId: string): Promise<number> {
  const result = await db
    .select({ 
      totalCost: sum(tokenUsageTracking.estimatedCostInEuros).mapWith(Number)
    })
    .from(tokenUsageTracking)
    .where(eq(tokenUsageTracking.authorId, authorId));
  
  return result[0]?.totalCost || 0;
}

/**
 * Get token usage statistics by action type
 */
export async function getUsageStatsByAction(storyId?: string, authorId?: string) {
  const baseQuery = db
    .select({
      action: tokenUsageTracking.action,
      totalInputTokens: sum(tokenUsageTracking.inputTokens).mapWith(Number),
      totalOutputTokens: sum(tokenUsageTracking.outputTokens).mapWith(Number),
      totalCost: sum(tokenUsageTracking.estimatedCostInEuros).mapWith(Number),
      usageCount: count(tokenUsageTracking.tokenUsageId).mapWith(Number)
    })
    .from(tokenUsageTracking);

  if (storyId) {
    return await baseQuery
      .where(eq(tokenUsageTracking.storyId, storyId))
      .groupBy(tokenUsageTracking.action);
  } else if (authorId) {
    return await baseQuery
      .where(eq(tokenUsageTracking.authorId, authorId))
      .groupBy(tokenUsageTracking.action);
  }

  return await baseQuery.groupBy(tokenUsageTracking.action);
}

/**
 * Get recent token usage (last 24 hours)
 */
export async function getRecentTokenUsage(authorId?: string): Promise<SelectTokenUsage[]> {
  if (authorId) {
    return await db
      .select()
      .from(tokenUsageTracking)
      .where(eq(tokenUsageTracking.authorId, authorId))
      .orderBy(desc(tokenUsageTracking.createdAt))
      .limit(50);
  }

  return await db
    .select()
    .from(tokenUsageTracking)
    .orderBy(desc(tokenUsageTracking.createdAt))
    .limit(50);
}
