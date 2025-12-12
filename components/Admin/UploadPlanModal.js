'use client';

import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadPlanModal({ isOpen, onClose, requestId, onSuccess, userName }) {
  const [planJSON, setPlanJSON] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!planJSON.trim()) {
      toast.error('Please paste the plan JSON');
      return;
    }

    try {
      let parsedPlan;
      try {
        parsedPlan = JSON.parse(planJSON);
      } catch (e) {
        toast.error('Invalid JSON format. Please check and try again.');
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('firebaseToken');

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const response = await fetch(`${basePath}/api/admin/upload-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          planData: parsedPlan,
          approvedBy: localStorage.getItem('userId'),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Plan created for ${userName}!`);
        setPlanJSON('');
        onClose();
        onSuccess?.();
      } else {
        toast.error(data.error || 'Failed to upload plan');
      }
    } catch (error) {
      console.error('Error uploading plan:', error);
      toast.error('Error uploading plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upload Study Plan for {userName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste Plan JSON
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Paste the JSON plan generated from ChatGPT/Claude. The plan should contain day-wise study schedule with topics and prep times.
            </p>
            <textarea
              value={planJSON}
              onChange={(e) => setPlanJSON(e.target.value)}
              placeholder={`Paste your JSON plan here...\n\nExample format:\n{\n  "plan": [\n    {\n      "day": 1,\n      "technical": { ... },\n      "general_aptitude": { ... }\n    }\n  ]\n}`}
              className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Expected JSON Format
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Should contain "plan" array with day-wise breakdown of technical and general_aptitude topics
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={loading || !planJSON.trim()}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>{loading ? 'Uploading...' : 'Upload Plan'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
