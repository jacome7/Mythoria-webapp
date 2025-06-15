# Mythoria AI Prompts System

This directory contains language-specific prompts and a centralized schema for the Mythoria AI story generation system.

## Overview

The Mythoria webapp supports multi-language AI prompt generation. The AI component that processes user input (text, images, or audio) in step-2 of the "tell your story" feature uses language-specific prompts with a centralized schema to ensure consistency.

## Features

1. **Language-specific prompts**: Prompts are stored in separate folders by language code
2. **Centralized schema**: Single schema file used across all languages for consistency  
3. **Automatic fallback**: If a specific language is not supported, falls back to en-US
4. **User language detection**: Uses the language selected by the user in step-2
5. **Dynamic content generation**: AI generates content in the user's selected language

## Directory Structure

```
src/prompts/
├── index.ts                           # Main exports
├── structureStoryOutline_schema.ts    # Centralized schema (used by all languages)
├── test-prompt-loading.ts             # Test utilities
├── en-US/                             # English prompts
│   └── structureStoryOutline_prompt.ts
└── pt-PT/                             # Portuguese prompts
    └── structureStoryOutline_prompt.ts
```

## Supported Languages

- **en-US**: English (United States) - Default/Fallback
- **pt-PT**: Portuguese (Portugal)

## How It Works

1. **User Selection**: User selects their preferred language in step-2 of story creation
2. **Language Passing**: The selected language is passed to the GenAI API endpoint
3. **Prompt Loading**: The system loads the appropriate language-specific prompt
4. **Schema Loading**: The system uses the centralized schema for all languages
5. **Content Generation**: AI generates story content in the user's requested language (from Step-2)
6. **Fallback**: If the language prompt is not supported, defaults to English prompts

## Key Changes Made

### 1. Centralized Schema
- `src/prompts/structureStoryOutline_schema.ts` - Single schema file used by all languages
- Removed language-specific schema files to avoid maintenance overhead

### 2. Language-Specific Prompt Files
- `src/prompts/en-US/structureStoryOutline_prompt.ts` - English prompts with instructions to generate content in user's selected language
- `src/prompts/pt-PT/structureStoryOutline_prompt.ts` - Portuguese prompts

### 3. Updated Prompt Loader Utility
- `src/lib/prompt-loader.ts` - Updated to use centralized schema for all languages

### 4. Enhanced Language Instructions
- Updated en-US prompt to instruct AI to generate content in the language selected by user in Step-2
- AI now respects the `storyLanguage` field to determine output language

## Usage

### Adding a New Language

1. Create a new directory under `src/prompts/` with the language code (e.g., `es-ES` for Spanish)
2. Create `structureStoryOutline_prompt.ts` with prompts translated to the new language
3. Add the language code to the `supportedLanguages` array in `src/lib/prompt-loader.ts`
4. The centralized schema will automatically be used for the new language

### Testing

Use the test utility to verify prompt loading:

```typescript
import { testPromptLoading } from '@/prompts/test-prompt-loading';

const result = await testPromptLoading();
console.log(result);
```

## Important Notes

- The system maintains backward compatibility with existing functionality
- All prompts include explicit instructions for the AI to generate content in the user's selected language from Step-2
- The schema structure is centralized and consistent, avoiding maintenance overhead
- Fallback to English ensures the system always works even for unsupported languages
- The AI respects the `storyLanguage` field to determine the output language for all content

## Future Enhancements

- Add support for more languages (es-ES, fr-FR, de-DE, it-IT, etc.)
- Consider dynamic prompt loading based on user preferences
- Add language detection for user input to auto-select appropriate prompts
- Implement caching for frequently used prompts to improve performance
