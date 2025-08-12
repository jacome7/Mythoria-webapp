#!/usr/bin/env node

// Minimal smoke tests for core utilities
const assert = require('assert');

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isValidSlug(slug) {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 100;
}

try {
  // generateSlug tests
  assert.strictEqual(generateSlug('Hello World!'), 'hello-world');
  assert.strictEqual(generateSlug('  Multiple   Spaces  '), 'multiple-spaces');
  assert.strictEqual(generateSlug('Café & Crème'), 'caf-crme');

  // isValidSlug tests
  assert.ok(isValidSlug('hello-world'));
  assert.ok(!isValidSlug('Hello-World'));
  assert.ok(!isValidSlug('a'));

  console.log('✅ Smoke tests passed');
  process.exit(0);
} catch (err) {
  console.error('❌ Smoke test failed:', err.message);
  process.exit(1);
}
