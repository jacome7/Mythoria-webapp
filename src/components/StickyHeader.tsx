"use client";

import Header from "./Header";
import { usePathname } from "next/navigation";

// Matches routes to EXCLUDE from sticky header behavior
// Patterns account for the dynamic [locale] prefix and optional trailing segments
const excludedPatterns: RegExp[] = [
  // /[locale]/stories/read/[storyId] and optional /chapter/[chapterNumber]
  /^\/[^^/]+\/stories\/read\/[^/]+(?:\/chapter\/[^/]+)?(?:\/.*)?$/i,
  // /[locale]/stories/edit/[storyId]
  /^\/[^^/]+\/stories\/edit\/[^/]+(?:\/.*)?$/i,
  // /[locale]/p/[slug] and optional /chapter/[chapterNumber]
  /^\/[^^/]+\/p\/[^/]+(?:\/chapter\/[^/]+)?(?:\/.*)?$/i,
  // /[locale]/s/* (shared stories)
  /^\/[^^/]+\/s(?:\/.*)?$/i,
];

function isExcluded(pathname: string): boolean {
  return excludedPatterns.some((re) => re.test(pathname));
}

export default function StickyHeader() {
  const pathname = usePathname() || "/";
  const excluded = isExcluded(pathname);

  if (excluded) {
    return <Header />;
  }

  return (
    <div className="sticky top-0 z-50">
      <Header />
    </div>
  );
}
