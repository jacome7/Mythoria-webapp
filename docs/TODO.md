# Improve photos and image handling
On the Tell-your-story, step-2 `src\app\[locale]\tell-your-story\step-2\page.tsx`, we allow the user to upload up to 3 photos and an audio file.
Currenly, these photos or audio are then passed to the `story-generation-workflow` API, to extract a story structure, i.e., a JSON with all the story details.

I want to improve the existing behaviour:
## A. Storage
I want to change the current behaviour of audio and image handling. Currently we are passing all the audio/image bytes, directly to the `story-generation-workflow` API.
To avoid unecessary bandwidth usage, I want the `mythoria-weapp` to upload all these files directly to the Google Cloud Storage, folder `{storyId}/inputs`.
When uploading the image or audio to the Google Cloud Storage, generate a unique GUID and use it as the filename - keeping the existing file extension (mp3, jpg, etc.).

Then we need to change the `story-generation-workflow` API and remove the code that receives the audio/image bytes and stored them on the Google Cloud Storage.
This requires a change on both `mythoria-webapp` and `story-generation-workflow`

## B. Metadata
When we call the API to Generate a structured story based on the images or audio, we must first:
### 1. Extract the images metadata
For every image URL provided to the API, If no existing metadata exists on the Google Cloud Storage (same filename as the image, but extension `.json`), use Gen AI (choose provider depending on an environment variable called `IMAGE_ANALYZER_PROVIDER` if not set fallback to use the `IMAGE_PROVIDER`), to extract the image information.

We need to identify the following information:
1. Type of image:
  - photo - It is a photograph of a person, object, landscape or scenary;
  - drawing - Is a photo of a hand drawing, schematic or a photo of a poster;
  - text - Is a photo of a document (e.g. sheet of paper) with text on it.
If the photograph has a mix of content (e.g. a person holding a piece of paper with text), choose the most proeminent type.

2. Description - A complete and detailed description of the content of the photograph

3. Text - Full OCR of all the text visible on the image. You can guess or estimate missing or unreadable text.

You MUST call the Google Gen AI, with the Audio / image, and request a response with the following format (create and send the associated JSON schema).
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "Image Metadata",
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

Search online for Best Prompting techniques and place the prompt on the `prompts` folder for easier maintenance.

### 2. Update the existing /ai/text/structure API
When we call the Google Gen AI to generate the Story Structure, we need to pass not only the Users provided text (if available), but also all the meta-data from all the images/audios provided by the author for this story. If not yet available, you can download all this information from the Google Cloud Storage.

## C. Performance
Since this API call can take a lot of time to execute, we need to:

### 1. Make it asyncronous
Just like other APIs already available, use the existing jobs `/src/services/job-manager.ts` and `/src/workers` logic and make this API async.
This will require to first, update the `story-generation-workflow` API server, and update the documention. Afterwards, we need to change the client (`mythoria-webapp`) to use the new Async API.

### 2. Parallize the Gen AI calls
If the user provides multiples images or audios, parallize the request to extract the metadata from the audio/images, to complete it faster.
Then, after extracting all the metadata, then you can call the Gen AI to extract the story structure.

PLEASE ANALYZE VERY CAREFULLY WHAT AS BEEN REQUESTED.
LOOK THROUGHLY INTO THE EXISTING CODE TO UNDERSTAND WHAT EXISTS.
IF YOU HAVE ANY QUESTIONS OR SUGGESTIONS, PLEASE ASK (PROMPT) ME BEFORE START CODING.

------------------

# Improve Edit Image feature
On my `mythoria-webapp` the user can use the component `mythoria-webapp\src\components\AIImageEditor.tsx` to edit an existing story image (it can either be a chapter image or a front or back cover image).
I want to extend this feature to allow the user to upload an image to be used as reference or, to completely replace the existing image (if the image ratio fits).
To implement this feature we need to:

## A. Extend the Story-generation-workflow image edit API to accept an image Uri
We need to extend the existing Async image editing API `\story-generation-workflow\src\routes\async-jobs.ts`, to, optionally, allow to receive a Google Storage image internal URI. Include also a flag, named `useUserImage`, by default, `false`. When the `useUserImage` is true, just replace the existing chapter / cover / backcover image with the provided image, without calling, at all, any GenAI feature.

