import { GoogleGenAI } from "@google/genai";
import { getLanguageSpecificPrompt, getLanguageSpecificSchema } from "./prompt-loader";
import { calculateGenAICost, normalizeModelName } from "@/db/genai-cost-calculator";
import { normalizeCharacterType } from "@/types/character-enums";
import { normalizeStoryEnums } from "@/utils/enum-normalizers";
import { getLibTranslations } from '@/utils/lib-translations';

// Initialize GoogleGenAI client with Vertex AI configuration
const clientOptions = {
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || "oceanic-beach-460916-n5",
  location: process.env.GOOGLE_AI_LOCATION || "global",
};

const ai = new GoogleGenAI(clientOptions);

// Types for the structured output
export interface StructuredCharacter {
  characterId: string | null;
  name: string;
  type?: string;
  age?: string;
  traits?: string[];
  characteristics?: string;
  physicalDescription?: string;
  photoUrl?: string;
  role?: string;
}

export interface StructuredStory {
  title?: string;
  plotDescription?: string;
  synopsis?: string;
  place?: string;
  additionalRequests?: string;
  targetAudience?: string;
  novelStyle?: string;
  graphicalStyle?: string;
  storyLanguage?: string;
}

export interface StructuredStoryResult {
  story: StructuredStory;
  characters: StructuredCharacter[];
  costInfo?: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    modelUsed: string;
  };
}

