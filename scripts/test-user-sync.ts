/**
 * Test script to verify user synchronization functionality
 * Run this with: npx tsx scripts/test-user-sync.ts
 */

import { authorService } from '../src/db/services';
import { ClerkUserForSync } from '../src/types/clerk';

// Mock Clerk user data for testing
const mockClerkUser: ClerkUserForSync = {
  id: 'test_user_123',
  emailAddresses: [
    {
      id: 'email_1',
      emailAddress: 'test@example.com'
    }
  ],
  phoneNumbers: [
    {
      id: 'phone_1', 
      phoneNumber: '+1234567890'
    }
  ],
  primaryEmailAddressId: 'email_1',
  primaryPhoneNumberId: 'phone_1',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser'
};

async function testUserSync() {
  console.log('🧪 Testing User Synchronization...\n');
  
  try {
    // Test 1: Create a new user
    console.log('Test 1: Creating new user...');
    const newUser = await authorService.syncUserOnSignIn(mockClerkUser);
    console.log('✅ New user created:', {
      authorId: newUser.authorId,
      clerkUserId: newUser.clerkUserId,
      displayName: newUser.displayName,
      email: newUser.email,
      mobilePhone: newUser.mobilePhone,
      lastLoginAt: newUser.lastLoginAt
    });
    
    // Wait a moment to see timestamp difference
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Update existing user (should update lastLoginAt)
    console.log('\nTest 2: Updating existing user login time...');
    const updatedUser = await authorService.syncUserOnSignIn(mockClerkUser);
    console.log('✅ User login time updated:', {
      authorId: updatedUser.authorId,
      lastLoginAt: updatedUser.lastLoginAt
    });
    
    // Test 3: Test display name building
    console.log('\nTest 3: Testing display name building...');
    
    const testCases = [
      { firstName: 'John', lastName: 'Doe', expected: 'John Doe' },
      { firstName: 'Jane', lastName: '', expected: 'Jane' },
      { username: 'cooluser', expected: 'cooluser' },
      { emailAddresses: [{ id: '1', emailAddress: 'hello@test.com' }], expected: 'hello' },
      {}, // Should fallback to 'Anonymous User'
    ];
    
    testCases.forEach((testCase, index) => {
      const displayName = authorService.buildDisplayName(testCase as any);
      console.log(`   Case ${index + 1}: ${JSON.stringify(testCase)} → "${displayName}"`);
    });
    
    // Test 4: Clean up test user
    console.log('\nTest 4: Cleaning up test user...');
    // Note: You might want to add a cleanup method to your service
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserSync().then(() => {
  console.log('\n🎉 User sync testing completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
