# Localized Manifest System

This document describes the implementation of the localized manifest system for the Mythoria web application.

## Overview

The manifest system has been converted from a static `manifest.json` file to a dynamic, locale-aware system that serves different manifest content based on the user's language preference.

## Features

- **Dynamic Manifest Generation**: Manifests are generated on-demand based on the requested locale
- **Fallback Support**: If a locale is not found, the system falls back to the default locale (en-US)
- **Translation Integration**: Manifest content is sourced from the existing translation files
- **PWA Compatibility**: Maintains full PWA functionality with caching optimizations
- **SEO Optimization**: Each locale gets its own manifest with proper localization

## Architecture

### Files Created/Modified

1. **`/src/app/api/manifest/route.ts`** - API endpoint for dynamic manifest generation
2. **`/src/lib/manifest.ts`** - Utility functions for manifest generation
3. **`/src/messages/*/Metadata.json`** - Added manifest translations
4. **`/src/app/[locale]/layout.tsx`** - Updated to use dynamic manifest
5. **`/next.config.ts`** - Updated PWA configuration

### How It Works

1. **Request**: Browser or PWA requests manifest at `/api/manifest?locale=<locale>`
2. **Validation**: The system validates the locale against supported locales
3. **Translation Loading**: Loads the appropriate translation file from `/src/messages/<locale>/Metadata.json`
4. **Generation**: Combines base manifest structure with localized content
5. **Response**: Returns the localized manifest as JSON with proper headers

## Translation Structure

The manifest translations are stored in the `Metadata.json` files:

```json
{
  "Metadata": {
    "manifest": {
      "name": "Mythoria - Personalized Books Creator",
      "short_name": "Mythoria",
      "description": "Create unique, fully illustrated books",
      "shortcuts": {
        "createStory": {
          "name": "Create Story",
          "short_name": "Create",
          "description": "Start creating a new story"
        }
      }
    }
  }
}
```

## API Endpoints

### GET `/api/manifest`

**Parameters:**

- `locale` (optional): The locale code (e.g., 'en-US', 'pt-PT')

**Response:**

- Content-Type: `application/manifest+json`
- Cache-Control: `public, max-age=3600`

**Example:**

```
GET /api/manifest?locale=pt-PT
```

## Supported Locales

- `en-US` (English - United States) - Default
- `pt-PT` (Portuguese - Portugal)

## Caching Strategy

- **Client-side**: 1 hour cache for manifest responses
- **Service Worker**: StaleWhileRevalidate strategy for manifest API
- **Fallback**: Graceful degradation to default manifest if generation fails

## Usage Examples

### In Layout Components

```tsx
import { getManifestUrl } from '@/lib/manifest';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return {
    manifest: getManifestUrl(params.locale),
    // ... other metadata
  };
}
```

### Manual Generation

```typescript
import { generateManifest } from '@/lib/manifest';

const manifest = await generateManifest('pt-PT');
```

## Development

### Testing

Run the test script to verify manifest generation:

```bash
node scripts/test-manifest.js
```

### Adding New Locales

1. Add the locale to `/src/i18n/routing.ts`
2. Create translation files in `/src/messages/<locale>/`
3. Add manifest translations to `Metadata.json`
4. Test the new locale

### Debugging

- Check browser DevTools Network tab for manifest requests
- Verify PWA installation with different locales
- Use Chrome DevTools Application tab to inspect manifest

## Performance Considerations

- Manifests are cached for 1 hour to balance freshness and performance
- Translation files are loaded on-demand
- Fallback mechanism prevents broken PWA installation
- Service worker caches manifest responses

## Security

- Locale validation prevents path traversal
- JSON parsing includes error handling
- Fallback manifest prevents exposure of sensitive information

## Future Enhancements

- Pre-generate manifests at build time for better performance
- Add manifest validation
- Support for dynamic icon generation based on locale
- Enhanced error tracking and monitoring
