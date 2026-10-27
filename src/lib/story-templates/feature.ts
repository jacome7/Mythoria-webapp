import 'server-only';

/** Runtime kill switch; unset and unrecognized values keep templates disabled. */
export function isStoryTemplatesEnabled(): boolean {
  return process.env.STORY_TEMPLATES_ENABLED === 'true';
}

/** Only persisted, explicit opt-in can grant experimental story creation. */
export function isStoryTemplatesEnabledForAuthor(
  author: { experimentalFeaturesEnabled?: boolean } | null | undefined,
): boolean {
  return isStoryTemplatesEnabled() && author?.experimentalFeaturesEnabled === true;
}
