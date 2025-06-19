/**
 * Simple verification script for Mythoria CSS Class Preservation Utility
 * Run with: node -r ts-node/register src/utils/__tests__/mythoriaClassPreserver.test.ts
 */

import { 
  preserveMythoriaClasses, 
  validateMythoriaClasses, 
  getMythoriaClassesInHtml 
} from '../mythoriaClassPreserver';

// Simple test runner
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error}`);
  }
}

function expect(actual: unknown) {
  return {
    toBe: (expected: unknown) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toContain: (expected: string) => {
      if (typeof actual === 'string' && !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toHaveLength: (expected: number) => {
      if (Array.isArray(actual) && actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual.length}`);
      }
    }
  };
}

console.log('🧪 Testing Mythoria Class Preservation...\n');

// Test preserveMythoriaClasses
test('should preserve existing Mythoria classes', () => {
  const html = '<h1 class="mythoria-story-title">Test Story</h1>';
  const result = preserveMythoriaClasses(html);
  expect(result).toContain('mythoria-story-title');
});

test('should handle empty content', () => {
  expect(preserveMythoriaClasses('')).toBe('');
  expect(preserveMythoriaClasses('   ')).toBe('   ');
});

// Test validateMythoriaClasses
test('should detect missing required classes', () => {
  const html = '<div>Simple content</div>';
  const result = validateMythoriaClasses(html);
  if (result.isValid) {
    throw new Error('Should detect missing classes');
  }
  if (result.missingElements.length === 0) {
    throw new Error('Should have missing elements');
  }
});

// Test getMythoriaClassesInHtml
test('should find Mythoria classes in HTML', () => {
  const html = '<h1 class="mythoria-story-title">Title</h1>';
  const classes = getMythoriaClassesInHtml(html);
  expect(classes).toContain('mythoria-story-title');
});

test('should return empty array when no classes found', () => {
  const html = '<div>No Mythoria classes</div>';
  const classes = getMythoriaClassesInHtml(html);
  expect(classes).toHaveLength(0);
});

console.log('\n✨ All tests completed!');