export async function generateStructuredStory(
  userDescription: string, 
  existingCharacters: Array<{
    characterId: string;
    name: string;
    authorId: string | null;
    [key: string]: unknown;
  }> = [],
  imageData?: string | null,
  audioData?: string | null,
  authorName?: string,
  locale?: string
  // Note: authorId and storyId parameters removed as token tracking moved to workflows service
): Promise<StructuredStoryResult> {
  try {
    // Load language-specific prompt and schema - using English by default
    // since the AI will now infer the target language from user content
    const promptConfig = await getLanguageSpecificPrompt();
    const responseSchema = await getLanguageSpecificSchema();
    
    // Get translations for error messages
    const { t } = await getLibTranslations(locale);

    // DEBUG: Log the schema being sent to GenAI
    console.log('=== DEBUG: GenAI Response Schema ===');
    console.log(JSON.stringify(responseSchema, null, 2));
    console.log('=== END DEBUG SCHEMA ===');

    // Build the system prompt from template
    const systemPrompt = promptConfig.template
      .replace('{{userDescription}}', userDescription)
      .replace('{{existingCharacters}}', JSON.stringify(existingCharacters))
      .replace('{{authorName}}', authorName || '');
    // Get model name from environment - use the most reliable model for structured output
    // According to Google Cloud docs, these models support structured output:
    // gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite
    const modelName = process.env.MODEL_ID || "gemini-2.5-flash";
    
    const generationConfig = {
      maxOutputTokens: 16384,
      temperature: 0.8,
      topP: 0.8,
      responseMimeType: "application/json", // This forces JSON output
      responseSchema: responseSchema, // This enforces the exact schema structure
    };

    // DEBUG: Log the generation config being sent to GenAI
    console.log('=== DEBUG: GenAI Generation Config ===');
    console.log(JSON.stringify(generationConfig, null, 2));
    console.log('=== END DEBUG GENERATION CONFIG ===');

    // Prepare content based on whether we have image data, audio data, or both
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contents: any[];

    if (imageData || audioData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: systemPrompt }];
      
      // Add image if present
      if (imageData) {
        try {
          const base64Data = imageData.split(',')[1];
          const mimeType = imageData.split(';')[0].split(':')[1];
          
          if (!base64Data || !mimeType) {
            throw new Error(t('genaiStoryStructurer.errors.invalidImageFormat'));
          }
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        } catch {
          throw new Error(t('genaiStoryStructurer.errors.failedToProcessImage'));
        }
      }
      
      // Add audio if present
      if (audioData) {
        try {
          const base64Data = audioData.split(',')[1];
          const mimeType = audioData.split(';')[0].split(':')[1];
          
          if (!base64Data || !mimeType) {
            throw new Error(t('genaiStoryStructurer.errors.invalidAudioFormat'));
          }
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        } catch {
          throw new Error(t('genaiStoryStructurer.errors.failedToProcessAudio'));
        }
      }
      
      contents = [
        {
          role: 'user',
          parts: parts
        }
      ];
    } else {
      contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ];
    }
    
    // Prepare the request with structured output schema
    const req = {
      model: modelName,
      contents: contents,
      generationConfig: generationConfig,
    }
    
    // Generate content
    const result = await ai.models.generateContent(req);
    
    // Extract token usage information from the response
    const inputTokens = result.usageMetadata?.promptTokenCount || 0;
    const outputTokens = result.usageMetadata?.candidatesTokenCount || 0;
    
    // Calculate cost for this request
    const normalizedModelName = normalizeModelName(modelName);
    const imageCount = imageData ? 1 : 0; // Count images if present
    
    const costInfo = calculateGenAICost({
      provider: 'google',
      modelName: normalizedModelName,
      inputTokens,
      outputTokens,
      imageCount
    });
    
    // Note: Token usage tracking has been moved to the story-generation-workflow service
    // and will be handled there for consistency.
    
    // Get the text from the response
    const text = result.text;
    
    if (!text) {
      throw new Error(t('genaiStoryStructurer.errors.noResponseText'));
    }    // Clean the response text to handle potential markdown wrapping and extra text
    let cleanedText = text.trim();
    
    // Enhanced JSON extraction to handle responses with explanatory text
    // First, try to find JSON within the response
    let jsonStartIndex = -1;
    let jsonEndIndex = -1;
    
    // Look for JSON starting patterns
    const jsonStartPatterns = ['{', '```json', '```'];
    for (const pattern of jsonStartPatterns) {
      const index = cleanedText.indexOf(pattern);
      if (index !== -1) {
        if (pattern === '```json') {
          jsonStartIndex = index + pattern.length;
        } else if (pattern === '```') {
          jsonStartIndex = index + pattern.length;
        } else {
          jsonStartIndex = index;
        }
        break;
      }
    }
    
    if (jsonStartIndex !== -1) {
      // Find the end of JSON
      let braceCount = 0;
      let inString = false;
      let escaped = false;
      
      for (let i = jsonStartIndex; i < cleanedText.length; i++) {
        const char = cleanedText[i];
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEndIndex = i + 1;
              break;
            }
          }
        }
      }
      
      if (jsonEndIndex !== -1) {
        cleanedText = cleanedText.substring(jsonStartIndex, jsonEndIndex);
      }
    }
    
    // Remove any remaining markdown formatting
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Final cleanup
    cleanedText = cleanedText.trim();    // Parse the JSON text returned by the model
    let parsedResult: StructuredStoryResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch {
      // Try to extract JSON even if parsing failed - maybe there's text before/after
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error(t('genaiStoryStructurer.errors.invalidJsonFormat'));
        }
      } else {
        throw new Error(t('genaiStoryStructurer.errors.invalidJsonFormat'));
      }
    }

    // Validate the structure
    if (!parsedResult.story || !Array.isArray(parsedResult.characters)) {
      // Try to create a fallback structure if the response has some usable content
      const fallbackResult: StructuredStoryResult = {
        story: {
          plotDescription: userDescription,
          title: t('genaiStoryStructurer.fallbacks.generatedStoryTitle')
        },
        characters: [],
        costInfo: costInfo.modelFound ? {
          totalCost: costInfo.totalCost,
          inputTokens,
          outputTokens,
          modelUsed: modelName
        } : undefined
      };
      
      return fallbackResult;
    }

    // Normalize character types to ensure they match the required enum values
    if (parsedResult.characters && Array.isArray(parsedResult.characters)) {
      parsedResult.characters = parsedResult.characters.map(character => ({
        ...character,
        type: normalizeCharacterType(character.type)
      }));
    }

    // Normalize story enum fields to ensure they match the required enum values
    if (parsedResult.story) {
      const normalized = normalizeStoryEnums(parsedResult.story as Record<string, unknown>);
      parsedResult.story = normalized as StructuredStory;
    }

    // Add cost information to the result
    const resultWithCost: StructuredStoryResult = {
      ...parsedResult,
      costInfo: costInfo.modelFound ? {
        totalCost: costInfo.totalCost,
        inputTokens,
        outputTokens,
        modelUsed: modelName
      } : undefined
    };

    return resultWithCost;
  } catch (error) {
    const { t } = await getLibTranslations(locale);
    throw new Error(t('genaiStoryStructurer.errors.failedToGenerate', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }));
  }
}

export default generateStructuredStory;
