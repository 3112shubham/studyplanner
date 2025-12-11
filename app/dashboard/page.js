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
