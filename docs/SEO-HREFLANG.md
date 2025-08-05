# SEO and Hreflang Implementation

## Overview
This implementation provides comprehensive SEO support with proper hreflang attributes for your multilingual Next.js application using next-intl.

## Features Implemented

### 1. Dynamic HTML Lang Attribute ✅
- **Component**: `LanguageAttribute.tsx` (already existed)
- **Purpose**: Sets the HTML `lang` attribute based on the current locale
- **Usage**: Automatically included in the locale layout

### 2. Hreflang Links in Metadata ✅
- **Location**: `app/[locale]/layout.tsx`
- **Purpose**: Tells search engines about language versions of pages
- **Generates**: `<link rel="alternate" hreflang="..." href="..." />`
- **Supports**: All three locales (en-US, pt-PT, es-ES)

### 3. Dynamic Hreflang Utilities ✅
- **File**: `lib/hreflang.ts`
- **Functions**:
  - `generateServerHreflangLinks()` - For server components
  - `useHreflangLinks()` - For client components
  - `generateHreflangLinks()` - Core utility
  - `formatHreflangCode()` - Format locale codes

### 4. Custom Hreflang Component ✅
- **Component**: `HreflangLinks.tsx`
- **Purpose**: For pages needing custom hreflang handling
- **Use cases**: Dynamic story pages, custom routes

## How It Works

### Automatic Hreflang Generation
The layout automatically generates hreflang links for:
- Homepage: `https://mythoria.pt/en-US/`, `https://mythoria.pt/pt-PT/`, `https://mythoria.pt/es-ES/`
- Any page: `https://mythoria.pt/en-US/page`, `https://mythoria.pt/pt-PT/page`, `https://mythoria.pt/es-ES/page`

### HTML Output Example
```html
<html lang="en-US">
<head>
  <link rel="alternate" hreflang="en-us" href="https://mythoria.pt/en-US/" />
  <link rel="alternate" hreflang="pt-pt" href="https://mythoria.pt/pt-PT/" />
  <link rel="alternate" hreflang="es-es" href="https://mythoria.pt/es-ES/" />
  <link rel="canonical" href="https://mythoria.pt/en-US/" />
</head>
<!-- ... -->
</html>
```

## Usage Examples

### For Regular Pages
No additional setup needed - hreflang is automatically handled by the layout.

### For Dynamic Pages (Stories, Custom Routes)
If you need custom hreflang handling:

```tsx
import HreflangLinks from '@/components/HreflangLinks';

export default function StoryPage({ params }) {
  return (
    <>
      <HreflangLinks 
        customPath={`/stories/${params.storyId}`} 
      />
      {/* Your page content */}
    </>
  );
}
```

### For Custom Metadata in Page Components
```tsx
import { generateServerHreflangLinks } from '@/lib/hreflang';

export async function generateMetadata({ params }) {
  const hreflangLinks = await generateServerHreflangLinks(params.locale);
  
  return {
    title: 'Custom Page Title',
    alternates: {
      canonical: `https://mythoria.pt/${params.locale}/custom-page`,
      languages: hreflangLinks
    }
  };
}
```

## SEO Benefits

1. **Search Engine Understanding**: Search engines now understand your site has multiple language versions
2. **Reduced Duplicate Content**: Proper hreflang prevents duplicate content penalties
3. **Better User Experience**: Users get served the correct language version in search results
4. **Improved Rankings**: Each language version can rank independently in local search results

## Validation

To test your implementation:

1. **View Source**: Check for proper `<link rel="alternate" hreflang="..." />` tags
2. **Google Search Console**: Use the hreflang testing tool
3. **SEO Tools**: Use tools like Screaming Frog or Ahrefs to validate hreflang
4. **Browser Dev Tools**: Inspect the HTML head section

## Supported Locales
- `en-US` (English - United States)
- `pt-PT` (Portuguese - Portugal)  
- `es-ES` (Spanish - Spain)

## Domain
All hreflang links point to: `https://mythoria.pt`

## Best Practices Followed
- ✅ Consistent URL structure across locales
- ✅ Self-referencing hreflang tags
- ✅ Proper locale code format (en-us, pt-pt, es-es)
- ✅ Canonical URLs for each language version
- ✅ Server-side rendering support
- ✅ Dynamic path handling for all pages
