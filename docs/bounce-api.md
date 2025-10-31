# Bounce API Documentation

## Overview

The Bounce API allows external systems (such as Google Apps Script) to report email bounce events for marketing leads. When a bounce is detected, the API updates the lead's email status to either `hard_bounce` or `soft_bounce`.

## Endpoint

```
POST /api/deliverability/bounce
```

## Authentication

The API uses Bearer token authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <LEAD_BOUNCE_API_SECRET>
```

The token value is stored in the `LEAD_BOUNCE_API_SECRET` environment variable.

## Request Format

### Headers

- `Content-Type: application/json`
- `Authorization: Bearer <token>`

### Body Parameters

| Parameter | Type                 | Required     | Description                           |
| --------- | -------------------- | ------------ | ------------------------------------- |
| `lead_id` | string (UUID)        | Optional\*   | The unique identifier of the lead     |
| `email`   | string               | Optional\*   | The email address of the lead         |
| `type`    | `"hard"` \| `"soft"` | **Required** | Type of bounce                        |
| `reason`  | string               | Optional     | Human-readable bounce reason from DSN |

\* **Note**: Either `lead_id` OR `email` must be provided (not both required, but at least one).

### Bounce Types

- **`hard`**: Permanent delivery failure (e.g., mailbox doesn't exist, domain invalid)
- **`soft`**: Temporary delivery failure (e.g., mailbox full, server temporarily unavailable)

## Response Format

### Success (200 OK)

```json
{
  "success": true,
  "lead_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "status": "hard_bounce",
  "message": "Bounce recorded successfully"
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "error": "Invalid bounce type. Must be \"hard\" or \"soft\""
}
```

#### 401 Unauthorized

```json
{
  "error": "Invalid API token"
}
```

#### 404 Not Found

```json
{
  "error": "Lead not found",
  "details": "No lead found with ID: 123e4567-e89b-12d3-a456-426614174000"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Error details"
}
```

## Usage Examples

### cURL

```bash
curl -X POST https://mythoria.pt/api/deliverability/bounce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET_HERE" \
  -d '{
    "lead_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "hard",
    "reason": "550 5.1.1 Mailbox does not exist"
  }'
```

### Google Apps Script

```javascript
/**
 * Report a bounce to Mythoria API
 */
function reportBounce(leadId, email, bounceType, reason) {
  const API_SECRET = PropertiesService.getScriptProperties().getProperty(
    'MYTHORIA_BOUNCE_API_SECRET',
  );
  const API_URL = 'https://mythoria.pt/api/deliverability/bounce';

  const payload = {
    type: bounceType, // 'hard' or 'soft'
  };

  // Include lead_id if available, otherwise use email
  if (leadId) {
    payload.lead_id = leadId;
  } else if (email) {
    payload.email = email;
  } else {
    throw new Error('Either leadId or email must be provided');
  }

  if (reason) {
    payload.reason = reason;
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + API_SECRET,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const statusCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    if (statusCode === 200) {
      Logger.log('Bounce reported successfully: ' + responseBody.lead_id);
      return responseBody;
    } else {
      Logger.log('Failed to report bounce: ' + statusCode + ' - ' + responseBody.error);
      return null;
    }
  } catch (error) {
    Logger.log('Error reporting bounce: ' + error.toString());
    return null;
  }
}

/**
 * Example: Process bounce notification from Gmail
 */
