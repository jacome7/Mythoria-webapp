'use client';

import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { MDXRemote } from 'next-mdx-remote';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { mdxComponents } from '@/lib/blog/mdx-components';

interface FaqEntry {
  id: string;
  title: string;
  contentMdx: string;
  questionSortOrder: number;
  mdxSource: MDXRemoteSerializeResult;
}

interface FaqAccordionProps {
  entries: FaqEntry[];
  sectionTitle?: string;
}

export default function FaqAccordion({ entries, sectionTitle }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleEntry = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {sectionTitle && <h3 className="text-xl font-semibold mb-4">{sectionTitle}</h3>}
      {entries.map((entry) => {
        const isOpen = openId === entry.id;
        return (
          <div
            key={entry.id}
            className={`border border-base-300 rounded-box overflow-hidden transition-all duration-300 ${
              isOpen ? 'shadow-lg' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggleEntry(entry.id)}
              className="w-full flex items-start gap-3 px-5 py-4 text-left focus:outline-none bg-base-200 hover:bg-base-300 transition-colors duration-300"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${entry.id}`}
            >
              <span className="flex-1 font-medium text-base-content">{entry.title}</span>
              <FaChevronDown
                className={`mt-1 text-primary transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden bg-base-100">
                <div id={`faq-panel-${entry.id}`} className="px-5 py-5 border-t border-base-300">
                  <div className="prose prose-sm max-w-none text-base-content/80">
                    <MDXRemote {...entry.mdxSource} components={mdxComponents} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
