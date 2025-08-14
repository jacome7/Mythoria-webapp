'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { CHARACTER_TYPE_GROUPS, findCharacterTypeGroup, getCharacterTypeLabel } from '@/types/character-types';
import { useTranslations } from 'next-intl';

interface GroupedCharacterTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function GroupedCharacterTypeSelect({
  value,
  onChange,
  placeholder = "Select character type...",
  className = ""
}: GroupedCharacterTypeSelectProps) {
  const tComponentsGroupedCharacterTypeSelect = useTranslations('components.groupedCharacterTypeSelect');
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getGroupLabel = (groupKey: string) => {
    return tComponentsGroupedCharacterTypeSelect(`groups.${groupKey}`);
  };

  const getDisplayPlaceholder = () => {
    return placeholder === "Select character type..." ? tComponentsGroupedCharacterTypeSelect('placeholder') : placeholder;
  };

  // Initialize expanded groups based on current value or default to 'human'
  useEffect(() => {
    if (value) {
      const group = findCharacterTypeGroup(value);
      if (group) {
        setExpandedGroups(prev => ({ ...prev, [group.key]: true }));
      }
    } else {
      // Default to expanding 'human' group for first-time editing
      setExpandedGroups(prev => ({ ...prev, 'human': true }));
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const displayValue = value ? getCharacterTypeLabel(value) : getDisplayPlaceholder();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {displayValue}
        </span>
        <FiChevronDown 
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {CHARACTER_TYPE_GROUPS.map((group) => (
            <div key={group.key} className="border-b border-gray-100 last:border-b-0">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              >
                <span>{getGroupLabel(group.key)}</span>
                {expandedGroups[group.key] ? (
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {/* Group Options */}
              {expandedGroups[group.key] && (
                <div className="bg-white">
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleOptionSelect(option.value)}
                      className={`w-full text-left px-6 py-2 text-sm hover:bg-blue-50 focus:outline-none focus:bg-blue-50 ${
                        value === option.value 
                          ? 'bg-blue-100 text-blue-900 font-medium' 
                          : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
