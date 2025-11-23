#!/usr/bin/env tsx
/**
 * Seed script for FAQ sections and sample entries
 * Populates the initial 14 FAQ sections with sample data
 *
 * Usage: tsx scripts/seed-faq.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { faqSections, faqEntries } from '../src/db/schema/faq';

// Load environment variables
config({ path: '.env.local' });

interface FaqSectionData {
  sectionKey: string;
  defaultLabel: string;
  description: string;
  iconName: string;
  sortOrder: number;
}

interface FaqEntryData {
  sectionKey: string;
  faqKey: string;
  locale: string;
  title: string;
  contentMdx: string;
  questionSortOrder: number;
}

const FAQ_SECTIONS: FaqSectionData[] = [
  {
    sectionKey: 'getting-started-and-accounts',
    defaultLabel: 'Getting Started & Accounts',
    description:
      'All about what Mythoria is, who it is for, creating accounts, login, and basic onboarding',
    iconName: 'FaRocket',
    sortOrder: 1,
  },
  {
    sectionKey: 'story-creation-and-workflow',
    defaultLabel: 'Story Creation & Workflow',
    description:
      'How to create a story step by step, choose structure, chapters, target audience and the creation flow',
    iconName: 'FaBook',
    sortOrder: 2,
  },
  {
    sectionKey: 'characters-and-personalization',
    defaultLabel: 'Characters & Personalization',
    description:
      'The Character Atelier: create, edit and reuse characters, base them on real people',
    iconName: 'FaUsers',
    sortOrder: 3,
  },
  {
    sectionKey: 'art-styles-images-and-photos',
    defaultLabel: 'Art Styles, Images & Photos',
    description:
      'Available illustration styles, image generation, uploading photos, and print quality',
    iconName: 'FaPalette',
    sortOrder: 4,
  },
  {
    sectionKey: 'ai-editing-translations-and-advanced-tools',
    defaultLabel: 'AI Editing, Translations & Advanced Tools',
    description:
      'AI Story Studio: editing chapters, tone/length changes, alternative versions, translations',
    iconName: 'FaMagic',
    sortOrder: 5,
  },
  {
    sectionKey: 'credits-pricing-and-payments',
    defaultLabel: 'Credits, Pricing & Payments',
    description: 'How credits work, pricing logic, payment methods, refunds and failed generations',
    iconName: 'FaCreditCard',
    sortOrder: 6,
  },
  {
    sectionKey: 'printing-shipping-and-physical-books',
    defaultLabel: 'Printing, Shipping & Physical Books',
    description: 'Print formats, paper and cover options, production times, shipping, delivery',
    iconName: 'FaTruck',
    sortOrder: 7,
  },
  {
    sectionKey: 'audiobooks-and-listening-experience',
    defaultLabel: 'Audiobooks & Listening Experience',
    description:
      'Audiobook Forge: generate audiobooks, choose voices and languages, credits, listening',
    iconName: 'FaHeadphones',
    sortOrder: 8,
  },
  {
    sectionKey: 'reading-sharing-and-public-stories',
    defaultLabel: 'Reading, Sharing & Public Stories',
    description:
      'Reading on devices, sharing with friends/family, privacy settings, ratings, reviews, gallery',
    iconName: 'FaShareAlt',
    sortOrder: 9,
  },
  {
    sectionKey: 'privacy-safety-and-children',
    defaultLabel: 'Privacy, Safety & Children',
    description: 'Privacy defaults, who can see stories, age rules, parental use, content safety',
    iconName: 'FaShieldAlt',
    sortOrder: 10,
  },
  {
    sectionKey: 'ownership-copyright-and-ai',
    defaultLabel: 'Ownership, Copyright & AI',
    description: 'Rights to generated stories and images, what you can do with them, AI copyright',
    iconName: 'FaBalanceScale',
    sortOrder: 11,
  },
  {
    sectionKey: 'languages-locales-and-accessibility',
    defaultLabel: 'Languages, Locales & Accessibility',
    description:
      'Supported languages, mixing languages, interface translations, accessibility features',
    iconName: 'FaGlobe',
    sortOrder: 12,
  },
  {
    sectionKey: 'partners-companies-and-schools',
    defaultLabel: 'Partners, Companies & Schools',
    description:
      'How organizations partner with Mythoria, co-branded books, bulk orders, special conditions',
    iconName: 'FaHandshake',
    sortOrder: 13,
  },
  {
    sectionKey: 'technical-issues-billing-and-support',
    defaultLabel: 'Technical Issues, Billing & Support',
    description:
      'Login issues, bugs, failed generations, billing problems, contacting support, bug rewards',
    iconName: 'FaLifeRing',
    sortOrder: 14,
  },
];

const SAMPLE_FAQ_ENTRIES: FaqEntryData[] = [
  // Getting Started
  {
    sectionKey: 'getting-started-and-accounts',
    faqKey: 'what-is-mythoria',
    locale: 'en-US',
    title: 'What is Mythoria?',
    contentMdx: `Mythoria is an AI-powered platform that creates **personalized storybooks** tailored to you, your loved ones, or your imagination.

Whether you're crafting a bedtime story for your child, a gift for a friend, or exploring creative writing, Mythoria combines advanced AI with beautiful illustrations to bring your stories to life.

You can:
- Create custom characters based on real people or imagination
- Generate illustrated chapters in various artistic styles
- Produce audiobooks with professional narration
- Order professionally printed physical books
- Share and publish your stories with the community`,
    questionSortOrder: 1,
  },
  {
    sectionKey: 'getting-started-and-accounts',
    faqKey: 'how-to-create-account',
    locale: 'en-US',
    title: 'How do I create an account?',
    contentMdx: `Creating a Mythoria account is simple and free:

1. Click **Sign Up** in the top right corner
2. Choose your preferred method:
   - Email and password
   - Google account
   - Apple ID
3. Complete your profile with basic information
4. Verify your email address (if using email/password)

Once registered, you'll receive **welcome credits** to start creating your first story! 🎉`,
    questionSortOrder: 2,
  },
  // Story Creation
  {
    sectionKey: 'story-creation-and-workflow',
    faqKey: 'how-long-to-create-story',
    locale: 'en-US',
    title: 'How long does it take to create a story?',
    contentMdx: `Story creation time depends on length and features:

**Typical timeframes:**
- **Short story (3-4 chapters):** 5-10 minutes
- **Standard story (6 chapters):** 10-15 minutes
- **Long story (12+ chapters):** 20-30 minutes

**What affects generation time:**
- Number of chapters
- Complexity of plot and characters
- Number of illustrations
- Current server load

You can leave the page during generation—we'll notify you when your story is ready! 📧`,
    questionSortOrder: 1,
  },
  // Credits & Pricing
  {
    sectionKey: 'credits-pricing-and-payments',
    faqKey: 'how-credits-work',
    locale: 'en-US',
    title: 'How do credits work?',
    contentMdx: `Credits are Mythoria's currency for creating content. Here's how they work:

**What you can do with credits:**
- Generate complete stories (varies by length)
- Create individual illustrations
- Generate audiobooks
- Edit and refine existing content
- Order printed books

**Credit costs (approximate):**
- Short story (3-4 chapters): 50-75 credits
- Standard story (6 chapters): 100-150 credits
- Audiobook generation: 30-50 credits
- Single illustration: 10-15 credits

**Getting credits:**
- Purchase credit packages
- Earn through promotions and referrals
- Receive bonus credits for reporting bugs

Credits never expire, so buy when convenient! 💎`,
    questionSortOrder: 1,
  },
  {
    sectionKey: 'credits-pricing-and-payments',
    faqKey: 'refund-policy',
    locale: 'en-US',
    title: 'What is the refund policy?',
    contentMdx: `We want you to be happy with every story! Here's our refund policy:

**Automatic refunds:**
- Failed generations are automatically refunded within 24 hours
- Technical errors during processing

**Refund requests:**
- Content quality issues (reviewed case-by-case)
- Incorrect output despite clear instructions
- System bugs affecting your story

**Not eligible for refunds:**
- Stories that were successfully generated but don't match subjective expectations
- Completed stories you've already downloaded or printed

**How to request a refund:**
Contact support with your story ID and describe the issue. We typically respond within 24 hours.

**Tip:** Use the "Preview" feature before finalizing to ensure you're happy with the direction! ✅`,
    questionSortOrder: 5,
  },
  // Technical Support
  {
    sectionKey: 'technical-issues-billing-and-support',
    faqKey: 'contact-support',
    locale: 'en-US',
    title: 'How do I contact support?',
    contentMdx: `We're here to help! Contact us through:

**Support channels:**
- **Email:** support@mythoria.com
- **In-app chat:** Click the help icon (logged-in users)
- **Contact form:** Visit our Contact Us page

**What to include:**
- Your account email
- Story ID (if applicable)
- Detailed description of the issue
- Screenshots if relevant

**Response times:**
- Technical issues: Within 24 hours
- Billing questions: Within 48 hours
- General inquiries: Within 2-3 business days

**Bug bounty:** Report reproducible bugs and earn bonus credits! 🐛`,
    questionSortOrder: 1,
  },
];

async function seedFAQ() {
  console.log('🌱 Starting FAQ seed process...');

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: true,
            ca: process.env.DB_SSL_CA,
            key: process.env.DB_SSL_KEY,
            cert: process.env.DB_SSL_CERT,
          }
        : { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  try {
    // Insert FAQ sections
    console.log('📁 Seeding FAQ sections...');
    for (const section of FAQ_SECTIONS) {
      // Check if section already exists
      const existing = await db
        .select()
        .from(faqSections)
        .where(eq(faqSections.sectionKey, section.sectionKey))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(faqSections).values({
          sectionKey: section.sectionKey,
          defaultLabel: section.defaultLabel,
          description: section.description,
          iconName: section.iconName,
          sortOrder: section.sortOrder,
          isActive: true,
        });
        console.log(`  ✓ Created section: ${section.defaultLabel}`);
      } else {
        console.log(`  ⊘ Section already exists: ${section.defaultLabel}`);
      }
    }

    // Insert sample FAQ entries
    console.log('\n❓ Seeding sample FAQ entries...');
    for (const entry of SAMPLE_FAQ_ENTRIES) {
      // Get the section ID
      const section = await db
        .select()
        .from(faqSections)
        .where(eq(faqSections.sectionKey, entry.sectionKey))
        .limit(1);

      if (section.length === 0) {
        console.log(`  ⚠️  Section not found for entry: ${entry.title}`);
        continue;
      }

      // Check if entry already exists
      const existing = await db
        .select()
        .from(faqEntries)
        .where(eq(faqEntries.faqKey, entry.faqKey))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(faqEntries).values({
          sectionId: section[0].id,
          faqKey: entry.faqKey,
          locale: entry.locale,
          title: entry.title,
          contentMdx: entry.contentMdx,
          questionSortOrder: entry.questionSortOrder,
          isPublished: true,
        });
        console.log(`  ✓ Created FAQ: ${entry.title}`);
      } else {
        console.log(`  ⊘ FAQ already exists: ${entry.title}`);
      }
    }

    console.log('\n✅ FAQ seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${FAQ_SECTIONS.length} sections initialized`);
    console.log(`  - ${SAMPLE_FAQ_ENTRIES.length} sample FAQs created`);
    console.log('\n💡 Next steps:');
    console.log('  - Visit the Admin Portal to add more FAQs');
    console.log('  - Use the translation feature to create localized versions');
    console.log('  - Configure sections on your Contact Us and Pricing pages');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedFAQ();
