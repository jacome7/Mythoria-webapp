const fs = require('fs');
const path = require('path');

const locales = ['en-US', 'pt-PT'];
const requiredHomePageKeys = ['words', 'hero', 'audiences', 'howItWorks', 'community'];
const requiredCommonKeys = ['Header', 'Footer'];

// New: Critical keys for PublicStoryPage that must exist for CTAs to render translated in production
// Each entry is a dot-path under the root object of PublicStoryPage.json
const requiredPublicStoryPageKeys = [
  'PublicStoryPage.storyComplete.enjoyedTitle',
  'PublicStoryPage.storyComplete.enjoyedDesc',
  'PublicStoryPage.actions.createOwnStory',
  'PublicStoryPage.actions.orderPrintedBook',
  'PublicStoryPage.metadata.coverImageAlt'
];

function getNested(obj, pathStr) {
  return pathStr.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

console.log('🔍 Verifying translation files...\n');

let hasErrors = false;

locales.forEach(locale => {
  console.log(`📁 Checking locale: ${locale}`);
  
  const messagesPath = path.join(__dirname, '../src/messages', locale);
  
  if (!fs.existsSync(messagesPath)) {
    console.error(`❌ Missing messages directory for locale: ${locale}`);
    hasErrors = true;
    return;
  }
  
  // Check publicPages.json for HomePage content
  const publicPagesPath = path.join(messagesPath, 'publicPages.json');
  if (!fs.existsSync(publicPagesPath)) {
    console.error(`❌ Missing publicPages.json for locale: ${locale}`);
    hasErrors = true;
  } else {
    try {
      const content = JSON.parse(fs.readFileSync(publicPagesPath, 'utf8'));
      
      if (!content.HomePage) {
        console.error(`❌ Missing HomePage section in publicPages.json for locale: ${locale}`);
        hasErrors = true;
      } else {
        const homePage = content.HomePage;
        
        requiredHomePageKeys.forEach(key => {
          if (!homePage[key]) {
            console.error(`❌ Missing required key '${key}' in HomePage section for locale: ${locale}`);
            hasErrors = true;
          }
        });
        
        // Verify 'words' is an array
        if (homePage.words && !Array.isArray(homePage.words)) {
          console.error(`❌ 'words' must be an array in HomePage section for locale: ${locale}`);
          hasErrors = true;
        } else if (Array.isArray(homePage.words)) {
          console.log(`✅ HomePage 'words' array has ${homePage.words.length} items for locale: ${locale}`);
        }
        
        console.log(`✅ publicPages.json HomePage section verified for locale: ${locale}`);
      }
    } catch (e) {
      console.error(`❌ Failed to parse publicPages.json for locale ${locale}:`, e.message);
      hasErrors = true;
    }
  }
  
  // Check common.json
  const commonPath = path.join(messagesPath, 'common.json');
  if (!fs.existsSync(commonPath)) {
    console.error(`❌ Missing common.json for locale: ${locale}`);
    hasErrors = true;
  } else {
    try {
      const content = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
      
      if (!content.common) {
        console.error(`❌ Missing 'common' section in common.json for locale: ${locale}`);
        hasErrors = true;
      } else {
        requiredCommonKeys.forEach(key => {
          if (!content.common[key]) {
            console.error(`❌ Missing required key 'common.${key}' in common.json for locale: ${locale}`);
            hasErrors = true;
          }
        });
        
        console.log(`✅ common.json verified for locale: ${locale}`);
      }
    } catch (e) {
      console.error(`❌ Failed to parse common.json for locale ${locale}:`, e.message);
      hasErrors = true;
    }
  }

  // Check PublicStoryPage.json critical CTA keys
  const publicStoryPagePath = path.join(messagesPath, 'PublicStoryPage.json');
  if (!fs.existsSync(publicStoryPagePath)) {
    console.error(`❌ Missing PublicStoryPage.json for locale: ${locale}`);
    hasErrors = true;
  } else {
    try {
      const content = JSON.parse(fs.readFileSync(publicStoryPagePath, 'utf8'));
      requiredPublicStoryPageKeys.forEach(keyPath => {
        if (getNested(content, keyPath) === undefined) {
          console.error(`❌ Missing required key '${keyPath}' in PublicStoryPage.json for locale: ${locale}`);
          hasErrors = true;
        }
      });
      if (!hasErrors) {
        console.log(`✅ PublicStoryPage.json critical keys present for locale: ${locale}`);
      }
    } catch (e) {
      console.error(`❌ Failed to parse PublicStoryPage.json for locale ${locale}:`, e.message);
      hasErrors = true;
    }
  }
  
  console.log(''); // Empty line for readability
});

if (hasErrors) {
  console.error('❌ Translation verification failed!');
  process.exit(1);
} else {
  console.log('✅ All translations verified successfully!');
}
