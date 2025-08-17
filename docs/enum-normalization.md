# Enum Normalization Architecture

## Problem Statement

The GenAI system was outputting values that didn't match the UI dropdown options, causing form validation failures and poor user experience. For example:

- GenAI output: `"young children"` → UI expects: `"children_3-6"`
- GenAI output: `"magical adventure"` → UI expects: `"fantasy"`  
- GenAI output: `"animated cartoon"` → UI expects: `"cartoon"`

## Solution Overview

We've implemented a comprehensive enum normalization system that maps GenAI outputs to valid enum values automatically.

## Architecture Components

### 1. Enum Normalizers (`src/utils/enum-normalizers.ts`)

**Core Functions:**
- `normalizeTargetAudience(audience: string)` → `TargetAudience`
- `normalizeNovelStyle(style: string)` → `NovelStyle`  
- `normalizeGraphicalStyle(style: string)` → `GraphicalStyle`
- `normalizeStoryEnums(story: Record<string, unknown>)` → Normalized story object

**Features:**
- **Direct matching**: Handles exact enum values (case-insensitive)
- **Synonym mapping**: Maps common variations to correct enums
- **Keyword detection**: Falls back to keyword-based matching
- **Intelligent defaults**: Provides sensible fallbacks for unknown values

### 2. Integration Point

Normalization is applied in the server-side Story Structurer flow (now handled by the Story-generation-workflow service). Webapp consumers receive normalized enums from the API.

### 3. Enhanced Prompts (`src/prompts/`)

Updated GenAI prompts to be more explicit about required enum values:
- Added exact enum requirements to schema descriptions
- Included comprehensive examples with all valid values
- Added critical enum requirements section

## Normalization Examples

### Target Audience
```typescript
normalizeTargetAudience("young children") → "children_3-6"
normalizeTargetAudience("elementary") → "children_7-10"  
normalizeTargetAudience("teenagers") → "young_adult_15-17"
normalizeTargetAudience("adults") → "adult_18+"
```

### Novel Style
```typescript
normalizeNovelStyle("magical adventure") → "fantasy"
normalizeNovelStyle("funny story") → "comedy"
normalizeNovelStyle("detective story") → "mystery"
normalizeNovelStyle("space story") → "science_fiction"
```

### Graphical Style
```typescript
normalizeGraphicalStyle("animated cartoon") → "cartoon"
normalizeGraphicalStyle("3D animation") → "pixar_style"
normalizeGraphicalStyle("hand drawn") → "hand_drawn"
normalizeGraphicalStyle("photorealistic") → "realistic"
```

## Benefits

1. **Robust GenAI Integration**: Handles all common GenAI output variations
2. **Zero Breaking Changes**: Existing code continues to work unchanged
3. **Future-Proof**: Easy to add new synonyms and variations
4. **Type Safety**: Maintains TypeScript type safety throughout
5. **Consistent UX**: Users always see valid dropdown options

## Usage

### In GenAI Processing
Normalization happens automatically in the story structurer - no changes needed.

### Manual Normalization
```typescript
import { normalizeTargetAudience } from '@/utils/enum-normalizers';

const userInput = "young kids";
const validEnum = normalizeTargetAudience(userInput); // "children_3-6"
```

### Testing
Run the test script to see normalization in action:
```bash
npx ts-node scripts/test-enum-normalization.ts
```

## Maintenance

### Adding New Synonyms
To add support for new GenAI variations, simply update the mapping objects in `enum-normalizers.ts`:

```typescript
const audienceMap: Record<string, TargetAudience> = {
  // ... existing mappings
  'new_variation': TargetAudience.CHILDREN_3_6,
  // ... 
};
```

### Database Schema
**IMPORTANT**: No database changes are required. The normalization happens at the application layer, ensuring the database continues to receive valid enum values.

## Future Enhancements

1. **Analytics**: Track which GenAI outputs are being normalized most frequently
2. **Smart Learning**: Automatically suggest new synonyms based on common failures
3. **Localization**: Extend normalization to support multiple languages
4. **Character Enum Consistency**: Apply similar improvements to character type normalization

## Related Files

- `src/utils/enum-normalizers.ts` - Main normalization logic
// Deprecated: the old `src/lib/genai-story-structurer.ts` was removed after migration to SGW.
- `src/prompts/structureStoryOutline_schema.ts` - Enhanced schema
- `src/prompts/en-US/structureStoryOutline_prompt.ts` - Enhanced prompts
- `src/types/story-enums.ts` - Enum definitions
- `scripts/test-enum-normalization.ts` - Test script
