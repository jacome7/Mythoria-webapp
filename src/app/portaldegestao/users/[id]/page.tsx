'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import AdminHeader from '../../../../components/AdminHeader';
import AdminFooter from '../../../../components/AdminFooter';

interface CreditHistoryEntry {
  id: string;
  amount: number;
  creditEventType: string;
  createdAt: string;
  storyId: string | null;
  purchaseId: string | null;
  balanceAfter: number;
}

interface Address {
  addressId: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  stateRegion: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  createdAt: string;
}

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  plotDescription: string | null;
  synopsis: string | null;
  place: string | null;
  targetAudience: string | null;
  novelStyle: string | null;  graphicalStyle: string | null;
  features: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface AuthorDetails {
  authorId: string;
  clerkUserId: string;
  displayName: string;
  email: string;
  fiscalNumber: string | null;
  mobilePhone: string | null;
  lastLoginAt: string | null;
  preferredLocale: string | null;
  createdAt: string;
  credits: number;
}

interface UserDetailsResponse {
  author: AuthorDetails;
  stories: Story[];
  addresses: Address[];
}

export default function UserDetailsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const params = useParams();  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [isAddingCredits, setIsAddingCredits] = useState(false);  const [creditsAmount, setCreditsAmount] = useState<number>(0);
  const [creditsReason, setCreditsReason] = useState<'refund' | 'voucher' | 'promotion'>('voucher');
  const [showCreditHistoryModal, setShowCreditHistoryModal] = useState(false);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([]);

  const fetchUserDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${params.id}`);
      
      if (response.ok) {
        const data: UserDetailsResponse = await response.json();
        setUserDetails(data);
      } else if (response.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to fetch user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('An error occurred while fetching user details');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);
  const fetchCreditHistory = useCallback(async () => {
    if (!params.id) return;
    
    try {
      const response = await fetch(`/api/admin/users/${params.id}/credits`);
      
      if (response.ok) {
        const data = await response.json();
        setCreditHistory(data.creditHistory || data); // Handle both new and old API formats
      } else {
        console.error('Failed to fetch credit history:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching credit history:', error);
    }
  }, [params.id]);

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

      // Fetch user details if authorized
      fetchUserDetails();
    }
  }, [isLoaded, isSignedIn, user, router, fetchUserDetails]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleDeleteUser = async () => {
    //if (!userDetails) return;
    console.log('Deleting user:', params.id);
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Successfully deleted, redirect back to users page
        router.push('/portaldegestao/users');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('An error occurred while deleting the user');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddCredits = async () => {
    if (!userDetails) return;
    
    try {
      setIsAddingCredits(true);
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: creditsAmount,
          reason: creditsReason,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update the user details with new credit balance
        setUserDetails(prev => prev ? {
          ...prev,
          author: {
            ...prev.author,
            credits: result.newBalance
          }
        } : null);
          // Close modal and reset form
        setShowAddCreditsModal(false);
        setCreditsAmount(0);
        setCreditsReason('voucher');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add credits');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      setError('An error occurred while adding credits');
    } finally {
      setIsAddingCredits(false);
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Error</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => router.back()} 
              className="btn btn-primary"
            >
              Go Back
            </button>
          </div>
        </main>
        <AdminFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back Button and Delete Button */}
        <div className="mb-6 flex justify-between items-center">
          <button 
            onClick={() => router.back()} 
            className="btn btn-outline btn-sm"
          >
            ← Back to Users
          </button>
          
          {userDetails && (
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-error btn-sm"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : userDetails ? (
          <div className="space-y-8">
            {/* User Details Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-4xl font-bold mb-6">{userDetails.author.displayName}</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Basic Information</h2>
                  <div className="space-y-2">
                    <p><strong>Email:</strong> {userDetails.author.email}</p>
                    <p><strong>Mobile Phone:</strong> {userDetails.author.mobilePhone || 'Not provided'}</p>                    <p><strong>Fiscal Number:</strong> {userDetails.author.fiscalNumber || 'Not provided'}</p>
                    <p><strong>Preferred Locale:</strong> {userDetails.author.preferredLocale || 'en'}</p>                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setShowCreditHistoryModal(true);
                          fetchCreditHistory();
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                      >
                        <strong>Credits:</strong> {userDetails.author.credits}
                      </button>
                      <button
                        onClick={() => setShowAddCreditsModal(true)}
                        className="btn btn-sm btn-success"
                        disabled={isAddingCredits}
                      >
                        + Add Credits
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Account Information</h2>
                  <div className="space-y-2">
                    <p><strong>Author ID:</strong> {userDetails.author.authorId}</p>
                    <p><strong>Clerk User ID:</strong> {userDetails.author.clerkUserId}</p>
                    <p><strong>Created At:</strong> {formatDate(userDetails.author.createdAt)}</p>
                    <p><strong>Last Login:</strong> {formatDate(userDetails.author.lastLoginAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses Section */}
            {userDetails.addresses.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-semibold mb-4">Addresses ({userDetails.addresses.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userDetails.addresses.map((address) => (
                    <div key={address.addressId} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg capitalize mb-2">{address.type} Address</h3>
                      <div className="space-y-1 text-sm">
                        <p>{address.line1}</p>
                        {address.line2 && <p>{address.line2}</p>}
                        <p>{address.city}{address.stateRegion && `, ${address.stateRegion}`}</p>
                        <p>{address.postalCode} {address.country}</p>
                        {address.phone && <p><strong>Phone:</strong> {address.phone}</p>}
                        <p className="text-gray-500"><strong>Added:</strong> {formatDate(address.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stories Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Stories ({userDetails.stories.length})</h2>
                {userDetails.stories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  This user hasn&apos;t created any stories yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left">Title</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Style</th>
                        <th className="text-left">Target Audience</th>
                        <th className="text-left">Created</th>
                        <th className="text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.stories.map((story) => (
                        <tr key={story.storyId} className="hover:bg-gray-50">
                          <td className="font-medium">{story.title}</td>
                          <td>
                            <span className={getStatusBadgeClass(story.status)}>
                              {story.status}
                            </span>
                          </td>
                          <td>{story.novelStyle || 'Not specified'}</td>
                          <td>{story.targetAudience || 'Not specified'}</td>
                          <td>{formatDate(story.createdAt)}</td>
                          <td>{formatDate(story.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
      <AdminFooter />

      {/* Add Credits Modal */}
      {showAddCreditsModal && userDetails && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-success">Add Credits to User</h3>
            <div className="py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <p className="text-blue-800 font-semibold text-sm">
                  Adding credits to: {userDetails.author.displayName}
                </p>
                <p className="text-blue-700 text-sm">
                  Current balance: {userDetails.author.credits} credits
                </p>
              </div>              {/* Amount Input */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Amount (0-100 credits):</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="input input-bordered w-full"
                  disabled={isAddingCredits}
                />
              </div>

              {/* Reason Selection */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Reason for credit top-up:</span>
                </label>
                <select
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value as 'refund' | 'voucher' | 'promotion')}
                  className="select select-bordered w-full"
                  disabled={isAddingCredits}
                >
                  <option value="voucher">Voucher</option>
                  <option value="refund">Refund</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>              {/* Warning Message */}
              <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                <p className="text-orange-800 font-semibold text-sm">
                  ⚠️ IMPORTANT WARNING
                </p>
                <p className="text-orange-700 text-sm mt-1">
                  {creditsAmount === 0 
                    ? "This operation will record a transaction with 0 credits. This action CANNOT be undone."
                    : "This operation CANNOT be undone. Credits will be permanently added to the user's account."
                  }
                </p>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"                onClick={() => {
                  setShowAddCreditsModal(false);
                  setCreditsAmount(0);
                  setCreditsReason('voucher');
                }}
                disabled={isAddingCredits}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleAddCredits}
                disabled={isAddingCredits}
              >
                {isAddingCredits ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Adding Credits...
                  </>                ) : (
                  creditsAmount === 0 ? "Record Transaction (0 Credits)" : `Add ${creditsAmount} Credits`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userDetails && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">CONFIRM USER DELETION</h3>
            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-600">
                YOU ARE ABOUT TO PERMANENTLY DELETE THE FOLLOWING USER AND ALL ASSOCIATED DATA:
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <p><strong>NAME:</strong> {userDetails.author.displayName}</p>
                <p><strong>EMAIL:</strong> {userDetails.author.email}</p>
                <p><strong>AUTHOR ID:</strong> {userDetails.author.authorId}</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <p className="text-red-800 font-semibold text-sm">
                  THIS WILL PERMANENTLY DELETE:
                </p>
                <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                  <li>USER ACCOUNT AND PROFILE</li>
                  <li>ALL STORIES ({userDetails.stories.length} STORIES)</li>
                  <li>ALL CHARACTERS CREATED BY THIS USER</li>
                  <li>ALL ADDRESSES ({userDetails.addresses.length} ADDRESSES)</li>
                  <li>ALL STORY VERSIONS AND CONTENT</li>
                  <li>ALL ACTIVITY EVENTS</li>
                </ul>
              </div>              <p className="text-red-600 font-bold text-center">
                THIS ACTION CANNOT BE UNDONE!
              </p>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-button"
                className="btn btn-error"
                onClick={handleDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    DELETING...
                  </>
                ) : (
                  'PERMANENTLY DELETE USER'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit History Modal */}
      {showCreditHistoryModal && userDetails && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Credit History for {userDetails.author.displayName}</h3>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left">Date</th>
                    <th className="text-left">Amount</th>
                    <th className="text-left">Reason</th>
                    <th className="text-left">Balance After</th>
                    <th className="text-left">Story ID</th>
                    <th className="text-left">Purchase ID</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500">
                        No credit history found for this user.
                      </td>
                    </tr>
                  ) : (                    creditHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td>{formatDate(entry.createdAt)}</td>
                        <td className={entry.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </td>
                        <td>{entry.creditEventType}</td>
                        <td>{entry.balanceAfter}</td>
                        <td>{entry.storyId || 'N/A'}</td>
                        <td>{entry.purchaseId || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowCreditHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}