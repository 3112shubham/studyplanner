'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';
import PlanRequestModal from '@/components/User/PlanRequestModal';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});
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

      console.log('Fetching plan...');
      const response = await fetch(`/api/user/currentplan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        console.error('API Error:', data);
        toast.error(data.error || 'Failed to load plan');
        setCurrentPlan(null);
      } else if (data.success && data.plan) {
        setCurrentPlan(data.plan);
        calculateStats(data.plan);
      } else {
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
    // Calculate stats from the new plan structure
    if (plan && plan.days && Array.isArray(plan.days)) {
      let totalTopics = 0;
      let completedTopics = 0;
      
      plan.days.forEach(day => {
        if (day.topics && Array.isArray(day.topics)) {
          totalTopics += day.topics.length;
        }
        if (day.completed) {
          completedTopics += (day.topics?.length || 0);
        }
      });

      const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      setStats({
        completedTopics: completedTopics,
        totalTopics: totalTopics,
        progressPercentage: progressPercentage,
      });
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userData?.name || 'User'}!
          </h1>
          <p className="text-gray-600">
            Your GATE CS Study Dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Progress Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-600 mb-2">
              Overall Progress
            </h2>
            <p className="text-3xl font-bold text-primary-500 mb-4">
              {stats.progressPercentage}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.completedTopics} of {stats.totalTopics} topics completed
            </p>
          </div>

          {/* Plan Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-600 mb-2">
              Plan Status
            </h2>
            <p className="text-3xl font-bold mb-4" style={{
              color: currentPlan ? '#3b82f6' : pendingRequest ? '#f59e0b' : '#6b7280'
            }}>
              {currentPlan ? 'Active' : pendingRequest ? 'REQUEST PENDING' : 'No Plan'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {currentPlan 
                ? `${currentPlan.duration || 35} day plan` 
                : pendingRequest 
                  ? `Your ${pendingRequest} request is being reviewed`
                  : 'Create or request a plan'}
            </p>
            {!currentPlan && !pendingRequest && (
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Request a Plan
              </button>
            )}
            {pendingRequest && (
              <button
                disabled
                className="w-full bg-amber-500 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed opacity-75 text-sm"
              >
                Request Pending
              </button>
            )}
          </div>

          {/* Total Topics Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-600 mb-2">
              Total Topics
            </h2>
            <p className="text-3xl font-bold text-green-500 mb-4">
              {stats.totalTopics}
            </p>
            <p className="text-sm text-gray-600">
              Topics in your plan
            </p>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPlan ? (
              <Link
                href="/study"
                className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
              >
                Start Studying
              </Link>
            ) : (
              <button
                onClick={() => setShowPlanModal(true)}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
              >
                Request a Plan
              </button>
            )}
            <Link
              href="/profile"
              className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors text-center"
            >
              View Profile
            </Link>
          </div>
        </div>

        {/* Plan Overview */}
        {currentPlan && currentPlan.days && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Your Study Plan ({currentPlan.days.length} Days)
            </h2>
            
            <div className="space-y-4">
              {currentPlan.days.map((dayPlan, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleDayExpanded(dayPlan.dayNumber)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-4 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-bold text-lg text-primary-600 bg-primary-100 px-3 py-1 rounded">
                        Day {dayPlan.dayNumber}
                      </span>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">
                          {dayPlan.section || 'Study Topic'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {dayPlan.topics?.length || 0} topics • {dayPlan.hours} hours
                        </p>
                      </div>
                    </div>
                    {expandedDays[dayPlan.dayNumber] ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </button>

                  {expandedDays[dayPlan.dayNumber] && (
                    <div className="p-4 border-t border-gray-200 space-y-4">
                      {/* Day Details */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 text-primary-600">
                          {dayPlan.title}
                        </h4>
                        
                        {/* Topics */}
                        {dayPlan.topics && dayPlan.topics.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Topics:</h5>
                            <div className="space-y-2 ml-4">
                              {dayPlan.topics.map((topic, idx) => (
                                <div key={idx} className="text-sm text-gray-700 flex items-start">
                                  <span className="text-primary-500 mr-2">•</span>
                                  <span>{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Subtopics */}
                        {dayPlan.subtopics && dayPlan.subtopics.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Subjects:</h5>
                            <div className="space-y-3 ml-4">
                              {dayPlan.subtopics.map((subject, idx) => (
                                <div key={idx}>
                                  <p className="font-medium text-gray-800">{subject.name}</p>
                                  {subject.topics && subject.topics.map((topic, topicIdx) => (
                                    <div key={topicIdx} className="ml-2 mt-1">
                                      <p className="text-sm text-gray-700 font-medium">{topic.name}</p>
                                      {topic.subtopics && (
                                        <ul className="ml-4 mt-1">
                                          {topic.subtopics.map((subtopic, subIdx) => (
                                            <li key={subIdx} className="text-xs text-gray-600">
                                              {subtopic.name}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Study Details */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-600">Study Hours</p>
                            <p className="font-semibold text-gray-900">{dayPlan.hours}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Status</p>
                            <p className="font-semibold text-gray-900">
                              {dayPlan.completed ? '✓ Completed' : 'Pending'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!currentPlan && !planLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              No Study Plan Yet
            </h3>
            <p className="text-blue-700 mb-4">
              Request a personalized study plan and our team will create one for you!
            </p>
            <button
              onClick={() => setShowPlanModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Request a Plan
            </button>
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
