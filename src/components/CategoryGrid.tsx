'use client';

import { useTranslations } from 'next-intl';
import {
  FaBug,
  FaCogs,
  FaTruck,
  FaCoins,
  FaComments,
  FaLightbulb,
  FaHandshake,
} from 'react-icons/fa';

interface CategoryGridProps {
  onCategoryClick: (category: string) => void;
}

const CategoryGrid = ({ onCategoryClick }: CategoryGridProps) => {
  const tContactUsPage = useTranslations('ContactUsPage');

  const categories = [
    {
      key: 'feature_ideas',
      icon: FaLightbulb,
      color: 'text-warning',
      label: tContactUsPage('categories.featureIdeas'),
    },
    {
      key: 'bug_report',
      icon: FaBug,
      color: 'text-error',
      label: tContactUsPage('categories.reportBug'),
    },
    {
      key: 'technical_issues',
      icon: FaCogs,
      color: 'text-info',
      label: tContactUsPage('categories.troubles'),
    },
    {
      key: 'delivery',
      icon: FaTruck,
      color: 'text-success',
      label: tContactUsPage('categories.delivery'),
    },
    {
      key: 'credits',
      icon: FaCoins,
      color: 'text-accent',
      label: tContactUsPage('categories.credits'),
    },
    {
      key: 'business_partnership',
      icon: FaHandshake,
      color: 'text-secondary',
      label: tContactUsPage('categories.businessPartnership'),
    },
    {
      key: 'general',
      icon: FaComments,
      color: 'text-primary',
      label: tContactUsPage('categories.general'),
    },
  ];

  const handleCategoryClick = (categoryKey: string) => {
    onCategoryClick(categoryKey);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {categories.map((category) => {
        const IconComponent = category.icon;
        return (
          <div
            key={category.key}
            onClick={() => handleCategoryClick(category.key)}
            className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors cursor-pointer hover:scale-105 transform duration-200"
          >
            <IconComponent className={`${category.color} text-lg`} />
            <span className="text-sm">{category.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryGrid;
