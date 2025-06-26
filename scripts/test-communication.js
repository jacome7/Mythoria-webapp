#!/usr/bin/env node

/**
 * Communication Test Script
 * 
 * A Node.js script to test communication between Mythoria services.
 * Run this from the mythoria-webapp directory.
 */

import fetch from 'node-fetch';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`)
};

// Default service URLs
const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:3000';
const STORY_URL = process.env.STORY_GENERATION_WORKFLOW_URL || 'http://localhost:8080';
const NOTIFICATION_URL = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:8081';

async function testService(url, serviceName) {
  log.test(`Testing ${serviceName} at ${url}`);
  
  try {
    const response = await fetch(`${url}/ping`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      log.success(`${serviceName}: ${data.message} (${data.responseTime || 0}ms)`);
      return true;
    } else {
      log.error(`${serviceName}: HTTP ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    log.error(`${serviceName}: ${error.message}`);
    return false;
  }
}

async function testCommunication() {
  log.info('Testing communication via webapp endpoint...');
  
  try {
    const response = await fetch(`${WEBAPP_URL}/api/health/communication`, {
      method: 'GET',
      timeout: 30000 // 30 seconds for full test
    });
    
    if (response.ok) {
      const results = await response.json();
      
      console.log('\n' + colors.bright + 'Communication Test Results:' + colors.reset);
      console.log('═'.repeat(50));
      
      // Story Generation Service
      console.log(`\n${colors.magenta}📖 Story Generation Workflow:${colors.reset}`);
      const storyDirect = results.services.storyGeneration.direct;
      const storyPubSub = results.services.storyGeneration.pubsub;
      
      console.log(`  Direct:  ${storyDirect.success ? colors.green + '✅' : colors.red + '❌'} ${storyDirect.responseTime}ms${colors.reset}`);
      console.log(`  Pub/Sub: ${storyPubSub.success ? colors.green + '✅' : colors.red + '❌'} ${storyPubSub.responseTime}ms${colors.reset}`);
      
      // Notification Engine
      console.log(`\n${colors.magenta}🔔 Notification Engine:${colors.reset}`);
      const notificationDirect = results.services.notification.direct;
      const notificationPubSub = results.services.notification.pubsub;
      
      console.log(`  Direct:  ${notificationDirect.success ? colors.green + '✅' : colors.red + '❌'} ${notificationDirect.responseTime}ms${colors.reset}`);
      console.log(`  Pub/Sub: ${notificationPubSub.success ? colors.green + '✅' : colors.red + '❌'} ${notificationPubSub.responseTime}ms${colors.reset}`);
      
      // Summary
      console.log(`\n${colors.bright}Summary:${colors.reset}`);
      console.log(`  Total Tests: ${results.summary.totalTests}`);
      console.log(`  Passed: ${colors.green}${results.summary.passedTests}${colors.reset}`);
      console.log(`  Failed: ${colors.red}${results.summary.failedTests}${colors.reset}`);
      console.log(`  Overall: ${results.summary.overallSuccess ? colors.green + 'SUCCESS' : colors.red + 'FAILURE'}${colors.reset}`);
      
      return results.summary.overallSuccess;
    } else {
      log.error(`Communication test endpoint failed: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    log.error(`Communication test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(colors.bright + colors.cyan + '🧪 Mythoria Communication Test' + colors.reset);
  console.log('═'.repeat(40));
  
  // Test individual services first
  log.info('Testing individual services...');
  
  const storyOk = await testService(STORY_URL, 'Story Generation Workflow');
  const notificationOk = await testService(NOTIFICATION_URL, 'Notification Engine');
  
  if (!storyOk || !notificationOk) {
    log.warning('Some services are not responding. Check if they are running.');
    console.log('\nTo start the services:');
    console.log(`  Story Generation: cd story-generation-workflow && npm run dev`);
    console.log(`  Notification Engine: cd notification-engine && npm run dev`);
  }
  
  console.log('\n' + '─'.repeat(40));
  
  // Test full communication
  const communicationOk = await testCommunication();
  
  console.log('\n' + '═'.repeat(40));
  
  if (communicationOk) {
    log.success('All communication tests passed! 🎉');
    process.exit(0);
  } else {
    log.error('Some communication tests failed. Check the details above.');
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  log.error(`Test script failed: ${error.message}`);
  process.exit(1);
});
