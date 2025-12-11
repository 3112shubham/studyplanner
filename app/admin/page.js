'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import Navbar from '@/components/Common/Navbar';
import UploadPlanModal from '@/components/Admin/UploadPlanModal';
import toast from 'react-hot-toast';
import { Check, X, Clock, Eye, Copy, Upload as UploadIcon } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRequestForUpload, setSelectedRequestForUpload] = useState(null);

  useEffect(() => {
    // Check if user is logged in and is admin
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userData?.role !== 'admin') {
        toast.error('You do not have permission to access this page');
        router.push('/dashboard');
      } else {
        setIsAuthorized(true);
        fetchRequests();
      }
    }
  }, [user, userData, loading, router]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch('/api/admin/requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        toast.error('Failed to load requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Error loading requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch('/api/admin/update-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          status: newStatus,
          approvedBy: user.uid,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Request ${newStatus} successfully`);
        // Update local state
        setRequests(requests.map(req => 
          req.id === requestId ? { ...req, status: newStatus } : req
        ));
      } else {
        toast.error(data.error || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error updating request');
    }
  };

  const handleCopyPrompt = async (request) => {
    setGeneratingPrompt(true);
    try {
      const response = await fetch('/api/admin/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days: request.days,
          topicStrengths: request.topicStrengths,
        }),
      });

      const data = await response.json();
      if (data.success && data.prompt) {
        // Copy to clipboard
        await navigator.clipboard.writeText(data.prompt);
        toast.success('Study plan prompt copied to clipboard!');
      } else {
        toast.error('Failed to generate prompt');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast.error('Error generating prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleOpenUploadModal = (request) => {
    setSelectedRequestForUpload(request);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    fetchRequests();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user study plan requests
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Requests
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {requests.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Pending
            </h3>
            <p className="text-3xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Approved
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Rejected
            </h3>
            <p className="text-3xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </p>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Requests
            </h2>
          </div>

          {loadingRequests ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      User Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Requested On
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {req.userName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {req.userEmail}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {req.days} days
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(req.status)}`}>
                          {getStatusIcon(req.status)}
                          <span className="capitalize">{req.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowDetails(true);
                          }}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCopyPrompt(req)}
                          disabled={generatingPrompt}
                          className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 disabled:opacity-50"
                          title="Copy GPT Prompt"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleOpenUploadModal(req)}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-800 dark:text-green-400"
                            title="Upload Plan"
                          >
                            <UploadIcon className="h-4 w-4" />
                          </button>
                        )}
                        {req.status === 'rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(req.id, 'pending')}
                            className="flex items-center space-x-1 text-orange-600 hover:text-orange-800 dark:text-orange-400"
                            title="Reopen"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Request Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User Name</label>
                <p className="text-gray-900 dark:text-white">{selectedRequest.userName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-white">{selectedRequest.userEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Study Duration</label>
                <p className="text-gray-900 dark:text-white">{selectedRequest.days} days</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Requested At</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <p className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="capitalize">{selectedRequest.status}</span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Topic Strengths
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(selectedRequest.topicStrengths).map(([topic, strength]) => (
                    <div key={topic} className="text-gray-900 dark:text-white">
                      <span className="capitalize">{topic.replace(/_/g, ' ')}:</span> <span className="capitalize">{strength.stringValue || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Plan Modal */}
      <UploadPlanModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedRequestForUpload(null);
        }}
        requestId={selectedRequestForUpload?.id}
        userName={selectedRequestForUpload?.userName}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

