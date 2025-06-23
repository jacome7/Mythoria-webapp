'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '../../../components/AdminHeader';
import AdminFooter from '../../../components/AdminFooter';

interface PrintRequest {
  id: string;
  storyId: string;
  authorId: string;
  status: string;
  requestedAt: string;
  printedAt: string | null;
  updatedAt: string;
  pdfUrl: string;
  printingOptions: Record<string, unknown>;
  // Author info
  authorName: string;
  authorEmail: string;
  authorMobilePhone: string | null;
  // Shipping address info
  shippingCity: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  // Print provider info
  printProviderName: string;
  printProviderEmail: string;
  printProviderPhone: string | null;
  // Story info (if still exists)
  storyTitle: string | null;
  storySynopsis: string | null;
  storyTargetAudience: string | null;
  storyGraphicalStyle: string | null;
  storyChapterCount: number | null;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

interface PrintRequestsResponse {
  printRequests: PrintRequest[];
  pagination: PaginationData;
}

type SortField = 'requestedAt' | 'status' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function PrintRequestsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [printRequests, setPrintRequests] = useState<PrintRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('requestedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      }

      // Fetch print requests data if authorized
      fetchPrintRequests(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user, router, currentPage, searchTerm, sortField, sortOrder, statusFilter]);

  const fetchPrintRequests = async (page: number) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        ...(searchTerm && { search: searchTerm }),
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetch(`/api/admin/print-requests?${params.toString()}`);
      if (response.ok) {
        const data: PrintRequestsResponse = await response.json();
        setPrintRequests(data.printRequests);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch print requests');
      }
    } catch (error) {
      console.error('Error fetching print requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'requested': return 'badge-warning';
      case 'in_printing': return 'badge-info';
      case 'packing': return 'badge-primary';
      case 'shipped': return 'badge-accent';
      case 'delivered': return 'badge-success';
      case 'cancelled': return 'badge-error';
      case 'error': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Print Requests</h1>
            <p className="text-gray-600 mt-2">Manage all printing requests</p>
          </div>
          <div className="breadcrumbs text-sm">
            <ul>
              <li><Link href="/portaldegestao">Dashboard</Link></li>
              <li>Print Requests</li>
            </ul>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="form-control flex-1">
                <input
                  type="text"
                  placeholder="Search by author name, email, or city..."
                  className="input input-bordered w-full"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              
              {/* Status Filter */}
              <div className="form-control">
                <select 
                  className="select select-bordered"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="requested">Requested</option>
                  <option value="in_printing">In Printing</option>
                  <option value="packing">Packing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Print Requests Table */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="loading loading-spinner loading-lg"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th 
                          className="cursor-pointer hover:bg-base-200"
                          onClick={() => handleSort('requestedAt')}
                        >
                          Request Date 
                          {sortField === 'requestedAt' && (
                            <span className="ml-1">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          className="cursor-pointer hover:bg-base-200"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          {sortField === 'status' && (
                            <span className="ml-1">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th>Author Name</th>
                        <th>City</th>
                        <th>Story</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printRequests.map((request) => (
                        <tr 
                          key={request.id}
                          className="hover:bg-base-50 cursor-pointer"
                          onClick={() => router.push(`/portaldegestao/print-requests/${request.id}`)}
                        >
                          <td>{formatDate(request.requestedAt)}</td>
                          <td>
                            <div className={`badge ${getStatusBadgeColor(request.status)}`}>
                              {formatStatus(request.status)}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-bold">{request.authorName || 'Unknown'}</div>
                                <div className="text-sm opacity-50">{request.authorEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td>{request.shippingCity || 'N/A'}</td>
                          <td>
                            <div className="text-sm">
                              <div className="font-medium">{request.storyTitle || 'Story Deleted'}</div>
                              <div className="text-xs opacity-50">ID: {request.storyId.slice(0, 8)}...</div>
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/portaldegestao/print-requests/${request.id}`);
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="join">
                      <button 
                        className="join-item btn btn-sm"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const page = i + Math.max(1, currentPage - 2);
                        if (page > pagination.totalPages) return null;
                        
                        return (
                          <button
                            key={page}
                            className={`join-item btn btn-sm ${currentPage === page ? 'btn-active' : ''}`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        );
                      })}
                      
                      <button 
                        className="join-item btn btn-sm"
                        disabled={!pagination.hasNextPage}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {pagination && (
                  <div className="text-center text-sm text-gray-500 mt-4">
                    Showing {printRequests.length} of {pagination.totalCount} print requests
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <AdminFooter />
    </div>
  );
}
