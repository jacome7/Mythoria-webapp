# Google Analytics Integration

This project includes Google Analytics 4 (GA4) integration for tracking user interactions and page views.

## Configuration

### Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-86D0QFW197
```

### Automatic Tracking

The integration automatically tracks:
- Page views on route changes
- Client-side navigation
- Single Page Application (SPA) behavior

## Manual Event Tracking

You can track custom events using the provided utility functions:

```tsx
import { trackEvent } from '../components/GoogleAnalytics';

// Track a button click
const handleButtonClick = () => {
  trackEvent('button_click', {
    button_name: 'pricing_signup',
    section: 'hero'
  });
};

// Track form submission
const handleFormSubmit = () => {
  trackEvent('form_submit', {
    form_name: 'contact_form',
    form_location: 'footer'
  });
};
```

## Common Events to Track

Here are some common events you might want to track in your application:

```tsx
// User authentication
trackEvent('login', { method: 'clerk' });
trackEvent('sign_up', { method: 'clerk' });

// Content interaction
trackEvent('story_created', { category: 'content' });
trackEvent('character_created', { category: 'content' });

// E-commerce (if applicable)
trackEvent('purchase', {
  transaction_id: 'txn_123',
  value: 29.99,
  currency: 'USD',
  items: [...]
});

// Search
trackEvent('search', {
  search_term: 'fantasy story'
});
```

## Privacy Considerations

- Google Analytics only loads on the client side
- The tracking respects user consent preferences
- No personally identifiable information (PII) should be sent to GA4
- Consider implementing cookie consent if required by your jurisdiction

## Testing

In development, you can verify GA4 is working by:
1. Opening browser developer tools
2. Going to the Network tab
3. Looking for requests to `googletagmanager.com`
4. Using the GA4 DebugView in your Google Analytics dashboard

## Production Setup

1. Replace the measurement ID in your production environment variables
2. Verify the tracking is working in your GA4 property
3. Set up conversion goals and audiences as needed
