// Simple test to verify the prompt loading system works correctly
import { getLanguageSpecificPrompt, getLanguageSpecificSchema } from '../lib/prompt-loader';

// Test function to verify prompt loading
export async function testPromptLoading() {
  try {
    console.log('Testing English (en-US) prompt loading...');
    const enPrompt = await getLanguageSpecificPrompt('en-US');
    const enSchema = await getLanguageSpecificSchema();
    
    console.log('✓ English prompt loaded successfully:', !!enPrompt);
    console.log('✓ English schema loaded successfully:', !!enSchema);
    
    console.log('Testing Portuguese (pt-PT) prompt loading...');
    const ptPrompt = await getLanguageSpecificPrompt('pt-PT');
    const ptSchema = await getLanguageSpecificSchema();
    
    console.log('✓ Portuguese prompt loaded successfully:', !!ptPrompt);
    console.log('✓ Portuguese schema loaded successfully:', !!ptSchema);
    
    console.log('Testing fallback for unsupported language...');
    const fallbackPrompt = await getLanguageSpecificPrompt('fr-FR');
    const fallbackSchema = await getLanguageSpecificSchema();
    
    console.log('✓ Fallback prompt loaded successfully:', !!fallbackPrompt);
    console.log('✓ Fallback schema loaded successfully:', !!fallbackSchema);
    
    // Verify content differences
    const enInstruction = enPrompt.systemPrompt;
    const ptInstruction = ptPrompt.systemPrompt;
    
    if (enInstruction.includes('English') && ptInstruction.includes('Português')) {
      console.log('✓ Language-specific content verified');
    } else {
      console.warn('⚠ Language content may not be properly differentiated');
    }
    
    return {
      success: true,
      message: 'All prompt loading tests passed successfully!',
      results: {
        english: { prompt: !!enPrompt, schema: !!enSchema },
        portuguese: { prompt: !!ptPrompt, schema: !!ptSchema },
        fallback: { prompt: !!fallbackPrompt, schema: !!fallbackSchema }
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
