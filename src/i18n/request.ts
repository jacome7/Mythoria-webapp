import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
   // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }  // Load and merge messages from different domain files
  const [commonMessages, publicPagesMessages, privacyPolicyMessages, pricingMessages, storyStepsMessages, contactUsPageMessages] = await Promise.all([
    import(`../messages/${locale}/common.json`).then(module => module.default),
    import(`../messages/${locale}/publicPages.json`).then(module => module.default),
    import(`../messages/${locale}/privacy-policy.json`).then(module => module.default),
    import(`../messages/${locale}/pricing.json`).then(module => module.default),
    import(`../messages/${locale}/storySteps.json`).then(module => module.default),
    import(`../messages/${locale}/ContactUsPage.json`).then(module => module.default)
  ]);  return {
    locale: locale as string,
    messages: {
      ...commonMessages,
      ...contactUsPageMessages,
      publicPages: publicPagesMessages,
      privacyPolicy: privacyPolicyMessages,
      pricing: pricingMessages,
      storySteps: storyStepsMessages
    }
  };
});
