/**
 * GenAI Cost Calculator
 * 
 * Provides cost calculation utilities for various GenAI models
 * Based on mid-2025 pricing data
 */

import genaiCostsData from './genai-costs-data.json';

export interface ModelCosts {
  inputCostPerKToken: number;
  outputCostPerKToken: number;
  imageCostPerImage: number | null;
}

export interface CostCalculationInput {
  provider: 'openai' | 'google';
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  imageCount?: number;
}

export interface CostCalculationResult {
  inputCost: number;
  outputCost: number;
  imageCost?: number;
  totalCost: number;
  modelFound: boolean;
  provider: string;
  modelName: string;
}

/**
 * Get cost information for a specific model
 */
export function getModelCosts(provider: 'openai' | 'google', modelName: string): ModelCosts | null {
  const providerData = genaiCostsData[provider];
  if (!providerData) {
    console.warn(`Provider ${provider} not found in cost data`);
    return null;
  }

  const modelData = providerData[modelName as keyof typeof providerData];
  if (!modelData) {
    console.warn(`Model ${modelName} not found for provider ${provider}`);
    return null;
  }

  return modelData as ModelCosts;
}

/**
 * Calculate the cost for a GenAI request
 */
export function calculateGenAICost(input: CostCalculationInput): CostCalculationResult {
  const { provider, modelName, inputTokens, outputTokens, imageCount = 0 } = input;
  
  const modelCosts = getModelCosts(provider, modelName);
  
  if (!modelCosts) {
    // Return a result with zero costs if model not found
    return {
      inputCost: 0,
      outputCost: 0,
      imageCost: 0,
      totalCost: 0,
      modelFound: false,
      provider,
      modelName
    };
  }

  // Calculate token costs (costs are per 1K tokens)
  const inputCost = (inputTokens / 1000) * modelCosts.inputCostPerKToken;
  const outputCost = (outputTokens / 1000) * modelCosts.outputCostPerKToken;
  
  // Calculate image costs if applicable
  let imageCost = 0;
  if (imageCount > 0 && modelCosts.imageCostPerImage !== null) {
    imageCost = imageCount * modelCosts.imageCostPerImage;
  }

  const totalCost = inputCost + outputCost + imageCost;

  return {
    inputCost,
    outputCost,
    imageCost: imageCost > 0 ? imageCost : undefined,
    totalCost,
    modelFound: true,
    provider,
    modelName
  };
}

/**
 * Normalize model name to match our cost data
 * Handles common variations in model names
 */
export function normalizeModelName(modelName: string): string {
  // Remove common prefixes/suffixes and normalize
  const normalized = modelName
    .toLowerCase()
    .replace(/^models\//, '') // Remove Google's models/ prefix
    .replace(/-experimental$/, '') // Remove experimental suffix
    .replace(/-exp$/, '') // Remove exp suffix
    .replace(/-preview$/, '') // Remove preview suffix
    .replace(/_/, '-'); // Replace underscores with hyphens

  // Map common variations to our standard names
  const mappings: Record<string, string> = {
    'gemini-2.0-flash-exp': 'gemini-2.0-flash',
    'gemini-2.0-flash-experimental': 'gemini-2.0-flash',
    'gemini-2.0-pro-exp': 'gemini-2.0-pro',
    'gemini-2.0-pro-experimental': 'gemini-2.0-pro',
    'gemini-2.5-flash-exp': 'gemini-2.5-flash',
    'gemini-2.5-flash-experimental': 'gemini-2.5-flash',
    'gemini-2.5-pro-exp': 'gemini-2.5-pro',
    'gemini-2.5-pro-experimental': 'gemini-2.5-pro',
    'gpt-4o': 'gpt-4.1', // Assuming 4o maps to 4.1
    'gpt-4o-mini': 'gpt-4.1-mini',
    'o1-mini': 'o4-mini', // Assuming o1-mini maps to o4-mini
  };

  return mappings[normalized] || normalized;
}

/**
 * Get all available models with their costs
 */
export function getAllModels(): Array<{
  provider: 'openai' | 'google';
  modelName: string;
  costs: ModelCosts;
}> {
  const models: Array<{
    provider: 'openai' | 'google';
    modelName: string;
    costs: ModelCosts;
  }> = [];

  Object.entries(genaiCostsData).forEach(([provider, providerData]) => {
    Object.entries(providerData).forEach(([modelName, costs]) => {
      models.push({
        provider: provider as 'openai' | 'google',
        modelName,
        costs: costs as ModelCosts
      });
    });
  });

  return models;
}

/**
 * Estimate cost based on text length (rough approximation)
 * Uses a simple heuristic: ~1 token per 4 characters for input, varies by model for output
 */
export function estimateCostFromText(
  provider: 'openai' | 'google',
  modelName: string,
  inputText: string,
  expectedOutputTokens: number = 1000,
  imageCount: number = 0
): CostCalculationResult {
  // Rough approximation: 1 token ≈ 4 characters
  const estimatedInputTokens = Math.ceil(inputText.length / 4);
  
  return calculateGenAICost({
    provider,
    modelName,
    inputTokens: estimatedInputTokens,
    outputTokens: expectedOutputTokens,
    imageCount
  });
}
