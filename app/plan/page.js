'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import toast from 'react-hot-toast';
import { ChevronLeft, Check } from 'lucide-react';
import PlanViewer from '@/components/User/PlanViewer';

export default function PlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  // Fetch the user's plan and progress
  useEffect(() => {
    if (user?.uid && authLoading === false) {
      fetchUserPlan();
      fetchProgress();
    }
  }, [user?.uid, authLoading]);

  const fetchUserPlan = async () => {
    try {
      setPlanLoading(true);
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        console.error('No token found');
        setPlanLoading(false);
        return;
      }

      const response = await fetch(`/api/user/currentplan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        toast.error(data.error || 'Failed to load plan');
        setCurrentPlan(null);
      } else if (data.success && data.plan) {
        console.log('Plan fetched:', data.plan);
        setCurrentPlan(data.plan);
        // Set first day as selected
        if (data.plan.days && data.plan.days.length > 0) {
          setSelectedDay(data.plan.days[0].dayNumber || 1);
        }
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

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      const response = await fetch(`/api/user/progress`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.progress) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleTopicCheck = async (dayNumber, subjectIdx, topicIndex, subtopicIndex, isChecked) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIndex}_subtopic_${subtopicIndex}`;

      // Update local state immediately for instant UI feedback
      setProgress(prev => {
        const updated = {
          ...prev,
          [progressKey]: isChecked
        };
        console.log('Updated local progress:', { progressKey, isChecked, allProgress: Object.keys(updated) });
        return updated;
      });

      // Send to server
      const response = await fetch(`/api/user/progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayNumber,
          subjectIdx,
          topicIndex,
          subtopicIndex,
          completed: isChecked,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // After server update, refresh from server to ensure consistency
        await fetchProgress();
        
        // Show success message with progress info
        if (data.progress !== undefined) {
          toast.success(`✓ Saved! Overall progress: ${data.progress}%`, {
            duration: 2,
            icon: '💾',
          });
        } else {
          toast.success('✓ Progress saved to database!', {
            duration: 2,
          });
        }
      } else {
        toast.error('Failed to save progress');
        // Revert local state on error
        setProgress(prev => {
          const updated = { ...prev };
          delete updated[progressKey];
          return updated;
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading plan...</div>
      </div>
    );
  }

  if (!user || !currentPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Plan Found</h2>
        <p className="text-gray-600 mb-6">Request a study plan to get started</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const currentDayPlan = currentPlan.days?.find(day => day.dayNumber === selectedDay);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ChevronLeft className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Study Plan</h1>
              <p className="text-sm text-gray-600">{currentPlan.duration || 35} day comprehensive study plan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Side Panel - Day Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md sticky top-24">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">📅 Select Day</h2>
                <p className="text-sm text-gray-600 mt-1">Total: {currentPlan.days?.length || 35} days</p>
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  {currentPlan.days?.map((day, index) => {
                    const dayNumber = day.dayNumber || (index + 1);
                    
                    // Calculate day progress by checking all subtopics in that day
                    let dayTotalSubtopics = 0;
                    let dayCompletedSubtopics = 0;
                    
                    if (day.subtopics && Array.isArray(day.subtopics)) {
                      day.subtopics.forEach((subject, subjectIdx) => {
                        if (subject.topics && Array.isArray(subject.topics)) {
                          subject.topics.forEach((topic, topicIdx) => {
                            if (topic.subtopics && Array.isArray(topic.subtopics)) {
                              topic.subtopics.forEach((subtopic, subtopicIdx) => {
                                dayTotalSubtopics++;
                                const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
                                // Only count as completed if explicitly true
                                if (progress[progressKey] === true) {
                                  dayCompletedSubtopics++;
                                }
                              });
                            }
                          });
                        }
                      });
                    }

                    return (
                      <button
                        key={dayNumber}
                        onClick={() => setSelectedDay(dayNumber)}
                        className={`w-full p-3 rounded-lg transition-all text-left ${
                          selectedDay === dayNumber
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Day {dayNumber}</p>
                            <p className={`text-xs ${
                              selectedDay === dayNumber ? 'text-blue-100' : 'text-gray-600'
                            }`}>
                              {dayCompletedSubtopics}/{dayTotalSubtopics} subtopics
                            </p>
                          </div>
                          {dayCompletedSubtopics > 0 && (
                            <div className={`text-sm font-bold ${
                              selectedDay === dayNumber ? 'text-blue-100' : 'text-green-600'
                            }`}>
                              ✓
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Topics and Subtopics */}
          <div className="lg:col-span-3">
            {currentDayPlan ? (
              <>
                {!currentDayPlan.subtopics || currentDayPlan.subtopics.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-md p-8 text-center">
                    <p className="text-gray-600 mb-4">No structured topics for this day</p>
                    <p className="text-sm text-gray-500">Topics list: {currentDayPlan.topics?.join(', ')}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Raw data: {JSON.stringify(Object.keys(currentDayPlan).slice(0, 5))}
                    </p>
                  </div>
                ) : (
                  <PlanViewer
                    day={currentDayPlan}
                    dayNumber={selectedDay}
                    progress={progress}
                    onTopicCheck={handleTopicCheck}
                  />
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <p className="text-gray-600">Day not found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
