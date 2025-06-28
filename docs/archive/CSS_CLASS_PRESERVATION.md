# CSS Class Preservation in Story Editing

## Overview

When editing stories in Mythoria, it's crucial to maintain the CSS class names that define the visual styling. The styling templates are located in `/public/templates/` and define specific class names that must be preserved during editing operations.

**✅ IMPLEMENTATION STATUS: COMPLETE**
- ✅ Client-side preservation in BookEditor
- ✅ Server-side preservation in API endpoint
- ✅ Cross-platform compatibility (browser & Node.js)
- ✅ Comprehensive validation and logging

## Mythoria CSS Classes

The following CSS classes are automatically applied to stories and must be preserved:

### Story Structure
- `mythoria-story-title` - Main story title (H1)
- `mythoria-author-name` - Author name display
- `mythoria-dedicatory` - Dedication message

### Chapter Structure
- `mythoria-chapter` - Chapter container div
- `mythoria-chapter-title` - Chapter heading (H2)
- `mythoria-chapter-content` - Chapter content container
- `mythoria-chapter-paragraph` - Individual paragraphs

### Images
- `mythoria-chapter-image` - Image container in chapters
- `mythoria-chapter-img` - Chapter illustration images
- `mythoria-cover-image` - Book cover images
- `mythoria-front-cover` - Front cover container
- `mythoria-back-cover` - Back cover container

### Table of Contents
- `mythoria-table-of-contents` - TOC container
- `mythoria-toc-title` - TOC heading
- `mythoria-toc-list` - TOC list container
- `mythoria-toc-item` - Individual TOC items
- `mythoria-toc-link` - TOC links

### Layout & Design
- `mythoria-page-break` - Page break elements
- `mythoria-message` - Mythoria branding message
- `mythoria-message-text` - Message text
- `mythoria-author-emphasis` - Emphasized author text
- `mythoria-logo` - Mythoria logo
- `mythoria-credits` - Credits section
- `mythoria-credits-text` - Credits text

## How Class Preservation Works

### 1. BookEditor Component

The `BookEditor` component (`/src/components/BookEditor.tsx`) automatically preserves Mythoria CSS classes:

- **On Save**: Classes are preserved before sending content to the server
- **On View Toggle**: Classes are maintained when switching between visual and HTML editing
- **On Find/Replace**: Classes are preserved after text replacements

### 2. Utility Functions

The preservation system uses utility functions in `/src/utils/mythoriaClassPreserver.ts`:

```typescript
import { preserveMythoriaClasses } from '@/utils/mythoriaClassPreserver';

// Preserve classes in HTML content
const preservedHtml = preserveMythoriaClasses(rawHtml);
```

### 3. Server-Side Implementation

The `/api/books/[id]/save` endpoint enforces class preservation on the backend:

```typescript
import { preserveMythoriaClasses, validateMythoriaClasses } from "@/utils/mythoriaClassPreserver";

// Preserve Mythoria CSS classes to maintain styling
const preservedHtml = preserveMythoriaClasses(html);

// Validate class preservation and log warnings if needed
const validation = validateMythoriaClasses(preservedHtml);
if (!validation.isValid) {
  console.warn(`Story ${storyId}: Missing expected CSS classes:`, validation.missingElements);
}

// Save the preserved HTML
await uploadToGCS(filename, preservedHtml);
```

**Key Features:**
- **Cross-platform compatibility**: Works in both browser (DOM) and server (jsdom) environments
- **Automatic validation**: Logs warnings for missing required classes
- **Guaranteed preservation**: Classes are preserved even if client bypasses UI validation
- **Performance optimized**: Uses efficient DOM manipulation with proper cleanup

### 4. Utility Functions

The preservation system uses utility functions in `/src/utils/mythoriaClassPreserver.ts`:

```typescript
import { preserveMythoriaClasses } from '@/utils/mythoriaClassPreserver';

// Preserve classes in HTML content
const preservedHtml = preserveMythoriaClasses(rawHtml);
```

### 5. Automatic Structure Detection

The system automatically detects and preserves common story structures:

- **Story Title**: First H1 element gets `mythoria-story-title`
- **Chapter Titles**: H2 elements containing "chapter" get `mythoria-chapter-title`
- **Chapter Containers**: Divs containing chapter titles get `mythoria-chapter`
- **Paragraphs**: P elements in chapters get `mythoria-chapter-paragraph`

## Best Practices for Developers

### 1. Always Preserve Classes When Editing

```typescript
// ✅ Good - Preserve classes before saving
const handleSave = async (html: string) => {
  const preservedHtml = preserveMythoriaClasses(html);
  await saveStory(preservedHtml);
};

// ❌ Bad - Save without preserving classes
const handleSave = async (html: string) => {
  await saveStory(html); // Classes may be lost
};
```

### 2. Validate Class Preservation

```typescript
import { validateMythoriaClasses } from '@/utils/mythoriaClassPreserver';

const validation = validateMythoriaClasses(html);
if (!validation.isValid) {
  console.warn('Missing required classes:', validation.missingElements);
}
```

### 3. Configure TipTap Editor Properly

```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      paragraph: {
        HTMLAttributes: {
          class: 'mythoria-chapter-paragraph',
        },
      },
    }),
  ],
  editorProps: {
    transformPastedHTML: (html) => preserveMythoriaClasses(html),
  },
});
```

## User Experience

### Visual Feedback

The editor provides clear feedback to users:

1. **Information Banner**: Shows that CSS styling will be preserved
2. **Success Message**: Confirms when styling is preserved after saving
3. **View Toggle**: Allows switching between visual and HTML editing modes

### Editing Modes

1. **Visual Mode**: WYSIWYG editing with automatic class preservation
2. **HTML Mode**: Direct HTML editing with class preservation on save

## Template Files

CSS templates are located in `/public/templates/`:

- `all_ages.css` - Universal styling
- `children_0-2.css` - Toddler-specific styling
- `children_3-6.css` - Preschooler styling
- `children_7-10.css` - Elementary styling
- `children_11-14.css` - Middle grade styling
- `young_adult_15-17.css` - Teen styling
- `adult_18+.css` - Adult styling

## Troubleshooting

### Classes Being Stripped

If classes are being removed during editing:

1. Check that `preserveMythoriaClasses()` is called before saving
2. Verify TipTap editor configuration includes `transformPastedHTML`
3. Ensure the utility functions are imported correctly

### Styling Not Appearing

If styling doesn't appear in the rendered story:

1. Verify the correct template CSS file is loaded
2. Check that HTML elements have the required classes
3. Use the validation utility to check for missing classes

### Editor Configuration Issues

If the editor strips classes during editing:

1. Configure TipTap extensions with default class names
2. Use `preserveMythoriaClasses` in the `transformPastedHTML` prop
3. Ensure `onUpdate` callback preserves classes

## Testing

To test class preservation:

```typescript
import { 
  preserveMythoriaClasses, 
  validateMythoriaClasses,
  stripMythoriaClasses 
} from '@/utils/mythoriaClassPreserver';

// Test preservation
const originalHtml = '<h1 class="mythoria-story-title">My Story</h1>';
const strippedHtml = stripMythoriaClasses(originalHtml);
const preservedHtml = preserveMythoriaClasses(strippedHtml);

// Validate result
const validation = validateMythoriaClasses(preservedHtml);
console.log('Classes preserved:', validation.isValid);
```

This system ensures that the beautiful styling defined in the CSS templates continues to work even after users edit their stories!
