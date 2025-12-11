'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
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

  // Fetch the user's plan
  useEffect(() => {
    if (user?.uid && authLoading === false) {
      fetchUserPlan();
      checkPendingRequest();
    }
  }, [user?.uid, authLoading]);

  const checkPendingRequest = async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      const response = await fetch(`/api/user/planrequest?userId=${user.uid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.hasPendingRequest) {
        setPendingRequest(data.status);
      }
    } catch (error) {
      console.error('Error checking pending request:', error);
    }
  };

  const fetchUserPlan = async () => {
    try {
      setPlanLoading(true);
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        console.error('No token found');
        setPlanLoading(false);
        return;
      }

      console.log('Fetching plan for user:', user?.uid);
      const response = await fetch(`/api/user/currentplan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', {
        success: data.success,
        hasPlan: !!data.plan,
        daysCount: data.plan?.days?.length,
        error: data.error,
      });
      
      if (!response.ok) {
        console.error('API Error:', data);
        toast.error(data.error || 'Failed to load plan');
        setCurrentPlan(null);
        setPendingRequest(null);
      } else if (data.success && data.plan) {
        console.log('✅ Plan received successfully:', {
          planId: data.plan.planId,
          totalDays: data.plan.totalDays,
          firstDay: data.plan.days?.[0]?.title,
        });
        setCurrentPlan(data.plan);
        setPendingRequest(null); // Clear pending request if plan exists
        calculateStats(data.plan);
      } else {
        console.log('No plan found in response');
        setCurrentPlan(null);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      toast.error('Error loading plan');
      setCurrentPlan(null);
    } finally {
      setPlanLoading(false);
    }
  };

  const calculateStats = (plan) => {
    console.log('calculateStats called with plan:', plan);
    
    // Calculate total and completed subtopics from plan structure
    try {
      let totalSubtopics = 0;
      let completedSubtopics = 0;

      if (plan && plan.days && Array.isArray(plan.days) && plan.days.length > 0) {
        console.log('Processing', plan.days.length, 'days');
        
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
            console.error(`Error processing day ${dayIdx}:`, dayError);
          }
        });

        console.log('Final totals - completed:', completedSubtopics, 'total:', totalSubtopics);
        
        const progressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

        setStats({
          completedTopics: completedSubtopics,
          totalTopics: totalSubtopics,
          progressPercentage: progressPercentage,
        });
      } else {
        console.log('Plan has no days or is empty');
        setStats({
          completedTopics: 0,
          totalTopics: 0,
          progressPercentage: 0,
        });
      }
    } catch (error) {
      console.error('Error in calculateStats:', error);
      setStats({
        completedTopics: 0,
        totalTopics: 0,
        progressPercentage: 0,
      });
    }
  };

  const fetchProgressStats = async () => {
    // Progress stats are now calculated directly from the plan in calculateStats
    // This function is kept for backward compatibility but does nothing
    console.log('fetchProgressStats called - stats are calculated from plan data');
  };

  const handlePlanRequestSubmit = async (planData) => {
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

      console.log('Sending plan request:', payload);

      const response = await fetch('/api/user/planrequest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
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
      console.error('Plan request error:', error);
    }
  };

  const toggleDayExpanded = (dayNumber) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNumber]: !prev[dayNumber]
    }));
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome, {userData?.name || 'User'}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Your GATE CSE Study Dashboard
          </p>
        </div>

        {/* Debug Info - Remove in production */}
        {currentPlan && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <details className="cursor-pointer">
              <summary className="font-semibold text-yellow-900">Debug Info (Click to expand)</summary>
              <div className="mt-4 bg-black text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-96">
                <div>Plan ID: {currentPlan.planId}</div>
                <div>Total Days: {currentPlan.days?.length || 0}</div>
                <div>Duration: {currentPlan.duration}</div>
                {currentPlan.days?.[0] && (
                  <>
                    <div className="mt-2 border-t border-green-400 pt-2">First Day:</div>
                    <div>Day Number: {currentPlan.days[0].dayNumber}</div>
                    <div>Title: {currentPlan.days[0].title}</div>
                    <div>Subtopics Count: {currentPlan.days[0].subtopics?.length || 0}</div>
                    <div>Subtopics Type: {typeof currentPlan.days[0].subtopics}</div>
                    <div>Subtopics Sample: {JSON.stringify(currentPlan.days[0].subtopics?.slice(0, 1), null, 2)}</div>
                  </>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Overall Progress Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Overall Progress
              </h2>
              <div className="text-2xl">📊</div>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-3">
              {stats.progressPercentage}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              {stats.completedTopics} of {stats.totalTopics} topics completed
            </p>
          </div>

          {/* Plan Status Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Plan Status
              </h2>
              <div className="text-2xl">
                {currentPlan ? '✅' : pendingRequest ? '⏳' : '❌'}
              </div>
            </div>
            <p className="text-2xl font-bold mb-2" style={{
              color: currentPlan ? '#10b981' : pendingRequest ? '#f59e0b' : '#6b7280'
            }}>
              {currentPlan ? 'Active' : pendingRequest ? 'Pending' : 'No Plan'}
            </p>
            <p className="text-sm text-gray-600">
              {currentPlan 
                ? `${currentPlan.duration || 35}-day plan` 
                : pendingRequest 
                  ? 'Review in progress'
                  : 'Request to get started'}
            </p>
          </div>

          {/* Total Topics Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Total Topics
              </h2>
              <div className="text-2xl">📚</div>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-3">
              {stats.totalTopics}
            </p>
            <p className="text-sm text-gray-600">
              Topics to cover
            </p>
          </div>

          {/* Actions Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Actions
              </h2>
              <div className="text-2xl">⚡</div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => currentPlan ? router.push('/plan') : setShowPlanModal(true)}
                className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 ${
                  currentPlan
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg'
                    : pendingRequest
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
                }`}
                disabled={pendingRequest && !currentPlan}
              >
                {currentPlan ? 'View Your Plan' : pendingRequest ? 'Pending...' : 'Request Plan'}
              </button>
              
              {(currentPlan || pendingRequest) && (
                <button
                  onClick={fetchUserPlan}
                  disabled={planLoading}
                  className="w-full font-semibold py-2 px-4 rounded-lg transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm flex items-center justify-center gap-2"
                >
                  {planLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!currentPlan && !planLoading && !pendingRequest && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-blue-900 mb-3">
              Get Your Personalized Study Plan
            </h3>
            <p className="text-blue-700 mb-6 max-w-2xl mx-auto">
              Request a customized 35-day GATE CSE study plan tailored to your strength levels and learning pace.
            </p>
            <button
              onClick={() => setShowPlanModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Request a Plan Now
            </button>
          </div>
        )}

        {pendingRequest && !currentPlan && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-2xl font-bold text-amber-900 mb-3">
              Your Plan is Being Created
            </h3>
            <p className="text-amber-700 mb-3">
              Our team is working on your personalized study plan. We'll notify you once it's ready!
            </p>
            <p className="text-sm text-amber-600">
              Status: {pendingRequest}
            </p>
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
