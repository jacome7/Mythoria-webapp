# Mythoria Manual Story Editing Feature

## Overview

This feature allows users to manually edit the HTML content of their published stories using a rich WYSIWYG editor powered by Tiptap. Changes are saved back to Google Cloud Storage and only applied when the user explicitly saves them.

## Implementation Summary

### Frontend Components

1. **BookEditor Component** (`src/components/BookEditor.tsx`)
   - Tiptap-based WYSIWYG editor with comprehensive toolbar
   - Features: Bold, Italic, Underline, Lists, Text Alignment, Colors, Find & Replace
   - DaisyUI styling for consistent UI
   - Change tracking with unsaved changes indicator
   - Save/Cancel functionality

2. **Toast Notification System**
   - `src/hooks/useToast.ts` - Custom hook for managing toast notifications
   - `src/components/ToastContainer.tsx` - Toast display component
   - Replaces browser alerts with elegant DaisyUI-styled notifications

### Backend API Endpoints

1. **GET `/api/books/[id]/html`** (`src/app/api/books/[id]/html/route.ts`)
   - Fetches story HTML content from Google Cloud Storage for editing
   - Includes authentication and ownership verification
   - Returns sanitized HTML content

2. **POST `/api/books/[id]/save`** (`src/app/api/books/[id]/save/route.ts`)
   - Accepts edited HTML content with source metadata
   - Uploads to Google Cloud Storage with unique filenames
   - Updates story's `htmlUri` in the database
   - Includes comprehensive error handling and validation

### Integration Points

1. **Story Reader Page** (`src/app/[locale]/stories/[storyId]/page.tsx`)
   - Added "Edit" button to the toolbar
   - Integrated BookEditor component
   - Handles save/cancel operations with proper state management
   - Displays toast notifications for user feedback

## Dependencies Added

- `@tiptap/react` - Core Tiptap React integration
- `@tiptap/pm` - ProseMirror integration
- `@tiptap/starter-kit` - Basic editing extensions
- `@tiptap/extension-link` - Link support
- `@tiptap/extension-image` - Image support
- `@tiptap/extension-text-style` - Text styling
- `@tiptap/extension-color` - Text colors
- `@tiptap/extension-text-align` - Text alignment
- `@floating-ui/react` - Floating UI for Find & Replace
- `@google-cloud/storage` - Google Cloud Storage SDK

## Features

### Editor Capabilities
- **Rich Text Editing**: Bold, italic, underline formatting
- **Lists**: Bullet and numbered lists
- **Text Alignment**: Left, center, right alignment
- **Text Colors**: Color picker for text styling
- **Find & Replace**: Search and replace functionality with floating UI
- **Undo/Redo**: Standard undo/redo operations
- **Auto-save Indicator**: Visual indicator for unsaved changes

### User Experience
- **Authentication**: Only story owners can edit their stories
- **Real-time Preview**: Changes are visible immediately in the editor
- **Save Confirmation**: Elegant toast notifications instead of browser alerts
- **Cancel Protection**: Warns users about unsaved changes
- **Responsive Design**: Works on desktop and mobile devices

### Data Management
- **GCS Integration**: Stories stored in Google Cloud Storage
- **Unique Filenames**: Prevents conflicts with timestamp-based naming
- **Source Tracking**: Marks manually edited stories with `source: 'manual'`
- **Database Updates**: Automatically updates story metadata after saves

## Usage

1. **Access**: Navigate to any published story you own
2. **Edit**: Click the "Edit" button in the story toolbar
3. **Modify**: Use the rich text editor to make changes
4. **Save**: Click "Save Changes" to persist modifications
5. **Cancel**: Click "Cancel" to discard changes and return to reading mode

## Technical Notes

- **Security**: All API endpoints include authentication and ownership checks
- **Performance**: Editor loads with existing HTML content for immediate editing
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Validation**: Input validation and sanitization for security
- **State Management**: Proper React state management for editor and UI states

## Future Enhancements

- **Auto-save**: Implement periodic auto-saving
- **Version History**: Track multiple versions of edited stories  
- **Collaborative Editing**: Multiple users editing simultaneously
- **Advanced Formatting**: Additional text formatting options
- **Image Upload**: Direct image upload to the editor
- **Export Options**: Export edited stories in various formats
