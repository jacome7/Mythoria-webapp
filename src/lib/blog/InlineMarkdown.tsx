import React from 'react';

type InlineMarkdownProps = {
  text: string;
  className?: string;
};

// Very small, safe inline Markdown renderer: supports **bold** and *italic* (and __/_ ) only.
// 1) Escape HTML to prevent injection
// 2) Replace markdown markers with <strong>/<em>
// 3) Convert newlines to <br/>
export default function InlineMarkdown({ text, className }: InlineMarkdownProps) {
  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const toHtml = (input: string) => {
    // Escape any HTML first
    let html = escapeHtml(input);

    // Links: [text](url "optional title")
    // - Whitelist protocols: http(s), mailto, tel; allow relative paths and anchors
    // - Open external http(s) in new tab with safe rel attributes
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_match, linkText: string, rawUrl: string, title?: string) => {
      const url = (rawUrl || '').trim();
      const lower = url.toLowerCase();
      const isRelative = url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || url.startsWith('#');
      const isHttp = lower.startsWith('http://') || lower.startsWith('https://');
      const isMailToOrTel = lower.startsWith('mailto:') || lower.startsWith('tel:');

      // Disallow potentially dangerous schemes (e.g., javascript:, data:)
      if (!(isRelative || isHttp || isMailToOrTel)) {
        return linkText; // degrade gracefully: show text without link
      }

      const target = isHttp ? ' target="_blank"' : '';
      const rel = isHttp ? ' rel="nofollow noreferrer noopener"' : '';
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${url}"${target}${rel}${titleAttr}>${linkText}</a>`;
    });

    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)([^\s][^*_/]*?)\1/g, '<em>$2</em>');

    // Newlines -> <br/>
    html = html.replace(/\r?\n/g, '<br/>');
    return html;
  };

  const html = toHtml(text || '');

  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
