'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../../components/AdminHeader';
import AdminFooter from '../../../components/AdminFooter';

interface Story {
  storyId: string;
  title: string;
  authorName: string;
  status: string;
  createdAt: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

interface StoriesResponse {
  stories: Story[];
  pagination: PaginationData;
}

type SortField = 'title' | 'authorName' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export default function StoriesPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    if (isLoaded) {
      // Check if user is signed in
      if (!isSignedIn) {
        router.push('/');
        return;
      }

      // Check if user has the required metadata
      const publicMetadata = user?.publicMetadata as { [key: string]: string } | undefined;
      if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
        router.push('/');
        return;
      }      // Fetch stories data if authorized
      fetchStories(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user, router, currentPage, searchTerm, sortField, sortOrder]);

  const fetchStories = async (page: number) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        ...(searchTerm && { search: searchTerm }),
        sortBy: sortField,
        sortOrder: sortOrder,
      });
      
      const response = await fetch(`/api/admin/stories?${params.toString()}`);
      if (response.ok) {
        const data: StoriesResponse = await response.json();
        setStories(data.stories);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch stories');
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default desc order
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortOrder === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="badge badge-warning">Draft</span>
        );
      case 'writing':
        return (
          <span className="badge badge-info">Writing</span>
        );
      case 'published':
        return (
          <span className="badge badge-success">Published</span>
        );
      default:
        return (
          <span className="badge badge-neutral">{status}</span>
        );
    }
  };
  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // Don't render content if not authorized
  if (!isSignedIn || !user?.publicMetadata || (user.publicMetadata as { [key: string]: string })['autorizaçãoDeAcesso'] !== 'Comejá') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Stories</h1>
        
        {/* Search Component */}
        <div className="mb-6 max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="input input-bordered w-full pl-10 pr-4"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : (
          <>
            {/* Stories Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="table w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th 
                      className="text-left cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Name</span>
                        {getSortIcon('title')}
                      </div>
                    </th>
                    <th 
                      className="text-left cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('authorName')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Author Name</span>
                        {getSortIcon('authorName')}
                      </div>
                    </th>
                    <th 
                      className="text-left cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Created At</span>
                        {getSortIcon('createdAt')}
                      </div>
                    </th>
                    <th 
                      className="text-left cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Status</span>
                        {getSortIcon('status')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stories.map((story) => (
                    <tr key={story.storyId} className="hover:bg-gray-50">
                      <td className="font-medium">{story.title}</td>
                      <td>{story.authorName}</td>
                      <td>{formatDate(story.createdAt)}</td>
                      <td>{formatStatus(story.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>              
              
              {stories.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? `No stories found matching "${searchTerm}".` : 'No stories found.'}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {(() => {
                    const pages = [];
                    const { currentPage: current, totalPages } = pagination;                    const maxVisiblePages = 7;
                    let startPage = Math.max(1, current - Math.floor(maxVisiblePages / 2));
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    if (startPage > 1) {
                      pages.push(
                        <button key={1} onClick={() => handlePageChange(1)} className="btn btn-outline btn-sm">
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`btn btn-sm ${
                            i === current ? 'btn-primary' : 'btn-outline'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                      }
                      pages.push(
                        <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="btn btn-outline btn-sm">
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            )}
            
            {/* Pagination Info */}
            {pagination && (              <div className="text-center mt-4 text-gray-600">
                Showing {stories.length} of {pagination.totalCount} stories
                {searchTerm && <span> matching &quot;{searchTerm}&quot;</span>}
                {pagination.totalPages > 1 && (
                  <span> (Page {pagination.currentPage} of {pagination.totalPages})</span>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <AdminFooter />
    </div>
  );
}
