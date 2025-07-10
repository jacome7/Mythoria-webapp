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
└── en-US/                             # English prompts with AI language detection
    └── structureStoryOutline_prompt.ts
```

## Language Support Architecture

**New Architecture (Current)**: The system now uses **AI-powered language detection** instead of multiple prompt files. The English prompt contains sophisticated instructions for the AI to:
1. **Detect** the primary language from user input (text, image, or audio)
2. **Generate** all story content in the detected language
3. **Return** the detected language in the `storyLanguage` field

This approach provides:
- ✅ Support for any language the AI model understands
- ✅ Automatic language detection from user content
- ✅ Single prompt file to maintain
- ✅ Better language mixing and context understanding

## How It Works

1. **User Input**: User provides text, image, or audio content in any language
2. **AI Detection**: The English prompt instructs the AI to detect the primary language from the content
3. **Content Generation**: AI generates all story content in the detected language
4. **Language Selection**: In Step-4, users can override the detected language if needed
5. **Fallback**: If no clear language is detected, defaults to English (en-US)

## Key Changes Made

### 1. Centralized Schema
- `src/prompts/structureStoryOutline_schema.ts` - Single schema file used by all languages
- Includes `storyLanguage` field for the AI to return detected language

### 2. Single Prompt with AI Language Detection
- `src/prompts/en-US/structureStoryOutline_prompt.ts` - English prompt with comprehensive language detection instructions
- Removed language-specific prompt files (pt-PT) as they're no longer needed

### 3. Updated Prompt Loader Utility
- `src/lib/prompt-loader.ts` - Simplified to always use English prompt with AI language detection
- Removed fallback logic as only one prompt file is used

### 4. Enhanced Language Detection Instructions
- AI analyzes user content to determine primary language/locale
- Generates all story content in the detected language
- The AI respects the `storyLanguage` field to determine output language

## Usage

### How the AI Language Detection Works

The system automatically detects language from user input and generates content accordingly:

```typescript
// The AI analyzes this input and detects Portuguese
const userInput = "Quero uma história sobre um dragão mágico";
// Result: AI generates all content in Portuguese and sets storyLanguage: "pt-PT"
```

### Testing

Use the test utility to verify the AI language detection system:

```typescript
import { testPromptLoading } from '@/prompts/test-prompt-loading';

const result = await testPromptLoading();
console.log(result);
```

### Manual Language Override

Users can override the AI-detected language in Step-4 of the story creation process.

## Important Notes

- **Single Source of Truth**: Only one prompt file with comprehensive language detection instructions
- **AI-Powered**: Leverages advanced language models for accurate language detection and generation
- **Flexible**: Supports any language the AI model understands (not limited to predefined prompt files)
- **Backward Compatible**: Existing functionality remains intact
- **Fallback Safe**: Defaults to English if no clear language is detected

## Migration from Previous Architecture

**Before**: Multiple prompt files (en-US, pt-PT) with static language-specific content
**After**: Single prompt file with AI language detection capabilities

Benefits of the new approach:
- 🔧 **Easier Maintenance**: One prompt file instead of multiple
- 🌍 **Broader Language Support**: Any language the AI understands
- 🎯 **Better Accuracy**: AI detects language from actual content context
- 🚀 **Future-Proof**: Scales automatically as AI language capabilities improve
