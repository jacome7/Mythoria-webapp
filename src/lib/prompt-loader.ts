// Utility function to load language-specific prompts and schemas
export interface PromptConfig {
  systemPrompt: string;
  instructions: string[];
  imageAnalysisInstructions: string[];
  examples: Record<string, string>;
  template: string;
}

export async function getLanguageSpecificPrompt(): Promise<PromptConfig> {
  // Since the AI now auto-detects language and generates content in the detected language,
  // we always use the English prompt which contains language detection instructions
  const targetLanguage = 'en-US'; // Always use English prompt for language detection
  
  try {
    const promptModule = await import(`@/prompts/${targetLanguage}/structureStoryOutline_prompt`);
    return promptModule.default as PromptConfig;
  } catch (error) {
    console.warn(`Failed to load prompt for language ${targetLanguage}:`, error);
    throw error; // Re-throw since there's no other fallback
  }
}

export async function getLanguageSpecificSchema(): Promise<unknown> {
  // Use centralized schema for all languages
  const schemaModule = await import('@/prompts/structureStoryOutline_schema');
  return schemaModule.structureStoryOutlineSchema;
}