function processBounceEmail() {
  const threads = GmailApp.search('subject:"Mail Delivery Subsystem" is:unread');

  threads.forEach(function (thread) {
    const messages = thread.getMessages();

    messages.forEach(function (message) {
      // Parse the bounce message
      const body = message.getPlainBody();
      const subject = message.getSubject();

      // Extract email address (simplified example)
      const emailMatch = body.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      if (!emailMatch) return;

      const bouncedEmail = emailMatch[1];

      // Determine bounce type (simplified heuristic)
      const bounceType =
        body.includes('Mailbox does not exist') ||
        body.includes('User unknown') ||
        body.includes('Invalid recipient')
          ? 'hard'
          : 'soft';

      // Extract reason
      const reasonMatch = body.match(/550 [^\n]+|551 [^\n]+|552 [^\n]+|553 [^\n]+/);
      const reason = reasonMatch ? reasonMatch[0] : 'Email delivery failed';

      // Report to Mythoria
      reportBounce(null, bouncedEmail, bounceType, reason);

      // Mark as read
      message.markRead();
    });
  });
}
```

### JavaScript/TypeScript (Node.js/Browser)

```typescript
interface BouncePayload {
  lead_id?: string;
  email?: string;
  type: 'hard' | 'soft';
  reason?: string;
}

async function reportBounce(payload: BouncePayload): Promise<boolean> {
  const API_SECRET = process.env.LEAD_BOUNCE_API_SECRET;
  const API_URL = 'https://mythoria.pt/api/deliverability/bounce';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Bounce reported:', data);
      return true;
    } else {
      console.error('Failed to report bounce:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error reporting bounce:', error);
    return false;
  }
}

// Usage
reportBounce({
  email: 'bounced@example.com',
  type: 'hard',
  reason: '550 5.1.1 Mailbox does not exist',
});
```

## Setting Up Google Apps Script Automation

### Step 1: Create Script Properties

1. Open your Google Apps Script project
2. Go to **Project Settings** (gear icon)
3. Click **Add script property**
4. Add property: `MYTHORIA_BOUNCE_API_SECRET` with your API token value

### Step 2: Create Trigger

1. In Apps Script editor, click **Triggers** (clock icon)
2. Click **Add Trigger**
3. Configure:
   - Function: `processBounceEmail`
   - Event source: **Time-driven**
   - Type: **Minutes timer**
   - Interval: **Every 5 minutes** (or your preference)

### Step 3: Grant Permissions

1. Run the script manually first
2. Grant necessary Gmail permissions when prompted
3. Verify it works by checking logs

## Testing the API

### Get API Documentation

```bash
curl https://mythoria.pt/api/deliverability/bounce
```

Returns interactive API documentation with examples.

### Test with Sample Data

```bash
# Test with lead_id
curl -X POST http://localhost:3000/api/deliverability/bounce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-test-token" \
  -d '{
    "lead_id": "existing-lead-uuid",
    "type": "soft",
    "reason": "Mailbox full"
  }'

# Test with email
curl -X POST http://localhost:3000/api/deliverability/bounce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-test-token" \
  -d '{
    "email": "test@example.com",
    "type": "hard",
    "reason": "User unknown"
  }'
```

## Environment Configuration

Add to your `.env.local` (development) and deployment environment:

```env
# Bounce API Authentication
LEAD_BOUNCE_API_SECRET=your-secure-random-token-here
```

**Generate a secure token:**

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Security Considerations

1. **Keep the API secret secure** - Store it in environment variables, never in code
2. **Use HTTPS** - Always use HTTPS in production to protect the token
3. **Rotate tokens periodically** - Change the API secret regularly
4. **Monitor for abuse** - Check logs for unauthorized access attempts
5. **Rate limiting** - Consider implementing rate limiting if needed

## Troubleshooting

### "Invalid API token" Error

- Verify the `LEAD_BOUNCE_API_SECRET` is set in environment variables
- Check that the token in your request matches exactly (no extra spaces)
- Ensure you're using `Bearer ` prefix (with space after)

### "Lead not found" Error

- Verify the lead exists in the database
- Check that the `lead_id` is a valid UUID v4
- If using email, ensure it matches the normalized email in the database (lowercase)

### 500 Internal Server Error

- Check server logs for detailed error messages
- Verify database connectivity
- Ensure all required environment variables are set

## Related Documentation

- [Email Marketing Campaign Specification](../docs/email-marketing-spec.md)
- [Lead Database Schema](../docs/database.md#leads-table)
- [API Rate Limiting](../docs/api-rate-limiting.md)

---

**Last Updated**: 2025-10-30
