import { NextRequest, NextResponse } from 'next/server';
import { getEnvironmentConfig } from '../../../../../config/environment.js';

const config = getEnvironmentConfig();

interface ServiceTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  data?: unknown;
}

interface CommunicationTestResults {
  timestamp: string;
  configuration: {
    storyGeneration: {
      baseUrl: string;
      endpoints: {
        ping: string;
        pubsubPing: string;
      };
    };
    notification: {
      baseUrl: string;
      endpoints: {
        ping: string;
        pubsubPing: string;
      };
    };
  };
  services: {
    storyGeneration: {
      direct: ServiceTestResult;
      pubsub: ServiceTestResult;
    };
    notification: {
      direct: ServiceTestResult;
      pubsub: ServiceTestResult;
    };
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallSuccess: boolean;
  };
}

async function testDirectCommunication(serviceUrl: string, endpoint: string): Promise<ServiceTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${serviceUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      responseTime,
      data
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testPingEndpoint(serviceUrl: string): Promise<ServiceTestResult> {
  return testDirectCommunication(serviceUrl, '/ping');
}

async function testPubSubCommunication(serviceUrl: string, endpoint: string): Promise<ServiceTestResult> {
  const startTime = Date.now();
  
  try {
    const testMessage = {
      type: 'ping',
      timestamp: new Date().toISOString(),
      correlationId: `webapp-test-${Date.now()}`
    };

    const response = await fetch(`${serviceUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
      signal: AbortSignal.timeout(15000) // 15 second timeout for pub/sub
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      responseTime,
      data
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET() {
  console.log('🔍 Starting communication test between services...');
  
  // Initialize results with configuration URLs and endpoint information
  const results: CommunicationTestResults = {
    timestamp: new Date().toISOString(),
    configuration: {
      storyGeneration: {
        baseUrl: config.storyGeneration.workflowUrl,
        endpoints: {
          ping: '/ping',
          pubsubPing: '/test/pubsub-ping'
        }
      },
      notification: {
        baseUrl: config.notification.engineUrl,
        endpoints: {
          ping: '/ping',
          pubsubPing: '/test/pubsub-ping'
        }
      }
    },
    services: {
      storyGeneration: {
        direct: { success: false, responseTime: 0 },
        pubsub: { success: false, responseTime: 0 }
      },
      notification: {
        direct: { success: false, responseTime: 0 },
        pubsub: { success: false, responseTime: 0 }
      }
    },
    summary: {
      totalTests: 4,
      passedTests: 0,
      failedTests: 0,
      overallSuccess: false
    }
  };

  try {
    // Test Story Generation Workflow Service
    console.log('📖 Testing Story Generation Workflow Service...');
    
    // Direct communication test
    console.log('  - Testing direct communication (ping)...');
    results.services.storyGeneration.direct = await testPingEndpoint(config.storyGeneration.workflowUrl);
    
    // Pub/Sub communication test
    console.log('  - Testing pub/sub communication...');
    results.services.storyGeneration.pubsub = await testPubSubCommunication(
      config.storyGeneration.workflowUrl, 
      '/test/pubsub-ping'
    );

    // Test Notification Engine Service
    console.log('🔔 Testing Notification Engine Service...');
    
    // Direct communication test
    console.log('  - Testing direct communication (ping)...');
    results.services.notification.direct = await testPingEndpoint(config.notification.engineUrl);
    
    // Pub/Sub communication test  
    console.log('  - Testing pub/sub communication...');
    results.services.notification.pubsub = await testPubSubCommunication(
      config.notification.engineUrl,
      '/test/pubsub-ping'
    );

    // Calculate summary
    const allTests = [
      results.services.storyGeneration.direct,
      results.services.storyGeneration.pubsub,
      results.services.notification.direct,
      results.services.notification.pubsub
    ];

    results.summary.passedTests = allTests.filter(test => test.success).length;
    results.summary.failedTests = allTests.filter(test => !test.success).length;
    results.summary.overallSuccess = results.summary.passedTests === results.summary.totalTests;

    console.log(`✅ Communication test completed: ${results.summary.passedTests}/${results.summary.totalTests} tests passed`);

    return NextResponse.json(results, { 
      status: results.summary.overallSuccess ? 200 : 207 // 207 = Multi-Status for partial success
    });

  } catch (error) {
    console.error('❌ Communication test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Communication test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow testing specific services or with custom parameters
  try {
    const body = await request.json();
    const { services = ['storyGeneration', 'notification'] } = body;

    console.log(`🔍 Starting selective communication test for: ${services.join(', ')}...`);

    // Similar implementation but only test specified services
    // This allows for more targeted testing
    
    return NextResponse.json({
      message: 'Selective testing not yet implemented',
      requestedServices: services
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse request body',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
