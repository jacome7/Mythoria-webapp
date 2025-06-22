const fs = require('fs');

try {
  const content = fs.readFileSync('./src/messages/en-US/common.json', 'utf8');
  console.log('File read successfully');
  
  const parsed = JSON.parse(content);
  console.log('JSON parsed successfully');
  
  console.log('Top-level keys:', Object.keys(parsed));
  
  if (parsed.common) {
    console.log('common object exists');
    console.log('Keys in common:', Object.keys(parsed.common));
    
    if (parsed.common.storyCounter) {
      console.log('✅ storyCounter found in common');
      console.log('storyCounter keys:', Object.keys(parsed.common.storyCounter));
    } else {
      console.log('❌ storyCounter NOT found in common');
      
      // Let's see if storyCounter exists at the root level
      if (parsed.storyCounter) {
        console.log('⚠️ storyCounter found at root level instead');
      }
      
      // Let's check a few lines before where storyCounter should be to see what's there
      const commonKeys = Object.keys(parsed.common);
      console.log('Last 10 keys in common:', commonKeys.slice(-10));
    }
  } else {
    console.log('❌ No common object found');
  }
} catch (error) {
  console.error('Error:', error.message);
}
