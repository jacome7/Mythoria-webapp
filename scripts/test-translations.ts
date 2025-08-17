import header from '../src/messages/en-US/Header.json';
import footer from '../src/messages/en-US/Footer.json';
import share from '../src/messages/en-US/Share.json';
import myStories from '../src/messages/en-US/MyStoriesPage.json';
import getInspired from '../src/messages/en-US/GetInspiredPage.json';

function ns(obj: Record<string, unknown>, namespace: string) {
  return Object.prototype.hasOwnProperty.call(obj, namespace)
    ? obj
    : { [namespace]: obj } as Record<string, unknown>;
}

function main() {
  const messages = {
    ...ns(header as any, 'Header'),
    ...ns(footer as any, 'Footer'),
    ...ns(share as any, 'Share'),
    ...ns(myStories as any, 'MyStoriesPage'),
    ...ns(getInspired as any, 'GetInspiredPage'),
  } as Record<string, any>;

  const checks = ['MyStoriesPage', 'GetInspiredPage', 'Header', 'Share'];
  for (const key of checks) {
    if (messages[key] == null) {
      console.error(`[FAIL] Missing namespace: ${key}`);
      process.exitCode = 1;
    } else {
      console.log(`[OK] ${key} present`);
    }
  }
  // Spot check a value
  const myStoriesNs = messages['MyStoriesPage'] as any;
  if (myStoriesNs && myStoriesNs.title) {
    console.log(`[OK] MyStoriesPage.title = ${myStoriesNs.title}`);
  } else {
    console.error('[FAIL] MyStoriesPage.title missing');
    process.exitCode = 1;
  }
}

main();
