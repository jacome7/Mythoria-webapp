export const storyInputLimitMiB = 16;
export const storyInputMaxBytes = storyInputLimitMiB * 1024 * 1024;
// Previous wizard versions include a Base64 data URL and a small JSON envelope.
export const storyInputMaxJsonBytes = 4 * Math.ceil(storyInputMaxBytes / 3) + 4096;

export class StoryInputTooLarge extends Error {}
