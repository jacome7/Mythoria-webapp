# Improve photos and image handling
On the Tell-your-story, step-2 ``, we allow the user to upload up to 3 photos and an audio file.
Currenly, these photos or audio are then passed to the `story-generation-workflow` API, to extract a story structure, i.e., a JSON with all the story details.

I want to improve the existing behaviour:
## A. Storage
I want to change the current behaviour of audio and image handling. Currently we are passing all the audio/image bytes, directly to the `story-generation-workflow` API.
To avoid unecessary bandwidth usage, I want the `mythoria-weapp` to upload all these files directly to the Google Cloud Storage, folder `{storyId}/inputs`.
When uploading the image or audio to the Google Cloud Storage, generate a unique GUID and use it as the filename - keeping the existing file extension.

Then we need to change the `story-generation-workflow` API and remove the code that received the audio/image bytes and stored them on the Google Cloud Storage.
This requires a change on both `mythoria-weapp` and `story-generation-workflow`

## B. Metadata
When we call the API to Generate a structured story based on the images or audio, we must first:
### 1. Extract the images metadata
For every image URL provided to the API, If no existing metadata exists on the Google Cloud Storage (same filename as the image, but extension `.json`), use Google Gen AI, to extract the image information.
We need to identify the following information:
1. Type of image:
  - photo - It is a photograph of a person, object, landscape or scenary;
  - drawing - Is a photo of a hand drawing;
  - text - Is a photo of a document (e.g. sheet of paper) with text on it.
If the photograph has a mix of content (e.g. a person holding a piece of paper with text), choose the most proeminent type.

2. Description - A complete and detailed description of the content of the photograph

3. Text - Full OCR of all the text visible on the image. You can guess or estimate missing or unreadable text.

You MUST call the Google Gen AI, with the Audio / image, and request a response with the following format (create and send the associated JSON schema).
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Image Metadata",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["photo", "drawing", "text"],
      "description": "Dominant type of the image."
    },
    "description": {
      "type": "string",
      "description": "Complete and detailed description of the image content. E.g. provide detailed descriptions of the persons on the photos."
    },
    "text": {
      "type": "string",
      "description": "Full OCR text extracted from the image."
    }
  },
  "required": ["type", "description", "text"],
  "additionalProperties": false
}

For the audio, use a similar JSON SCHEMA, but with only the text and description. On the description describe the mood, ambient noise and number of speakers.

### 2. Update the existing /ai/text/structure API
When we call the Google Gen AI to generate the Story Structure, we need to pass not only the Users provided text (if available), but also all the meta-data from all the images/audios provided by the author for this story. If not yet available, you can download all this information from the Google Cloud Storage.

## C. Performance
Since this API call can take a lot of time to execute, we need to 

### 1. Make it asyncronous
Just like other APIs already available, use the existing jobs `/src/services/job-manager.ts` and `/src/workers` logic and make this API async.
This will require to first, update the `story-generation-workflow` API server, and update the documention. Afterwards, we need to change the client (`mythoria-webapp`) to use the new Async API.

### 2. Parallize the Gen AI calls
If the user provides multiples images or audios, parallize the request to extract the metadata from the audio/images, to complete it faster.
Then, after extracting all the metadata, then you can call the Gen AI to extract the story structure.



PLEASE ANALYZE VERY CAREFULLY WHAT AS BEEN REQUESTED.
LOOK THROUGHLY INTO THE EXISTING CODE TO UNDERSTAND WHAT EXISTS.
IF YOU HAVE ANY QUESTIONS OR SUGGESTIONS, PLEASE ASK (PROMPT) ME BEFORE START CODING.

