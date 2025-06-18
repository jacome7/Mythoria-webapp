import { db } from '@/db';
import { tokenUsageTracking } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// Define the AI action type based on the schema
type AiActionType = 'story_structure' | 'story_outline' | 'chapter_writing' | 'image_generation' | 'story_review' | 'character_generation' | 'story_enhancement' | 'audio_generation' | 'content_validation';

// -----------------------------------------------------------------------------
// Token Usage Tracking Service
// -----------------------------------------------------------------------------

export interface TokenUsageRecord {
  tokenUsageId: string;
  authorId: string;
  storyId: string;
  action: AiActionType;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostInEuros: string;
  inputPromptJson: Record<string, unknown>;
  createdAt: string;
}

export interface NewTokenUsageRecord {
  authorId: string;
  storyId: string;
  action: AiActionType;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostInEuros: number;
  inputPromptJson: Record<string, unknown>;
}

export interface TokenUsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostInEuros: number;
  averageCostPerRequest: number;
  mostUsedModel: string | null;
  costByModel: Array<{
    model: string;
    requests: number;
    totalCost: number;
  }>;
}

export interface TokenUsageStatsFilters {
  authorId?: string;
  storyId?: string;
  action?: AiActionType;
  dateFrom?: Date;
  dateTo?: Date;
}

