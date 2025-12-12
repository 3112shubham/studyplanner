'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getApiUrl } from '@/lib/api';
import toast from 'react-hot-toast';
import PlanRequestModal from '@/components/User/PlanRequestModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [stats, setStats] = useState({
    completedTopics: 0,
    totalTopics: 0,
    progressPercentage: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  // Fetch the user's plan - only once on mount
  useEffect(() => {
    if (user?.uid && authLoading === false && !currentPlan && !pendingRequest) {
      fetchUserPlan();
      checkPendingRequest();
    }
  }, [user?.uid, authLoading, currentPlan, pendingRequest]);

  const checkPendingRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      // Check cache
      const cachedRequest = localStorage.getItem('userPendingRequest');
      const cacheTime = localStorage.getItem('userPendingRequestCacheTime');
      const cacheExpiry = 2 * 60 * 1000; // 2 minutes
      
      if (cachedRequest && cacheTime) {
        const timeSinceCached = Date.now() - parseInt(cacheTime);
        if (timeSinceCached < cacheExpiry) {
          const cached = JSON.parse(cachedRequest);
          if (cached.hasPendingRequest) {
            setPendingRequest(cached.status);
          }
          return;
        }
      }

      const response = await fetch(getApiUrl(`/api/user/planrequest?userId=${user.uid}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.hasPendingRequest) {
        setPendingRequest(data.status);
        // Cache the request
        localStorage.setItem('userPendingRequest', JSON.stringify(data));
        localStorage.setItem('userPendingRequestCacheTime', Date.now().toString());
      }
    } catch (error) {
      // Silent fail
    }
  }, [user?.uid]);

  const fetchUserPlan = useCallback(async () => {
    try {
      setPlanLoading(true);
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        setPlanLoading(false);
        return;
      }

      // Check cache first
      const cachedPlan = localStorage.getItem('userDashboardPlan');
      const cacheTime = localStorage.getItem('userDashboardPlanCacheTime');
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes
      
      if (cachedPlan && cacheTime) {
        const timeSinceCached = Date.now() - parseInt(cacheTime);
        if (timeSinceCached < cacheExpiry) {
          const plan = JSON.parse(cachedPlan);
          setCurrentPlan(plan);
          calculateStats(plan);
          setPlanLoading(false);
          return;
        }
      }

      const response = await fetch(getApiUrl('/api/user/currentplan'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Failed to load plan');
        setCurrentPlan(null);
        setPendingRequest(null);
      } else if (data.success && data.plan) {
        // Cache the plan
        localStorage.setItem('userDashboardPlan', JSON.stringify(data.plan));
        localStorage.setItem('userDashboardPlanCacheTime', Date.now().toString());
        
        setCurrentPlan(data.plan);
        setPendingRequest(null); // Clear pending request if plan exists
        calculateStats(data.plan);
      } else {
        setCurrentPlan(null);
      }
    } catch (error) {
      toast.error('Error loading plan');
      setCurrentPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, [user?.uid]);

  const calculateStats = useCallback((plan) => {
    // Calculate total and completed subtopics from plan structure
    try {
      let totalSubtopics = 0;
      let completedSubtopics = 0;

      if (plan && plan.days && Array.isArray(plan.days) && plan.days.length > 0) {
        plan.days.forEach((day, dayIdx) => {
          try {
            if (day.subtopics && Array.isArray(day.subtopics) && day.subtopics.length > 0) {
              // day.subtopics is an array of subject objects
              day.subtopics.forEach((subject, subIdx) => {
                if (subject && subject.topics && Array.isArray(subject.topics)) {
                  subject.topics.forEach((topic) => {
                    if (topic && topic.subtopics && Array.isArray(topic.subtopics)) {
                      topic.subtopics.forEach((subtopic) => {
                        totalSubtopics++;
                        // Count as completed if explicitly marked as true
                        if (subtopic.checked === true) {
                          completedSubtopics++;
                        }
                      });
                    }
                  });
                }
              });
            }
          } catch (dayError) {
            // Skip on error
          }
        });

        const progressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

        setStats({
          completedTopics: completedSubtopics,
          totalTopics: totalSubtopics,
          progressPercentage: progressPercentage,
        });
      } else {
        setStats({
          completedTopics: 0,
          totalTopics: 0,
          progressPercentage: 0,
        });
      }
    } catch (error) {
      setStats({
        completedTopics: 0,
        totalTopics: 0,
        progressPercentage: 0,
      });
    }
  }, []);

  const fetchProgressStats = useCallback(async () => {
    // Progress stats are now calculated directly from the plan in calculateStats
    // This function is kept for backward compatibility but does nothing
  }, []);

  const handlePlanRequestSubmit = useCallback(async (planData) => {
    try {
      if (!user?.uid) {
        toast.error('User not authenticated');
        return;
      }

      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const payload = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.name || user.email,
        days: planData.days,
        topicStrengths: planData.topicStrengths,
      };

      const response = await fetch(getApiUrl('/api/user/planrequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create plan request');
        // If there's a pending request, update the status
        if (data.hasPendingRequest) {
          setPendingRequest(data.status);
        }
        return;
      }

      toast.success('Plan request submitted! Our team will create a personalized plan for you.');
      setPendingRequest('pending');
      setShowPlanModal(false);
    } catch (error) {
      toast.error('An error occurred while submitting plan request');
    }
  }, [user?.uid, userData?.name]);

  const toggleDayExpanded = useCallback((dayNumber) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNumber]: !prev[dayNumber]
    }));
  }, []);

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show loader while loading
  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Header */}
        <div className="mb-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Welcome back👋
          </h1>
          <p className="text-blue-100 text-lg">
            Your personalized GATE CSE study journey
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Overall Progress Card */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-t-4 border-blue-500 group">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Overall Progress
                </p>
                <p className="text-5xl font-bold text-blue-600">
                  {stats.progressPercentage}%
                </p>
              </div>
              <div className="text-5xl group-hover:scale-110 transition-transform">📊</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700"
                style={{ width: `${stats.progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.completedTopics}</span> of <span className="font-semibold text-gray-900">{stats.totalTopics}</span> topics completed
            </p>
          </div>

          {/* Plan Status Card */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-t-4 border-green-500 group">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Plan Status
                </p>
                <p className="text-3xl font-bold mb-2" style={{
                  color: currentPlan ? '#059669' : pendingRequest ? '#d97706' : '#6b7280'
                }}>
                  {currentPlan ? 'Active' : pendingRequest ? 'Pending' : 'No Plan'}
                </p>
              </div>
              <div className="text-5xl group-hover:scale-110 transition-transform">
                {currentPlan ? '✅' : pendingRequest ? '⏳' : '❌'}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {currentPlan 
                ? `${currentPlan.duration || 35}-day study plan active` 
                : pendingRequest 
                  ? 'Your plan is being created'
                  : 'Request a plan to begin'}
            </p>
          </div>

          {/* Total Topics Card */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-t-4 border-purple-500 group">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Total Topics
                </p>
                <p className="text-5xl font-bold text-purple-600">
                  {stats.totalTopics}
                </p>
              </div>
              <div className="text-5xl group-hover:scale-110 transition-transform">📚</div>
            </div>
            <p className="text-sm text-gray-600">
              Topics to master in your plan
            </p>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="mb-12">
          <button
            onClick={() => currentPlan ? router.push('/plan') : setShowPlanModal(true)}
            disabled={pendingRequest && !currentPlan}
            className={`w-full font-bold py-4 px-6 rounded-2xl text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 ${
              currentPlan
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                : pendingRequest
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
            }`}
          >
            {currentPlan ? '🚀 View Your Study Plan' : pendingRequest ? '⏳ Plan Being Created...' : '📋 Request Your Plan'}
          </button>
        </div>

        {/* Empty State - No Plan */}
        {!currentPlan && !planLoading && !pendingRequest && (
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-12 text-center text-white shadow-2xl">
            <div className="text-7xl mb-6">🎯</div>
            <h3 className="text-3xl font-bold mb-4">
              Start Your GATE Journey
            </h3>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
              Request a customized 35-day GATE CSE study plan tailored to your strengths and weaknesses. Our AI analyzes your profile and creates the perfect roadmap to success.
            </p>
            <button
              onClick={() => setShowPlanModal(true)}
              className="bg-white text-blue-600 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
            >
              Create Your Plan Now
            </button>
          </div>
        )}

        {/* Pending State */}
        {pendingRequest && !currentPlan && (
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-12 text-center text-white shadow-2xl">
            <div className="text-7xl mb-6 animate-bounce">⏳</div>
            <h3 className="text-3xl font-bold mb-4">
              Your Plan is Being Created
            </h3>
            <p className="text-amber-100 mb-6 text-lg">
              Our team is crafting your personalized study schedule. We'll notify you as soon as it's ready!
            </p>
            <div className="inline-block bg-white/20 rounded-full px-6 py-2">
              <p className="text-sm font-semibold">Status: <span className="text-white">{pendingRequest}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Plan Request Modal */}
      <PlanRequestModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSubmit={handlePlanRequestSubmit}
      />
    </div>
  );
}
