// Main exports for prompt system
export { getLanguageSpecificPrompt, getLanguageSpecificSchema } from '../lib/prompt-loader';
export type { PromptConfig } from '../lib/prompt-loader';

// Centralized schema export
export { structureStoryOutlineSchema } from './structureStoryOutline_schema';

// Direct exports for compatibility
export { default as enUSPrompt } from '../prompts/en-US/structureStoryOutline_prompt';
