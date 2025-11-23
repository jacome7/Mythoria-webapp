'use client';

import { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

interface FaqSection {
  sectionKey: string;
  defaultLabel: string;
  icon: string;
}

interface FaqSearchProps {
  sections: FaqSection[];
  selectedSection: string | null;
  onSectionChange: (sectionKey: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder: string;
  allSectionsLabel: string;
}

export default function FaqSearch({
  sections,
  selectedSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  allSectionsLabel,
}: FaqSearchProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  const handleClearSearch = () => {
    setLocalQuery('');
    onSearchChange('');
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Search Input */}
      <div className="form-control">
        <div className="relative">
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="input input-bordered w-full pl-10 pr-10"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          {localQuery && (
            <button
              onClick={handleClearSearch}
              className="btn btn-ghost btn-sm btn-circle absolute right-2 top-1/2 -translate-y-1/2"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSectionChange(null)}
          className={`btn btn-sm ${!selectedSection ? 'btn-primary' : 'btn-outline'}`}
        >
          {allSectionsLabel}
        </button>
        {sections.map((section) => (
          <button
            key={section.sectionKey}
            onClick={() => onSectionChange(section.sectionKey)}
            className={`btn btn-sm ${selectedSection === section.sectionKey ? 'btn-primary' : 'btn-outline'}`}
          >
            {section.icon && <span className="mr-1">{section.icon}</span>}
            {section.defaultLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