If an image is received, and the `useUserImage` is either missing or set to `false`, the image must be included on the GenAI prompt to update the existing chapter / cover / backcover image.
Update the existing prompt for, ONLY when an image is included, to instruct the AI to use it as reference - while keeping all the existing styling options and, if provided the user text.

If no image is provided, just keep the same functionality as it currently exist.

## B. Update the image edit component to allow user uploaded images
Extend the exiting UI component `mythoria-webapp\src\components\AIImageEditor.tsx`, to allow, bellow the user instructions input box, the user to upload an image.
Instruct the user that the image works best if in portrait format.
The image must be JPEG, HEIC/HEIF (.heic) or .PNG format and with a maximum of 8MB.

After the user upload the photo, automatically resize the image if it has a resolution higher than 1536 pixeis, to a maximum of 1536 width or height (keeping the same proprtion).
Then if the image proportions is +/-15% of the proportion 1536x1024, then just accept it and continue.
Otherwise, show the image on the UI with an utility for the user to select the desired image crop (to keep the 1536x1024 format).

When the user accepts, the image must be stored, with a new GUID, on the Google Cloud `STORAGE_BUCKET_NAME=mythoria-generated-stories` within the folder `/{storyId}/inputs/`.

Then the image Uri must be sent to the `story-generation-workflow` API request to be used as reference.

-----

We want to develop this big feature, step-by-step. Start to implement the Step A. Storage.

PLEASE ANALYZE VERY CAREFULLY WHAT AS BEEN REQUESTED.
LOOK THROUGHLY INTO THE EXISTING CODE TO UNDERSTAND WHAT EXISTS.
IF YOU HAVE ANY QUESTIONS OR SUGGESTIONS, PLEASE ASK (PROMPT) ME BEFORE START CODING.

-----

# Allow user to upload a character photo
When creating or adding a character, allow the user to upload a photo of the character face.
Extend the CharactetCard component `src\components\CharacterCard.tsx` to:

## On the top left of the card, show the charater photo.
If the character hasn't provided any photo, dynamically load the character icon based on the character type "Boy", "Girl", "Man", "Woman", etc...
If the character as a photoUri set-up, then use it, using a rounded shape.

## Allow the user to upload a photo for the character
IF, and only if, there is no character `photoUri` setup, i.e. the character `photoUri` is empty or null, show, 
On edit mode, on the end of the character card, a button to upload the character photo (just on top the cancel and "save changes" buttons).

We can only accept photos with a maximum size of 8MB.
Before the input box to upload a photo, show the message:
«Upload a photo to personalize your character. Only share images you own, and if it’s a child, make sure you’re their parent or guardian.» With an (i) info icon on the end.
When the user presses the (i) ison, open a modal with the following text:
«Your photo will only be used to create personalized illustrations of your character. Please upload only images you own the rights to. If the photo includes a child, you must be their parent or legal guardian and give consent before uploading. AI-generated images may not always be exact, and once shared outside Mythoria we can’t control how they are used. For full details, see our [Privacy & Terms](https://mythoria.pt/termsAndConditions).»

After the user upload a photo, we must provide a cropping UI, so the user can crop and resize the image to a square format. To do that use the already installed `react-easy-crop` plugin.

When the user presses the "crop" button, on the backend, resize the photo to 768x768 resolution and save it to the google cloud storage bucket defined on the env variable `STORAGE_BUCKET_NAME` under the folder `mythoria-generated-stories/{stroyId}/characters`. The file name must the the UUID of the character.



When the user presses the Character Icon (even if it is an photo), open a modal for the user 

----

When generating user facing text, take in consideration that Mythoria voice, represents a very young man (early 20's) and is:
- A direct and clear voice, but also playful and warm.
- You may use emojis—very sparingly—and only when they help add emphasis.
- A voice steeped in storytelling, with, if required, references to books and films. You can use some poetic or rhymes.

The current application supports the following locales:
1. American English `en-US` - as spoken in New York.
2. European Portuguese `pt-PT` - as spoken in Lisbon, Portugal.
3. European Spanish `es-ES` - as spoken in Madrid, Spain.
4. European French `fr-FR` - as spoken in Paris, France.

----

PLEASE ANALYZE VERY CAREFULLY WHAT AS BEEN REQUESTED.
LOOK THROUGHLY INTO THE EXISTING CODE TO UNDERSTAND WHAT EXISTS.
IF YOU HAVE ANY QUESTIONS OR SUGGESTIONS, PLEASE ASK (PROMPT) ME BEFORE START CODING.