export class TokenUsageTrackingService {
  /**
   * Record a new token usage entry
   */
  async recordTokenUsage(record: NewTokenUsageRecord): Promise<string> {
    try {
      const result = await db
        .insert(tokenUsageTracking)
        .values({
          ...record,
          estimatedCostInEuros: record.estimatedCostInEuros.toString()
        })
        .returning({ tokenUsageId: tokenUsageTracking.tokenUsageId });

      console.log('Token usage recorded:', {
        tokenUsageId: result[0].tokenUsageId,
        model: record.aiModel,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        cost: record.estimatedCostInEuros
      });

      return result[0].tokenUsageId;
    } catch (error) {
      console.error('Failed to record token usage:', error);
      throw new Error('Failed to record token usage');
    }
  }
  /**
   * Get token usage records with filters
   */
  async getTokenUsageRecords(
    filters: TokenUsageStatsFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<TokenUsageRecord[]> {
    // Apply filters
    const conditions = [];
    
    if (filters.authorId) {
      conditions.push(eq(tokenUsageTracking.authorId, filters.authorId));
    }
    
    if (filters.storyId) {
      conditions.push(eq(tokenUsageTracking.storyId, filters.storyId));
    }
    
    if (filters.action) {
      conditions.push(eq(tokenUsageTracking.action, filters.action));
    }
    
    if (filters.dateFrom) {
      conditions.push(sql`${tokenUsageTracking.createdAt} >= ${filters.dateFrom.toISOString()}`);
    }
    
    if (filters.dateTo) {
      conditions.push(sql`${tokenUsageTracking.createdAt} <= ${filters.dateTo.toISOString()}`);
    }

    const query = db
      .select()
      .from(tokenUsageTracking)
      .orderBy(desc(tokenUsageTracking.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    if (conditions.length > 0) {
      const results = await query.where(and(...conditions));
      return results as TokenUsageRecord[];
    } else {
      const results = await query;
      return results as TokenUsageRecord[];
    }
  }

  /**
   * Get token usage statistics
   */
  async getTokenUsageStats(filters: TokenUsageStatsFilters = {}): Promise<TokenUsageStats> {
    // Build the base query with filters
    let baseQuery = sql`SELECT 
      COUNT(*) as total_requests,
      SUM(${tokenUsageTracking.inputTokens}) as total_input_tokens,
      SUM(${tokenUsageTracking.outputTokens}) as total_output_tokens,
      SUM(CAST(${tokenUsageTracking.estimatedCostInEuros} AS NUMERIC)) as total_cost_in_euros
    FROM ${tokenUsageTracking}`;

    let modelQuery = sql`SELECT 
      ${tokenUsageTracking.aiModel} as model,
      COUNT(*) as requests,
      SUM(CAST(${tokenUsageTracking.estimatedCostInEuros} AS NUMERIC)) as total_cost
    FROM ${tokenUsageTracking}`;

    // Apply filters to both queries
    const conditions = [];
    
    if (filters.authorId) {
      conditions.push(sql`${tokenUsageTracking.authorId} = ${filters.authorId}`);
    }
    
    if (filters.storyId) {
      conditions.push(sql`${tokenUsageTracking.storyId} = ${filters.storyId}`);
    }
    
    if (filters.action) {
      conditions.push(sql`${tokenUsageTracking.action} = ${filters.action}`);
    }
    
    if (filters.dateFrom) {
      conditions.push(sql`${tokenUsageTracking.createdAt} >= ${filters.dateFrom.toISOString()}`);
    }
    
    if (filters.dateTo) {
      conditions.push(sql`${tokenUsageTracking.createdAt} <= ${filters.dateTo.toISOString()}`);
    }

    if (conditions.length > 0) {
      const whereClause = sql` WHERE ${sql.join(conditions, sql` AND `)}`;
      baseQuery = sql`${baseQuery}${whereClause}`;
      modelQuery = sql`${modelQuery}${whereClause}`;
    }

    modelQuery = sql`${modelQuery} GROUP BY ${tokenUsageTracking.aiModel} ORDER BY total_cost DESC`;

    try {
      const [statsResult, modelStatsResult] = await Promise.all([
        db.execute(baseQuery),
        db.execute(modelQuery)
      ]);      const stats = statsResult.rows[0] as {
        total_requests: string | number | undefined;
        total_input_tokens: string | number | undefined;
        total_output_tokens: string | number | undefined;
        total_cost_in_euros: string | number | undefined;
      };
      const modelStats = modelStatsResult.rows as Array<{
        model: string;
        requests: string | number;
        total_cost: string | number;
      }>;
      const totalRequests = parseInt(String(stats.total_requests || '0'));
      const totalInputTokens = parseInt(String(stats.total_input_tokens || '0'));
      const totalOutputTokens = parseInt(String(stats.total_output_tokens || '0'));
      const totalCost = parseFloat(String(stats.total_cost_in_euros || '0'));

      return {
        totalRequests,
        totalInputTokens,
        totalOutputTokens,
        totalCostInEuros: totalCost,
        averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        mostUsedModel: modelStats.length > 0 ? modelStats[0].model : null,        costByModel: modelStats.map(row => ({
          model: row.model,
          requests: parseInt(String(row.requests)),
          totalCost: parseFloat(String(row.total_cost))
        }))
      };
    } catch (error) {
      console.error('Failed to get token usage stats:', error);
      throw new Error('Failed to get token usage stats');
    }
  }

  /**
   * Get token usage for a specific story
   */
  async getStoryTokenUsage(storyId: string): Promise<TokenUsageRecord[]> {
    return this.getTokenUsageRecords({ storyId });
  }

  /**
   * Get token usage for a specific author
   */
  async getAuthorTokenUsage(authorId: string): Promise<TokenUsageRecord[]> {
    return this.getTokenUsageRecords({ authorId });
  }

  /**
   * Get recent token usage (last 24 hours)
   */
  async getRecentTokenUsage(authorId?: string): Promise<TokenUsageRecord[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.getTokenUsageRecords({
      ...(authorId && { authorId }),
      dateFrom: yesterday
    });
  }

  /**
   * Get cost summary for a date range
   */
  async getCostSummary(
    authorId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    totalCost: number;
    requestCount: number;
    averageCostPerRequest: number;
  }> {
    const stats = await this.getTokenUsageStats({
      authorId,
      dateFrom,
      dateTo
    });

    return {
      totalCost: stats.totalCostInEuros,
      requestCount: stats.totalRequests,
      averageCostPerRequest: stats.averageCostPerRequest
    };
  }
}

// Export a singleton instance
export const tokenUsageService = new TokenUsageTrackingService();
