import { VertexAI } from "@google-cloud/vertexai";
import promptConfig from "./structureStoryOutline_prompt";
import { structureStoryOutlineSchema } from "./structureStoryOutline_schema";

// Initialize Vertex AI client
const clientOptions = {
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || "oceanic-beach-460916-n5",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
};

const vertexai = new VertexAI(clientOptions);

// Types for the structured output
export interface StructuredCharacter {
  characterId: string | null;
  name: string;
  type?: string;
  passions?: string;
  superpowers?: string;
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
}

export interface StructuredStoryResult {
  story: StructuredStory;
  characters: StructuredCharacter[];
}

export async function generateStructuredStory(
  userDescription: string, 
  existingCharacters: Array<{
    characterId: string;
    name: string;
    authorId: string | null;
    [key: string]: unknown;
  }> = []
): Promise<StructuredStoryResult> {
  try {    // Convert the schema template to use proper SchemaType enums
    const responseSchema = structureStoryOutlineSchema;    // Build the system prompt from template
    const systemPrompt = promptConfig.template
      .replace('{{userDescription}}', userDescription)
      .replace('{{existingCharacters}}', JSON.stringify(existingCharacters));

    // Get the generative model with response schema
    const model = vertexai.getGenerativeModel({
      model: process.env.MODEL_ID || "gemini-2.0-flash-001",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });// Generate content
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    
    // Get the text from the first candidate
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
      throw new Error("No response text generated from the model");
    }

    // Clean the response text to handle potential markdown wrapping
    let cleanedText = text.trim();
    
    // Remove markdown code block formatting if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Trim again after removing markdown
    cleanedText = cleanedText.trim();    // Parse the JSON text returned by the model
    let parsedResult: StructuredStoryResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse GenAI response as JSON:", cleanedText);
      throw new Error("GenAI returned invalid JSON format");
    }

    // Validate the structure
    if (!parsedResult.story || !Array.isArray(parsedResult.characters)) {
      throw new Error("GenAI response missing required story or characters structure");
    }

    return parsedResult;
  } catch (error) {
    console.error("Error in generateStructuredStory:", error);
    throw new Error(`Failed to generate structured story: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default generateStructuredStory;
