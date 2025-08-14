import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }  // Load and merge messages from different domain files
  const [
    commonMessages,
    authMessages,
    publicPagesMessages,
    privacyPolicyMessages,
    pricingMessages,
    storyStepsMessages,
    contactUsPageMessages,
    aboutUsMessages,
    myStoriesPageMessages,
    buyCreditsMessages,
    publicStoryPageMessages,
    storyEditPageMessages,
    charactersMessages,
    componentsMessages,
    deleteAccountMessages,
    editorMessages,
    libMessages,
    metadataMessages,
    sharedStoryPageMessages,
    blogMessages
  ] = await Promise.all([
    import(`../messages/${locale}/common.json`).then(module => module.default),
    import(`../messages/${locale}/auth.json`).then(module => module.default),
    import(`../messages/${locale}/publicPages.json`).then(module => module.default),
    import(`../messages/${locale}/privacy-policy.json`).then(module => module.default),
    import(`../messages/${locale}/pricing.json`).then(module => module.default),
    import(`../messages/${locale}/storySteps.json`).then(module => module.default),
    import(`../messages/${locale}/ContactUsPage.json`).then(module => module.default),
    import(`../messages/${locale}/aboutUs.json`).then(module => module.default),
    import(`../messages/${locale}/MyStoriesPage.json`).then(module => module.default),
    import(`../messages/${locale}/buy-credits.json`).then(module => module.default),
    import(`../messages/${locale}/PublicStoryPage.json`).then(module => module.default),
    import(`../messages/${locale}/storyEditPage.json`).then(module => module.default),
    import(`../messages/${locale}/characters.json`).then(module => module.default),
    import(`../messages/${locale}/components.json`).then(module => module.default),
    import(`../messages/${locale}/delete-account.json`).then(module => module.default),
    import(`../messages/${locale}/editor.json`).then(module => module.default),
    import(`../messages/${locale}/lib.json`).then(module => module.default),
    import(`../messages/${locale}/metadata.json`).then(module => module.default),
    import(`../messages/${locale}/SharedStoryPage.json`).then(module => module.default),
    import(`../messages/${locale}/blog.json`).then(module => module.default)
  ]);

  return {
    locale: locale as string,
    messages: {
      ...commonMessages,
      ...authMessages,
      ...contactUsPageMessages,
      ...aboutUsMessages,
      ...myStoriesPageMessages,
      ...buyCreditsMessages,
      ...publicStoryPageMessages,
      ...storyEditPageMessages,
      ...charactersMessages,
      ...componentsMessages,
      ...deleteAccountMessages,
      ...editorMessages,
      ...libMessages,
      ...metadataMessages,
      ...sharedStoryPageMessages,
      ...blogMessages,
      publicPages: publicPagesMessages,
      privacyPolicy: privacyPolicyMessages,
      pricing: pricingMessages,
      storySteps: storyStepsMessages
    }
  };
});
