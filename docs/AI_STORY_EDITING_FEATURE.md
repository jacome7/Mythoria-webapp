# AI Story Editing Feature

## Overview
The AI Story Editing feature allows users to improve their published stories using AI-powered suggestions and edits. Users can choose to edit specific chapters or the entire story by providing natural language requests for changes.

## How It Works

### For Users
1. **Navigate to Story Editor**: Go to any published story's edit page
2. **Click AI Edit Button**: Look for the "AI Edit" button with a lightning bolt icon (⚡) in the toolbar
3. **Choose Scope**: Use the dropdown to select "Entire Story" or a specific chapter
4. **Provide Instructions**: Enter a detailed request describing the changes you want (up to 2000 characters)
5. **Apply Changes**: Click "Apply Changes" and wait for the AI to process your request
6. **Review Results**: The editor will update with the AI-improved content for you to review
7. **Save**: Use the regular Save button to persist the changes

### Chapter Detection
The system automatically detects chapters in your story using multiple patterns:
- `<h2>Chapter 1</h2>`, `<h2>Chapter 1: Title</h2>`
- `<h2>1. Chapter Title</h2>`, `<h2>1 - Chapter Title</h2>`
- Numbered headings and chapter-like patterns
- Supports both English and Portuguese chapter formats

### Example Requests
- "Make the dragon more friendly and less scary for young children"
- "Add more dialogue between the main characters"
- "Include more descriptive details about the magical forest"
- "Make the ending more exciting and adventurous"
- "Fix any grammatical errors and improve sentence flow"
- "Add a new subplot about the character's pet companion"

## Technical Implementation

### Components Added

#### 1. AIEditModal (`src/components/AIEditModal.tsx`)
- Modal interface for AI editing requests
- Intelligent chapter detection with multiple regex patterns
- Dropdown selection for choosing between entire story or specific chapters
- Request input with character limits and validation
- Example suggestions for user guidance
- Loading states and comprehensive error handling
- Debug logging for troubleshooting chapter extraction

#### 2. API Endpoint (`src/app/api/story-edit/route.ts`)
- Proxy endpoint that forwards requests to the story-generation-workflow service
- Handles authentication and request validation
- Manages communication between webapp and workflow service

#### 3. BookEditor Updates (`src/components/BookEditor.tsx`)
- Added AI Edit button to toolbar
- Integration with AIEditModal
- Content update handling after AI editing
- Preservation of existing editor functionality

### Environment Configuration
- Added `STORY_GENERATION_WORKFLOW_URL` environment variable
- Default value: `http://localhost:8080` for local development
- Configurable for different environments (staging, production)

### Backend Integration
The feature integrates with the existing story-generation-workflow service via the `/story-edit` endpoint:

#### Request Format
```json
{
  "storyId": "uuid",
  "chapterNumber": 3,          // Optional - if omitted, edits entire story
  "userRequest": "string"      // The editing request (1-2000 characters)
}
```

#### Response Format
```json
{
  "success": true,
  "storyId": "uuid",
  "chapterNumber": 3,          // Present if specific chapter was edited
  "context": "Chapter 3",      // Description of what was edited
  "userRequest": "string",     // Original user request
  "updatedHtml": "string",     // Complete updated HTML story
  "metadata": {
    "originalLength": 1500,    // Length of original text
    "editedLength": 1620,      // Length of edited text
    "htmlLength": 8940,        // Length of final HTML
    "timestamp": "2025-06-20T10:30:00.000Z"
  }
}
```

## Security & Validation
- User authentication required (via Clerk)
- Story ownership validation
- Request length limits (2000 characters)
- Only published stories can be edited
- Input sanitization and validation

## User Experience Features
- **Smart Chapter Detection**: Automatically identifies chapters using multiple patterns and formats
- **Dropdown Selection**: Clean dropdown interface for selecting editing scope
- **Real-time Feedback**: Shows chapter count and loading progress during AI processing
- **Error Handling**: Provides clear error messages for various failure scenarios
- **Integration**: Seamlessly integrates with existing story editing workflow
- **Preservation**: Maintains story formatting and CSS classes during editing
- **Debug Support**: Console logging helps troubleshoot chapter extraction issues

## Performance Considerations
- Processing time: 5-15 seconds for chapter edits, 30-60 seconds for full story edits
- AI token usage tracking for cost monitoring
- Graceful handling of timeouts and failures
- Progressive loading indicators for user feedback

## Future Enhancements
- Batch editing capabilities
- Advanced editing options (tone, style adjustments)
- Edit history and versioning
- Collaborative editing features
- AI suggestions preview before applying
