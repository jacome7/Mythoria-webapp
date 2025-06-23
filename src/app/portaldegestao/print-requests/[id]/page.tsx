'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '../../../../components/AdminHeader';
import AdminFooter from '../../../../components/AdminFooter';

interface PrintRequestDetail {
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

export default function PrintRequestDetailPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const params = useParams();
  const printRequestId = params.id as string;
  
  const [printRequest, setPrintRequest] = useState<PrintRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

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

      // Fetch print request data if authorized
      fetchPrintRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user, router, printRequestId]);

  const fetchPrintRequest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/print-requests/${printRequestId}`);
      if (response.ok) {
        const data = await response.json();
        setPrintRequest(data.printRequest);
        setNewStatus(data.printRequest.status);
      } else {
        console.error('Failed to fetch print request');
        router.push('/portaldegestao/print-requests');
      }
    } catch (error) {
      console.error('Error fetching print request:', error);
      router.push('/portaldegestao/print-requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!printRequest || newStatus === printRequest.status) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/admin/print-requests/${printRequestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh the data
        await fetchPrintRequest();
        alert('Status updated successfully!');
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const formatTargetAudience = (audience: string | null) => {
    if (!audience) return 'N/A';
    return audience.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatGraphicalStyle = (style: string | null) => {
    if (!style) return 'N/A';
    return style.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Show loading state while checking authentication
  if (!isLoaded || isLoading) {
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

  if (!printRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Print Request Not Found</h2>
          <Link href="/portaldegestao/print-requests" className="btn btn-primary">
            Back to Print Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Print Request Details</h1>
            <p className="text-gray-600 mt-2">ID: {printRequest.id}</p>
          </div>
          <div className="breadcrumbs text-sm">
            <ul>
              <li><Link href="/portaldegestao">Dashboard</Link></li>
              <li><Link href="/portaldegestao/print-requests">Print Requests</Link></li>
              <li>Details</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Status</label>
                  <div className="mt-1">
                    <div className={`badge ${getStatusBadgeColor(printRequest.status)} badge-lg`}>
                      {formatStatus(printRequest.status)}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested At</label>
                  <p className="text-lg">{formatDate(printRequest.requestedAt)}</p>
                </div>
                {printRequest.printedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Printed At</label>
                    <p className="text-lg">{formatDate(printRequest.printedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Customer</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Author Name</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{printRequest.authorName || 'Unknown'}</span>
                    <Link 
                      href={`/portaldegestao/users?search=${encodeURIComponent(printRequest.authorEmail)}`}
                      className="btn btn-xs btn-outline"
                    >
                      View User
                    </Link>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Author Email</label>
                  <p className="text-lg">{printRequest.authorEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Mobile Phone</label>
                  <p className="text-lg">{printRequest.authorMobilePhone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Story Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Story</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Title</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{printRequest.storyTitle || 'Story Deleted'}</span>
                    {printRequest.storyTitle && (
                      <Link 
                        href={`/portaldegestao/stories?search=${encodeURIComponent(printRequest.storyTitle)}`}
                        className="btn btn-xs btn-outline"
                      >
                        View Story
                      </Link>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">PDF Document</label>
                  <div className="mt-1">
                    <a 
                      href={printRequest.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                </div>
                {printRequest.storySynopsis && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Synopsis</label>
                    <p className="text-sm">{printRequest.storySynopsis}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">Target Audience</label>
                  <p className="text-lg">{formatTargetAudience(printRequest.storyTargetAudience)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Graphical Style</label>
                  <p className="text-lg">{formatGraphicalStyle(printRequest.storyGraphicalStyle)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Chapter Count</label>
                  <p className="text-lg">{printRequest.storyChapterCount || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Print Provider Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Print Provider</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg">{printRequest.printProviderName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email Address</label>
                  <p className="text-lg">{printRequest.printProviderEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone Number</label>
                  <p className="text-lg">{printRequest.printProviderPhone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="card bg-base-100 shadow-xl lg:col-span-2">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Address Line 1</label>
                  <p className="text-lg">{printRequest.shippingLine1 || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Address Line 2</label>
                  <p className="text-lg">{printRequest.shippingLine2 || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Postal Code</label>
                  <p className="text-lg">{printRequest.shippingPostalCode || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">City</label>
                  <p className="text-lg">{printRequest.shippingCity || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Country</label>
                  <p className="text-lg">{printRequest.shippingCountry || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Update Status Section */}
          <div className="card bg-base-100 shadow-xl lg:col-span-2">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Update Status</h2>
              <div className="flex items-center space-x-4">
                <div className="form-control flex-1 max-w-xs">
                  <select 
                    className="select select-bordered"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="requested">Requested</option>
                    <option value="in_printing">In Printing</option>
                    <option value="packing">Packing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <button
                  className={`btn btn-primary ${isUpdating ? 'loading' : ''}`}
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || newStatus === printRequest.status}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Last updated: {formatDate(printRequest.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link href="/portaldegestao/print-requests" className="btn btn-outline">
            ← Back to Print Requests
          </Link>
        </div>
      </main>
      <AdminFooter />
    </div>
  );
}
