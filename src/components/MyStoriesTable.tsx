'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { 
  FiEdit3, 
  FiTrash2, 
  FiShare2,
  FiChevronUp,
  FiChevronDown,
  FiBook
} from 'react-icons/fi';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  storyGenerationStatus?: 'queued' | 'running' | 'failed' | 'completed' | 'cancelled' | null;
  storyGenerationCompletedPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'title' | 'createdAt' | 'updatedAt' | 'status';
type SortDirection = 'asc' | 'desc';

export default function MyStoriesTable() {
  const t = useTranslations('MyStoriesPage');
  const locale = useLocale();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/my-stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (story: Story) => {
    setStoryToDelete(story);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!storyToDelete) return;

    try {
      const response = await fetch(`/api/my-stories/${storyToDelete.storyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStories(stories.filter(s => s.storyId !== storyToDelete.storyId));
        setDeleteModalOpen(false);
        setStoryToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };
  const handleShare = async (story: Story) => {
    // Simple share functionality - copy link to clipboard
    const shareUrl = `${window.location.origin}/stories/${story.storyId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      alert('Story link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };
  // Filtering and sorting functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <FiChevronUp className="w-4 h-4 inline ml-1" /> : 
      <FiChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Sorted stories
  const sortedStories = useMemo(() => {
    const sorted = [...stories];

    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [stories, sortField, sortDirection]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Shorter date format: M/D/YY
    return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
  };
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'badge badge-secondary';
      case 'writing':
        return 'badge badge-warning';
      case 'published':
        return 'badge badge-success';
      default:
        return 'badge badge-ghost';
    }
  };

  const getGenerationStatusInfo = (story: Story) => {
    if (!story.storyGenerationStatus) {
      return null;
    }

    const statusMap = {
      'queued': { text: 'Queued', class: 'badge-info', icon: '⏳' },
      'running': { text: 'Generating', class: 'badge-warning', icon: '🔄' },
      'completed': { text: 'Completed', class: 'badge-success', icon: '✅' },
      'failed': { text: 'Failed', class: 'badge-error', icon: '❌' },
      'cancelled': { text: 'Cancelled', class: 'badge-neutral', icon: '⏹️' },
    };

    const statusInfo = statusMap[story.storyGenerationStatus];
    
    return {
      ...statusInfo,
      percentage: story.storyGenerationCompletedPercentage || 0
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }  return (
    <div className="space-y-6">
      {/* Stories Content */}
      {stories.length === 0 ? (
        <div className="text-center py-16 bg-base-200 rounded-lg">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-2xl font-semibold text-base-content">
              {t('noStories.title')}
            </h2>
            <p className="text-base-content/70">
              {t('noStories.subtitle')}
            </p>
            <Link href="/tell-your-story/step-1" className="btn btn-primary btn-lg">
              {t('noStories.action')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th className="px-2 py-1 md:px-4 md:py-2">
                    <button
                      className="btn btn-ghost btn-sm p-0 h-auto font-medium text-left justify-start"
                      onClick={() => handleSort('createdAt')}
                    >
                      {t('table.date')}
                      {getSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="px-2 py-1 md:px-4 md:py-2">
                    <button
                      className="btn btn-ghost btn-sm p-0 h-auto font-medium text-left justify-start"
                      onClick={() => handleSort('title')}
                    >
                      {t('table.title')}
                      {getSortIcon('title')}
                    </button>
                  </th>
                  <th className="px-2 py-1 md:px-4 md:py-2">
                    <button
                      className="btn btn-ghost btn-sm p-0 h-auto font-medium text-left justify-start"
                      onClick={() => handleSort('status')}
                    >
                      {t('table.status')}
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="text-center px-2 py-1 md:px-4 md:py-2">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedStories.map((story) => (
                  <tr key={story.storyId}>
                    <td className="px-2 py-1 md:px-4 md:py-2">{formatDate(story.createdAt)}</td>
                    <td className="font-medium px-2 py-1 md:px-4 md:py-2">
                      {story.status === 'published' ? (
                        <Link 
                          href={`/${locale}/stories/${story.storyId}`}
                          className="text-primary hover:text-primary-focus hover:underline cursor-pointer"
                        >
                          {story.title}
                        </Link>
                      ) : (
                        <span>{story.title}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 md:px-4 md:py-2">
                      <div className="space-y-1">
                        <span className={getStatusBadgeClass(story.status)}>
                          {t(`status.${story.status}`)}
                        </span>
                        {(() => {
                          const genStatus = getGenerationStatusInfo(story);
                          if (genStatus && story.status === 'writing') {
                            return (
                              <div className="flex flex-col space-y-1">
                                <span className={`badge badge-xs ${genStatus.class}`}>
                                  {genStatus.icon} {genStatus.text}
                                </span>
                                {genStatus.percentage > 0 && genStatus.text === 'Generating' && (
                                  <div className="w-full">
                                    <progress 
                                      className="progress progress-primary w-full h-2" 
                                      value={genStatus.percentage} 
                                      max="100"
                                    ></progress>
                                    <span className="text-xs text-gray-500">{genStatus.percentage}%</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="pl-2 pr-1 py-1 md:px-4 md:py-2">
                      <div className="flex justify-center gap-0.5">
                        {story.status === 'published' && (
                          <Link
                            href={`/${locale}/stories/${story.storyId}`}
                            className="btn btn-ghost btn-sm text-primary hover:bg-primary hover:text-primary-content"
                            title="Read Story"
                          >
                            <FiBook className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleShare(story)}
                          title={t('actions.share')}
                        >
                          <FiShare2 className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/tell-your-story?edit=${story.storyId}`}
                          className="btn btn-ghost btn-sm"
                          title={t('actions.edit')}
                        >
                          <FiEdit3 className="w-4 h-4" />
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content"
                          onClick={() => handleDeleteClick(story)}
                          title={t('actions.delete')}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{t('deleteConfirm.title')}</h3>
            <p className="py-4">{t('deleteConfirm.message')}</p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteModalOpen(false)}
              >
                {t('deleteConfirm.cancel')}
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteConfirm}
              >
                {t('deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
