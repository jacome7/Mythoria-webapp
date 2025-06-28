# Communication Testing System

## Overview
This document describes the comprehensive communication testing system implemented to verify connectivity between the three main services in the Mythoria platform:

1. **mythoria-webapp** (Main web application)
2. **story-generation-workflow** (Story generation service)
3. **notification-engine** (Notification service)

## Architecture

```
mythoria-webapp
     ↓ (HTTP/REST API calls)
     ├── story-generation-workflow (Direct + Pub/Sub)
     └── notification-engine (Direct + Pub/Sub)
```

## Testing Endpoints

### Main Test Endpoint (mythoria-webapp)

**Endpoint**: `GET /api/health/communication`

This endpoint performs comprehensive communication tests with both external services.

**Response Format**:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "storyGeneration": {
      "direct": {
        "success": true,
        "responseTime": 125,
        "data": {...}
      },
      "pubsub": {
        "success": true,
        "responseTime": 340,
        "data": {...}
      }
    },
    "notification": {
      "direct": {
        "success": true,
        "responseTime": 89,
        "data": {...}
      },
      "pubsub": {
        "success": true,
        "responseTime": 210,
        "data": {...}
      }
    }
  },
  "summary": {
    "totalTests": 4,
    "passedTests": 4,
    "failedTests": 0,
    "overallSuccess": true
  }
}
```

## Service-Specific Ping Endpoints

### Story Generation Workflow Service

#### Direct Communication Test
- **Endpoint**: `GET /ping`
- **Purpose**: Basic health check and response time test
- **Response**: Service status, timestamp, version info

#### Pub/Sub Test (Outbound)
- **Endpoint**: `POST /ping/pubsub-test`
- **Purpose**: Test publishing messages to Pub/Sub
- **Action**: Publishes a test message to `story-generation-ping` topic

#### Pub/Sub Test (Inbound)
- **Endpoint**: `POST /test/pubsub-ping`
- **Purpose**: Test receiving and processing Pub/Sub-style messages
- **Action**: Echoes back received message with processing details

### Notification Engine Service

#### Direct Communication Test
- **Endpoint**: `GET /ping`
- **Purpose**: Basic health check and response time test
- **Response**: Service status, timestamp, version info

#### Pub/Sub Test (Outbound)
- **Endpoint**: `POST /ping/pubsub-test`
- **Purpose**: Test publishing messages to Pub/Sub
- **Action**: Publishes a test message to `notification-ping` topic

#### Pub/Sub Test (Inbound)
- **Endpoint**: `POST /test/pubsub-ping`
- **Purpose**: Test receiving and processing Pub/Sub-style messages
- **Action**: Echoes back received message with processing details

## How to Run Tests

### 1. Manual Testing via HTTP

**Test all services:**
```bash
curl http://localhost:3000/api/health/communication
```

**Test individual services:**
```bash
# Story Generation Workflow - Direct
curl http://localhost:8080/ping

# Story Generation Workflow - Pub/Sub
curl -X POST http://localhost:8080/test/pubsub-ping \
  -H "Content-Type: application/json" \
  -d '{"type": "ping", "correlationId": "manual-test-123"}'

# Notification Engine - Direct  
curl http://localhost:8081/ping

# Notification Engine - Pub/Sub
curl -X POST http://localhost:8081/test/pubsub-ping \
  -H "Content-Type: application/json" \
  -d '{"type": "ping", "correlationId": "manual-test-456"}'
```

### 2. Browser Testing

Navigate to: `http://localhost:3000/api/health/communication`

The browser will display the JSON response showing the test results for all services.

### 3. Programmatic Testing

```javascript
async function testCommunication() {
  try {
    const response = await fetch('/api/health/communication');
    const results = await response.json();
    
    console.log('Communication Test Results:', results);
    
    if (results.summary.overallSuccess) {
      console.log('✅ All services are communicating successfully');
    } else {
      console.log(`⚠️  ${results.summary.failedTests} out of ${results.summary.totalTests} tests failed`);
    }
  } catch (error) {
    console.error('❌ Communication test failed:', error);
  }
}
```

## Test Types Explained

### Direct Communication Tests
- **Purpose**: Verify basic HTTP connectivity between services
- **Method**: Simple GET request to `/ping` endpoint
- **Measures**: Response time, service availability, basic health status
- **Timeout**: 10 seconds

### Pub/Sub Communication Tests
- **Purpose**: Verify message processing capabilities (simulated Pub/Sub)
- **Method**: POST request with test message payload
- **Measures**: Message processing time, payload handling, correlation tracking
- **Timeout**: 15 seconds

## Error Handling

### Common Error Scenarios

1. **Service Unavailable**: HTTP connection timeout or connection refused
2. **Service Unhealthy**: Service responds but indicates unhealthy status
3. **Slow Response**: Service responds but exceeds reasonable response time thresholds
4. **Invalid Response**: Service responds with malformed or unexpected data

### Error Response Format

```json
{
  "success": false,
  "responseTime": 10001,
  "error": "Request timeout after 10000ms"
}
```

## Monitoring and Alerts

### Response Time Thresholds
- **Direct Communication**: < 1000ms (good), < 3000ms (warning), > 3000ms (poor)
- **Pub/Sub Communication**: < 2000ms (good), < 5000ms (warning), > 5000ms (poor)

### Health Status Indicators
- **Green**: All tests passing with good response times
- **Yellow**: All tests passing but some with warning response times
- **Red**: One or more tests failing

## Configuration

### Environment Variables
The communication test uses the centralized configuration from `config/environment.js`:

- `STORY_GENERATION_WORKFLOW_URL`: Story service endpoint (default: http://localhost:8080)
- `NOTIFICATION_ENGINE_URL`: Notification service endpoint (default: http://localhost:8081)

### Timeout Configuration
Timeouts are configured in the communication test endpoint:
- Direct communication: 10 seconds
- Pub/Sub communication: 15 seconds

## Troubleshooting

### Test Failures

1. **Check Service Status**: Ensure all services are running on their expected ports
2. **Verify Network Connectivity**: Test basic connectivity with curl or ping
3. **Check Service Logs**: Look for errors in service-specific logs
4. **Validate Configuration**: Ensure URLs in environment configuration are correct

### Common Issues

1. **Port Conflicts**: Services not running on expected ports
2. **Firewall Blocking**: Network policies blocking HTTP traffic
3. **Service Startup Issues**: Services failing to start due to missing dependencies
4. **Configuration Mismatch**: URLs in webapp config not matching actual service locations

## Future Enhancements

1. **Real Pub/Sub Integration**: Replace simulated Pub/Sub tests with actual Google Cloud Pub/Sub
2. **Performance Benchmarking**: Add response time percentiles and historical tracking
3. **Automated Monitoring**: Integration with monitoring systems for continuous health checking
4. **Circuit Breaker Pattern**: Implement circuit breakers for improved resilience
5. **Load Testing**: Add endpoints for testing service behavior under load
