// Test script to demonstrate enum normalization functionality
// Run with: npx ts-node scripts/test-enum-normalization.ts

import { 
  normalizeTargetAudience, 
  normalizeNovelStyle, 
  normalizeGraphicalStyle,
  normalizeStoryEnums 
} from '../src/utils/enum-normalizers';

console.log('=== ENUM NORMALIZATION TEST ===\n');

// Test Target Audience Normalization
console.log('📊 TARGET AUDIENCE NORMALIZATION:');
const audienceTests = [
  'young children', 
  'elementary school kids',
  'teenagers',
  'adults',
  'preschoolers',
  'babies',
  'middle school',
  'family audience',
  'unknown_value'
];

audienceTests.forEach(test => {
  const normalized = normalizeTargetAudience(test);
  console.log(`  "${test}" → "${normalized}"`);
});

console.log('\n📚 NOVEL STYLE NORMALIZATION:');
const styleTests = [
  'magical adventure',
  'funny story',
  'detective mystery',
  'space adventure',
  'love story',
  'scary story',
  'historical tale',
  'unknown_genre'
];

styleTests.forEach(test => {
  const normalized = normalizeNovelStyle(test);
  console.log(`  "${test}" → "${normalized}"`);
});

console.log('\n🎨 GRAPHICAL STYLE NORMALIZATION:');
const graphicTests = [
  'animated cartoon',
  '3D animation',
  'hand drawn style',
  'photorealistic',
  'watercolor painting',
  'digital artwork',
  'comic book style',
  'unknown_style'
];

graphicTests.forEach(test => {
  const normalized = normalizeGraphicalStyle(test);
  console.log(`  "${test}" → "${normalized}"`);
});

console.log('\n🔄 COMPLETE STORY NORMALIZATION:');
const testStory = {
  title: 'Test Story',
  targetAudience: 'young children',
  novelStyle: 'magical adventure',
  graphicalStyle: 'animated cartoon',
  plotDescription: 'A test story'
};

const normalizedStory = normalizeStoryEnums(testStory);
console.log('Original:', testStory);
console.log('Normalized:', normalizedStory);

console.log('\n✅ All normalization tests completed!');
