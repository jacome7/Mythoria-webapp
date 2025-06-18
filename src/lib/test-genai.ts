// Test script to verify the GenAI story structurer works
import { generateStructuredStory } from './genai-story-structurer';

async function testGenAI() {
  try {
    console.log('Testing GenAI story structurer...');
      const result = await generateStructuredStory(
      "A brave princess must save her kingdom from an evil dragon that has been terrorizing the villages.",
      [],
      null,
      null,
      'en-US',
      'test-author-id', // Test author ID for token tracking
      'test-story-id'   // Test story ID for token tracking
    );
    
    console.log('Success! Generated structured story:');
    console.log('Story:', JSON.stringify(result.story, null, 2));
    console.log('Characters:', JSON.stringify(result.characters, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGenAI();
