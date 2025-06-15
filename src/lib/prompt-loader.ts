// Utility function to load language-specific prompts and schemas
export interface PromptConfig {
  systemPrompt: string;
  instructions: string[];
  imageAnalysisInstructions: string[];
  examples: Record<string, string>;
  template: string;
}

export async function getLanguageSpecificPrompt(language: string): Promise<PromptConfig> {
  // Fallback to en-US if the specific language is not supported
  const supportedLanguages = ['en-US', 'pt-PT'];
  const targetLanguage = supportedLanguages.includes(language) ? language : 'en-US';
  
  try {
    const promptModule = await import(`@/prompts/${targetLanguage}/structureStoryOutline_prompt`);
    return promptModule.default as PromptConfig;
  } catch (error) {
    console.warn(`Failed to load prompt for language ${targetLanguage}, falling back to en-US:`, error);
    const fallbackModule = await import('@/prompts/en-US/structureStoryOutline_prompt');
    return fallbackModule.default as PromptConfig;
  }
}

export async function getLanguageSpecificSchema(): Promise<unknown> {
  // Use centralized schema for all languages
  const schemaModule = await import('@/prompts/structureStoryOutline_schema');
  return schemaModule.structureStoryOutlineSchema;
}
