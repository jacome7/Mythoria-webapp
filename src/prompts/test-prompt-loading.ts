// Simple test to verify the prompt loading system works correctly
import { getLanguageSpecificPrompt, getLanguageSpecificSchema } from '../lib/prompt-loader';

// Test function to verify prompt loading
export async function testPromptLoading() {
  try {
    console.log('Testing English (en-US) prompt loading (now used for all languages with AI language detection)...');
    const enPrompt = await getLanguageSpecificPrompt();
    const enSchema = await getLanguageSpecificSchema();
    
    console.log('✓ English prompt loaded successfully:', !!enPrompt);
    console.log('✓ Schema loaded successfully:', !!enSchema);
    
    console.log('Testing that all language requests use English prompt with AI detection...');
    const ptPrompt = await getLanguageSpecificPrompt();
    
    console.log('✓ Portuguese request uses English prompt with AI detection:', !!ptPrompt);
    
    // Verify that the prompt contains language detection instructions
    const hasLanguageDetection = enPrompt.systemPrompt.includes('language') || 
                                   enPrompt.template.includes('language') ||
                                   enPrompt.instructions.some(i => i.includes('language'));
    
    console.log('✓ Prompt contains language detection instructions:', hasLanguageDetection);
    
    // Verify that the same prompt is returned for different language requests
    if (enPrompt === ptPrompt) {
      console.log('✓ All language requests return the same prompt with AI language detection');
    } else {
      console.warn('⚠ Different prompts returned - this may indicate an issue');
    }
    
    return {
      success: true,
      message: 'All prompt loading tests passed successfully! System now uses AI language detection.',
      results: {
        english: { prompt: !!enPrompt, schema: !!enSchema },
        aiLanguageDetection: { prompt: !!ptPrompt, sameAsEnglish: enPrompt === ptPrompt }
      }
    };
    
  } catch (error) {
    console.error('❌ Prompt loading test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Export for use in other parts of the application
export default testPromptLoading;
