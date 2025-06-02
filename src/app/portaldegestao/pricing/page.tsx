'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../../components/AdminHeader';
import AdminFooter from '../../../components/AdminFooter';
import { trackEvent } from '../../../components/GoogleAnalytics';

interface PricingEntry {
  id: string;
  serviceCode: string;
  credits: number;
  isActive: boolean;
  isMandatory: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditModalData {
  id: string;
  serviceCode: string;
  credits: number;
  isActive: boolean;
  isMandatory: boolean;
  isDefault: boolean;
}

export default function PricingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [pricingEntries, setPricingEntries] = useState<PricingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<EditModalData | null>(null);
  const [newPricing, setNewPricing] = useState({
    serviceCode: '',
    credits: 0,
    isActive: true,
    isMandatory: false,
    isDefault: false
  });

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

      // Fetch pricing data if authorized
      fetchPricingEntries();
    }
  }, [isLoaded, isSignedIn, user, router]);

  const fetchPricingEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/pricing');
      if (response.ok) {
        const data = await response.json();
        setPricingEntries(data);
      } else {
        console.error('Failed to fetch pricing entries');
      }
    } catch (error) {
      console.error('Error fetching pricing entries:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddPricing = async () => {
    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPricing),
      });

      if (response.ok) {
        // Track successful pricing creation
        trackEvent('pricing_created', {
          service_code: newPricing.serviceCode,
          credits: newPricing.credits,
          is_active: newPricing.isActive,
          is_mandatory: newPricing.isMandatory,
          is_default: newPricing.isDefault
        });
        
        await fetchPricingEntries();
        setShowAddModal(false);
        setNewPricing({
          serviceCode: '',
          credits: 0,
          isActive: true,
          isMandatory: false,
          isDefault: false
        });
      } else {
        console.error('Failed to create pricing entry');
        trackEvent('pricing_creation_failed', {
          service_code: newPricing.serviceCode
        });
      }
    } catch (error) {
      console.error('Error creating pricing entry:', error);
      trackEvent('pricing_creation_error', {
        service_code: newPricing.serviceCode
      });
    }
  };
  const handleEditPricing = async () => {
    if (!editModalData) return;

    try {
      const response = await fetch(`/api/admin/pricing/${editModalData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          isActive: editModalData.isActive,
          isMandatory: editModalData.isMandatory,
          isDefault: editModalData.isDefault,
          credits: editModalData.credits,
        }),
      });

      if (response.ok) {
        // Track successful pricing update
        trackEvent('pricing_updated', {
          service_code: editModalData.serviceCode,
          credits: editModalData.credits,
          is_active: editModalData.isActive,
          is_mandatory: editModalData.isMandatory,
          is_default: editModalData.isDefault
        });
        
        await fetchPricingEntries();
        setShowEditModal(false);
        setEditModalData(null);
      } else {
        console.error('Failed to update pricing entry');
        trackEvent('pricing_update_failed', {
          service_code: editModalData.serviceCode
        });
      }
    } catch (error) {
      console.error('Error updating pricing entry:', error);
      trackEvent('pricing_update_error', {
        service_code: editModalData.serviceCode
      });
    }
  };  const openEditModal = (entry: PricingEntry) => {
    trackEvent('edit_pricing_modal_opened', {
      service_code: entry.serviceCode,
      section: 'pricing_management'
    });
    
    setEditModalData({
      id: entry.id,
      serviceCode: entry.serviceCode,
      credits: entry.credits,
      isActive: entry.isActive,
      isMandatory: entry.isMandatory,
      isDefault: entry.isDefault,
    });
    setShowEditModal(true);
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Pricing Management</h1>
            <p className="text-gray-600 mt-2">Manage service pricing and credits</p>
          </div>          <button 
            className="btn btn-primary"
            onClick={() => {
              trackEvent('add_pricing_modal_opened', {
                section: 'pricing_management'
              });
              setShowAddModal(true);
            }}
          >
            Add New Price
          </button>
        </div>

        {/* Pricing Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Service Code</th>
                <th>Credits</th>
                <th>Active</th>
                <th>Mandatory</th>
                <th>Default</th>
                <th>Created At</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="loading loading-spinner loading-md"></div>
                  </td>
                </tr>
              ) : pricingEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No pricing entries found
                  </td>
                </tr>
              ) : (
                pricingEntries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openEditModal(entry)}
                  >
                    <td className="font-medium">{entry.serviceCode}</td>
                    <td>{entry.credits}</td>
                    <td>
                      <span className={`badge ${entry.isActive ? 'badge-success' : 'badge-error'}`}>
                        {entry.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${entry.isMandatory ? 'badge-info' : 'badge-ghost'}`}>
                        {entry.isMandatory ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${entry.isDefault ? 'badge-warning' : 'badge-ghost'}`}>
                        {entry.isDefault ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
                    <td>{new Date(entry.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Add New Pricing Entry</h3>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Service Code</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newPricing.serviceCode}
                  onChange={(e) => setNewPricing({ ...newPricing, serviceCode: e.target.value })}
                  placeholder="e.g., eBookGeneration"
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Credits</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={newPricing.credits}
                  onChange={(e) => setNewPricing({ ...newPricing, credits: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Is Active</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={newPricing.isActive}
                    onChange={(e) => setNewPricing({ ...newPricing, isActive: e.target.checked })}
                  />
                </label>
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Is Mandatory</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={newPricing.isMandatory}
                    onChange={(e) => setNewPricing({ ...newPricing, isMandatory: e.target.checked })}
                  />
                </label>
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Is Default</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={newPricing.isDefault}
                    onChange={(e) => setNewPricing({ ...newPricing, isDefault: e.target.checked })}
                  />
                </label>
              </div>

              <div className="modal-action">
                <button className="btn btn-primary" onClick={handleAddPricing}>
                  Add Pricing
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editModalData && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Edit Pricing Entry</h3>
              <p className="text-sm text-gray-600 mb-4">Service Code: <strong>{editModalData.serviceCode}</strong></p>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Credits</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={editModalData.credits}
                  onChange={(e) => setEditModalData({ 
                    ...editModalData, 
                    credits: parseInt(e.target.value) || 0 
                  })}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Is Active</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={editModalData.isActive}
                    onChange={(e) => setEditModalData({ 
                      ...editModalData, 
                      isActive: e.target.checked 
                    })}
                  />
                </label>
              </div>              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Is Mandatory</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={editModalData.isMandatory}
                    onChange={(e) => setEditModalData({ 
                      ...editModalData, 
                      isMandatory: e.target.checked 
                    })}
                  />
                </label>
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Is Default</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={editModalData.isDefault}
                    onChange={(e) => setEditModalData({ 
                      ...editModalData, 
                      isDefault: e.target.checked 
                    })}
                  />
                </label>
              </div>

              <div className="modal-action">
                <button className="btn btn-primary" onClick={handleEditPricing}>
                  Update Pricing
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditModalData(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <AdminFooter />
    </div>
  );
}
