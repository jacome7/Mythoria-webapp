// Shared reading time utility for blog content
// Counts words after stripping common MDX/Markdown syntax and divides by 200 wpm

export function calculateReadingTimeFromMdx(contentMdx: string): number {
  const wordsPerMinute = 200;
  // Remove MDX/Markdown syntax for word count: headings, emphasis, code ticks, images, links
  const clean = contentMdx
    // Strip fenced code blocks (keep code words minimal impact)
    .replace(/```[\s\S]*?```/g, ' ')
    // Strip images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Strip links [text](url) -> keep text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip inline code backticks
    .replace(/`([^`]*)`/g, '$1')
    // Strip MD headings and asterisks
    .replace(/[#*_>]+/g, ' ')
    // Collapse HTML tags if any
    .replace(/<[^>]+>/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean ? clean.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
