'use client';

import { useState, useEffect, useMemo } from 'react';
import FaqSearch from './FaqSearch';
import FaqAccordion from './FaqAccordion';
import { useLocale, useTranslations } from 'next-intl';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

interface FaqEntry {
  id: string;
  title: string;
  contentMdx: string;
  questionSortOrder: number;
  sectionId: string;
  mdxSource: MDXRemoteSerializeResult;
}

interface FaqSection {
  id: string;
  sectionKey: string;
  defaultLabel: string;
  icon: string;
  sortOrder: number;
  entries: FaqEntry[];
}

interface FaqComponentProps {
  initialSection?: string | null;
  searchPlaceholder: string;
  allSectionsLabel: string;
  noResultsMessage: string;
  loadingMessage: string;
  errorMessage: string;
}

export default function FaqComponent({
  initialSection = null,
  searchPlaceholder,
  allSectionsLabel,
  noResultsMessage,
  loadingMessage,
  errorMessage,
}: FaqComponentProps) {
  const t = useTranslations('Faq');
  const locale = useLocale();
  const [sections, setSections] = useState<FaqSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  const getSectionTitle = (key: string, fallback: string) => {
    try {
      const translated = t(`sections.${key}` as any);
      return translated.startsWith('sections.') ? fallback : translated;
    } catch {
      return fallback;
    }
  };

  // Fetch FAQ data
  useEffect(() => {
    const fetchFaqData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ locale });
        if (initialSection) {
          params.append('section', initialSection);
        }

        const response = await fetch(`/api/faq?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch FAQ data');
        }

        const data = await response.json();
        setSections(data.sections || []);
      } catch (err) {
        console.error('Error fetching FAQ data:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFaqData();
  }, [locale, initialSection, errorMessage]);

  // Client-side filtering
  const filteredSections = useMemo(() => {
    let result = sections;

    // Filter by selected section
    if (selectedSection) {
      result = result.filter((section) => section.sectionKey === selectedSection);
    }

    // Filter by search query (case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result
        .map((section) => ({
          ...section,
          entries: section.entries.filter(
            (entry) =>
              entry.title.toLowerCase().includes(query) ||
              entry.contentMdx.toLowerCase().includes(query),
          ),
        }))
        .filter((section) => section.entries.length > 0);
    }

    return result;
  }, [sections, selectedSection, searchQuery]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="text-lg text-base-content/70 mt-4">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      <FaqSearch
        sections={sections.map((s) => ({
          sectionKey: s.sectionKey,
          defaultLabel: getSectionTitle(s.sectionKey, s.defaultLabel),
          icon: s.icon,
        }))}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={searchPlaceholder}
        allSectionsLabel={allSectionsLabel}
      />

      {filteredSections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/70">{noResultsMessage}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredSections.map((section) => {
            const isAllTopics = selectedSection === null;
            const isSearching = searchQuery.trim().length > 0;
            const shouldLimit = isAllTopics && !isSearching;
            const limit = 3;

            const displayedEntries = shouldLimit
              ? section.entries.slice(0, limit)
              : section.entries;
            const hasMore = shouldLimit && section.entries.length > limit;
            const sectionTitle = getSectionTitle(section.sectionKey, section.defaultLabel);

            return (
              <div key={section.id}>
                <FaqAccordion entries={displayedEntries} sectionTitle={sectionTitle} />
                {hasMore && (
                  <div className="mt-2 pl-5">
                    <button
                      onClick={() => {
                        setSelectedSection(section.sectionKey);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                    >
                      {t('viewAllInSection', {
                        count: section.entries.length,
                        section: sectionTitle,
                      })}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
