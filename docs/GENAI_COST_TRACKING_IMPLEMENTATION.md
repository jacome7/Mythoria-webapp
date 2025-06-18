# GenAI Cost Tracking Implementation

## Overview
This implementation adds comprehensive cost tracking for GenAI requests in the Mythoria application. It includes cost calculation, database storage, and integration with the existing story generation workflow.

## Components Created

### 1. Cost Data Schema (`src/db/genai-costs.json`)
- JSON Schema definition for GenAI model costs
- Provides structure validation for cost data

### 2. Static Cost Data (`src/db/genai-costs-data.json`)
- Mid-2025 pricing data for major GenAI providers:
  - **OpenAI**: GPT-4.1, GPT-4.1-mini, o4-mini, o3
  - **Google**: Gemini 2.0/2.5 Flash, Gemini 2.0/2.5 Pro, Imagen 4 variants
- Costs in EUR per 1K tokens and per image

### 3. Cost Calculator (`src/db/genai-cost-calculator.ts`)
**Key Functions:**
- `calculateGenAICost()`: Calculate total cost for a request
- `getModelCosts()`: Get cost data for specific model
- `normalizeModelName()`: Handle model name variations
- `estimateCostFromText()`: Rough cost estimation from text length

**Features:**
- Provider-agnostic calculation
- Model name normalization (handles experimental/preview variants)
- Image cost calculation support
- Fallback handling for unknown models

### 4. Token Usage Tracking Service (`src/db/services/token-usage-tracking.ts`)
**Key Functions:**
- `recordTokenUsage()`: Store usage data in database
- `getTokenUsageRecords()`: Query usage records with filters
- `getTokenUsageStats()`: Generate usage statistics
- `getCostSummary()`: Get cost summaries for date ranges

**Features:**
- Comprehensive filtering (author, story, action type, date range)
- Statistical analysis (total costs, most used models, averages)
- Pagination support
- Error handling and logging

### 5. Enhanced Story Structurer (`src/lib/genai-story-structurer.ts`)
**New Features:**
- Cost calculation after each GenAI request
- Automatic token usage tracking
- Cost information in response data
- Support for new parameters (`authorId`, `storyId`)

**Enhanced Response:**
```typescript
interface StructuredStoryResult {
  story: StructuredStory;
  characters: StructuredCharacter[];
  costInfo?: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    modelUsed: string;
  };
}
```

## Database Schema Updates

### Updated AI Action Types
Extended `ai_action_type` enum to include:
- `audio_generation`
- `content_validation`

### Token Usage Tracking Table
The `token_usage_tracking` table captures:
- Author and story IDs
- AI model used
- Input/output token counts
- Estimated cost in euros
- Full input prompt (JSON)
- Action type and timestamp

## Usage Examples

### Basic Cost Calculation
```typescript
import { calculateGenAICost } from '@/db/genai-cost-calculator';

const cost = calculateGenAICost({
  provider: 'google',
  modelName: 'gemini-2.5-flash',
  inputTokens: 1000,
  outputTokens: 500,
  imageCount: 1
});

console.log(`Total cost: €${cost.totalCost}`);
```

### Using Enhanced Story Generator
```typescript
import { generateStructuredStory } from '@/lib/genai-story-structurer';

const result = await generateStructuredStory(
  "A magical adventure story",
  [], // existing characters
  null, // image data
  null, // audio data
  'en-US', // language
  'author-uuid', // author ID for tracking
  'story-uuid'   // story ID for tracking
);

console.log(`Story generated with cost: €${result.costInfo?.totalCost}`);
```

### Querying Usage Statistics
```typescript
import { tokenUsageService } from '@/db/services/token-usage-tracking';

// Get author's usage stats for the last month
const stats = await tokenUsageService.getTokenUsageStats({
  authorId: 'author-uuid',
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
});

console.log(`Total spent: €${stats.totalCostInEuros}`);
console.log(`Most used model: ${stats.mostUsedModel}`);
```

## Model Cost Reference (Mid-2025)

| Model | Input €/1K tokens | Output €/1K tokens | Image €/image |
|-------|-------------------|-------------------|---------------|
| **OpenAI GPT-4.1** | 0.00173 | 0.00693 | — |
| **OpenAI GPT-4.1-mini** | 0.00035 | 0.00139 | — |
| **OpenAI o4-mini** | 0.000952 | 0.003809 | — |
| **OpenAI o3** | 0.001731 | 0.006925 | — |
| **Google Gemini 2.0 Flash** | 0.000130 | 0.000519 | 0.0337 |
| **Google Gemini 2.0 Pro** | 0.0000866 | 0.000346 | — |
| **Google Gemini 2.5 Flash** | 0.000130 | 0.000519 | 0.0337 |
| **Google Gemini 2.5 Pro** | 0.001082 | 0.008657 | — |
| **Google Imagen 4** | 0 | 0 | 0.0346 |
| **Google Imagen 4 Fast** | 0 | 0 | 0.0173 |
| **Google Imagen 4 Ultra** | 0 | 0 | 0.0520 |

## Benefits

1. **Cost Transparency**: Users can see exactly how much each AI request costs
2. **Usage Monitoring**: Track spending patterns by author, story, and model
3. **Budget Management**: Implement spending limits and alerts
4. **Analytics**: Understand which models are most cost-effective
5. **Audit Trail**: Complete record of all AI usage with costs
6. **Future-Proof**: Easy to add new models and update pricing

## Next Steps

To fully utilize this implementation:

1. **Update existing callers** of `generateStructuredStory()` to pass `authorId` and `storyId`
2. **Create admin dashboards** using the statistics functions
3. **Implement spending alerts** based on usage thresholds
4. **Add cost estimation** to the UI before requests
5. **Regularly update pricing data** as model costs change

## Error Handling

The implementation includes robust error handling:
- Cost calculation failures don't break main functionality
- Unknown models default to zero cost with logging
- Database tracking errors are logged but don't fail requests
- Fallback responses include cost information when available

This implementation provides a solid foundation for cost-aware GenAI usage in the Mythoria application.
