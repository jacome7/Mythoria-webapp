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
  FiBook,
  FiPrinter,
  FiMoreVertical
} from 'react-icons/fi';
import { trackStoryManagement } from '../lib/analytics';
import ShareModal from './ShareModal';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  storyGenerationStatus?: 'queued' | 'running' | 'failed' | 'completed' | 'cancelled' | null;
  storyGenerationCompletedPercentage?: number;
  isPublic?: boolean;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'title' | 'createdAt' | 'updatedAt' | 'status';
type SortDirection = 'asc' | 'desc';

export default function MyStoriesTable() {
  const t = useTranslations('MyStoriesPage');
  const tShare = useTranslations('common.Share');
  const tActions = useTranslations('common.Actions');
  const locale = useLocale();const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [storyToShare, setStoryToShare] = useState<Story | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{top: number, right: number} | null>(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  useEffect(() => {
    fetchStories();
  }, []);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openActionMenu && 
          !target.closest('.relative') && 
          !target.closest('[data-story-menu]') &&
          !target.closest('.fixed')) {
        setOpenActionMenu(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenu]);

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
        // Track story deletion
        trackStoryManagement.deleted({
          story_id: storyToDelete.storyId,
          story_title: storyToDelete.title,
          story_status: storyToDelete.status
        });
        
        setStories(stories.filter(s => s.storyId !== storyToDelete.storyId));
        setDeleteModalOpen(false);
        setStoryToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };  const handleShare = (story: Story) => {
    setStoryToShare(story);
    setShareModalOpen(true);
  };

  const handlePrint = (story: Story) => {
    // Navigate to the print order page
    window.location.href = `/${locale}/stories/print/${story.storyId}`;
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
    
    if (isMobile) {
      // Mobile format: "Jun 17" (no year, no time)
      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric'
      });
    }
    
    // Desktop format: M/D/YY
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
      queued: { text: t('table.status.queued'), class: 'badge-info', icon: '⏳' },
      running: { text: t('table.status.running'), class: 'badge-warning', icon: '🔄' },
      completed: { text: t('table.status.completed'), class: 'badge-success', icon: '✅' },
      failed: { text: t('table.status.failed'), class: 'badge-error', icon: '❌' },
      cancelled: { text: t('table.status.cancelled'), class: 'badge-neutral', icon: '⏹️' },
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
        <><div className="overflow-x-auto overflow-y-visible">
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
                  <th className="text-right px-2 py-1 md:px-4 md:py-2">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedStories.map((story) => (<tr key={story.storyId}>
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
                    <td className="px-2 py-1 md:px-4 md:py-2 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`${getStatusBadgeClass(story.status)} badge-sm text-xs whitespace-nowrap`}>
                          {t(`status.${story.status}`)}
                        </span>
                        {(() => {
                          const genStatus = getGenerationStatusInfo(story);
                          if (genStatus && story.status === 'writing') {
                            return (
                              <div className="flex flex-col space-y-1">
                                <span className={`badge badge-xs ${genStatus.class} whitespace-nowrap`}>
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
                      {/* Desktop Actions - Hidden on Mobile */}
                      <div className="hidden md:flex justify-end gap-0.5">
                        {story.status === 'published' && (
                          <Link
                            href={`/${locale}/stories/${story.storyId}`}
                            className="btn btn-ghost btn-sm text-primary hover:bg-primary hover:text-primary-content"
                            title="Read Story"
                          >
                            <FiBook className="w-4 h-4" />
                          </Link>
                        )}
                        {story.status === 'writing' ? (
                          <button
                            className="btn btn-ghost btn-sm btn-disabled"
                            disabled
                            title={tShare('tooltips.cannotShareWriting')}
                          >
                            <FiShare2 className="w-4 h-4" />
                          </button>
                        ) : story.status === 'draft' ? (
                          <button
                            className="btn btn-ghost btn-sm btn-disabled"
                            disabled
                            title={tShare('tooltips.cannotShareDraft')}
                          >
                            <FiShare2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleShare(story)}
                            title={t('actions.share')}
                          >
                            <FiShare2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Print button - only for published stories */}
                        {story.status === 'published' ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handlePrint(story)}
                            title={t('actions.print')}
                          >
                            <FiPrinter className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm btn-disabled"
                            disabled
                            title={t('actions.printNotAvailable')}
                          >
                            <FiPrinter className="w-4 h-4" />
                          </button>
                        )}
                        {story.status === 'writing' ? (
                          <button
                            className="btn btn-ghost btn-sm btn-disabled"
                            disabled
                            title="Cannot edit story while it's being written"
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </button>
                        ) : story.status === 'draft' ? (
                          <Link
                            href={`/${locale}/tell-your-story/step-3?edit=${story.storyId}`}
                            className="btn btn-ghost btn-sm"
                            title={t('actions.edit')}
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </Link>
                        ) : (
                          <Link
                            href={`/${locale}/stories/edit/${story.storyId}`}
                            className="btn btn-ghost btn-sm"
                            title={t('actions.edit')}
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          className="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content"
                          onClick={() => handleDeleteClick(story)}
                          title={t('actions.delete')}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Mobile Actions - Dropdown Menu */}
                      <div className="md:hidden relative">
                        <button
                          className="btn btn-ghost btn-sm"
                          data-story-menu={story.storyId}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + 4,
                              right: window.innerWidth - rect.right
                            });
                            setOpenActionMenu(openActionMenu === story.storyId ? null : story.storyId);
                          }}
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>
                        {openActionMenu === story.storyId && menuPosition && (
                          <div 
                            className="fixed z-[9999] bg-base-100 border border-base-300 rounded-lg shadow-xl min-w-48"
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`
                            }}
                          >
                            <div className="p-2 space-y-1">
                              {story.status === 'published' && (<Link
                                  href={`/${locale}/stories/${story.storyId}`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                                  onClick={() => setOpenActionMenu(null)}
                                >
                                  <FiBook className="w-4 h-4" />
                                  {tActions('read')}
                                </Link>
                              )}
                              
                              {story.status === 'published' ? (
                                <button
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md w-full text-left"
                                  onClick={() => {
                                    handleShare(story);
                                    setOpenActionMenu(null);
                                    setMenuPosition(null);
                                  }}
                                >
                                  <FiShare2 className="w-4 h-4" />
                                  {t('actions.share')}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                                  <FiShare2 className="w-4 h-4" />
                                  {t('actions.share')}
                                </div>
                              )}
                              
                              {story.status === 'published' ? (
                                <button
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md w-full text-left"
                                  onClick={() => {
                                    handlePrint(story);
                                    setOpenActionMenu(null);
                                    setMenuPosition(null);
                                  }}
                                >
                                  <FiPrinter className="w-4 h-4" />
                                  {t('actions.print')}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                                  <FiPrinter className="w-4 h-4" />
                                  {t('actions.print')}
                                </div>
                              )}
                              
                              {story.status === 'writing' ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                                  <FiEdit3 className="w-4 h-4" />
                                  {t('actions.edit')}
                                </div>
                              ) : story.status === 'draft' ? (
                                <Link
                                  href={`/${locale}/tell-your-story/step-3?edit=${story.storyId}`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                                  onClick={() => {
                                    setOpenActionMenu(null);
                                    setMenuPosition(null);
                                  }}
                                >
                                  <FiEdit3 className="w-4 h-4" />
                                  {t('actions.edit')}
                                </Link>
                              ) : (
                                <Link
                                  href={`/${locale}/stories/edit/${story.storyId}`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                                  onClick={() => {
                                    setOpenActionMenu(null);
                                    setMenuPosition(null);
                                  }}
                                >
                                  <FiEdit3 className="w-4 h-4" />
                                  {t('actions.edit')}
                                </Link>
                              )}
                              
                              <div className="border-t border-base-300 my-1"></div>
                              
                              <button
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-error hover:text-error-content rounded-md w-full text-left text-error"
                                onClick={() => {
                                  handleDeleteClick(story);
                                  setOpenActionMenu(null);
                                  setMenuPosition(null);
                                }}
                              >
                                <FiTrash2 className="w-4 h-4" />
                                {t('actions.delete')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>))}
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
      )}      {/* Share Modal */}
      {storyToShare && storyToShare.storyId && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setStoryToShare(null);
          }}
          storyId={storyToShare.storyId}
          storyTitle={storyToShare.title}
          isPublic={storyToShare.isPublic}
          slug={storyToShare.slug}
          onShareSuccess={(shareData) => {
            console.log('Share successful:', shareData);
            // Refresh stories to get updated isPublic status
            const fetchStories = async () => {
              try {
                const response = await fetch('/api/my-stories');
                if (response.ok) {
                  const data = await response.json();
                  setStories(data.stories);
                  
                  // Update storyToShare if it exists to keep it in sync
                  if (storyToShare) {
                    const updatedStory = data.stories.find((s: Story) => s.storyId === storyToShare.storyId);
                    if (updatedStory) {
                      setStoryToShare(updatedStory);
                    }
                  }
                }
              } catch (error) {
                console.error('Error refreshing stories:', error);
              }
            };
            fetchStories();
          }}
        />
      )}
    </div>
  );
}
