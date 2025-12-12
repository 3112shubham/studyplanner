'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getApiUrl } from '@/lib/api';
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

  // Fetch the user's plan and progress - only fetch once on mount
  useEffect(() => {
    if (user?.uid && authLoading === false && !currentPlan) {
      fetchUserPlan();
    }
  }, [user?.uid, authLoading, currentPlan]);

  // Build progress object whenever plan changes
  useEffect(() => {
    if (currentPlan) {
      buildProgressFromPlan();
    }
  }, [currentPlan]);

  // Ensure day 1 is selected by default when plan loads
  useEffect(() => {
    if (currentPlan && currentPlan.days && currentPlan.days.length > 0) {
      // Find the first day or set to 1
      const firstDay = currentPlan.days[0];
      const dayNumberToSelect = firstDay.dayNumber || 1;
      setSelectedDay(dayNumberToSelect);
      console.log('[Plan] Set default selected day to:', dayNumberToSelect);
    }
  }, [currentPlan]);

  const fetchUserPlan = useCallback(async () => {
    try {
      setPlanLoading(true);
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        console.error('No token found');
        setPlanLoading(false);
        return;
      }

      // Check if plan is already cached in localStorage
      const cachedPlan = localStorage.getItem('userPlan');
      const cacheTimestamp = localStorage.getItem('userPlanCacheTime');
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes
      
      if (cachedPlan && cacheTimestamp) {
        const timeSinceCached = Date.now() - parseInt(cacheTimestamp);
        if (timeSinceCached < cacheExpiry) {
          console.log('[Cache] Using cached plan data');
          setCurrentPlan(JSON.parse(cachedPlan));
          setPlanLoading(false);
          return;
        }
      }

      const response = await fetch(getApiUrl(`/api/user/currentplan`), {
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
        // Cache the plan
        localStorage.setItem('userPlan', JSON.stringify(data.plan));
        localStorage.setItem('userPlanCacheTime', Date.now().toString());
        
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
  }, []);

  const buildProgressFromPlan = useCallback(() => {
    // Build progress object from current plan's subtopics
    const newProgress = {};
    
    if (currentPlan && currentPlan.days) {
      currentPlan.days.forEach((day) => {
        const dayNumber = day.dayNumber;
        if (day.subtopics && Array.isArray(day.subtopics)) {
          day.subtopics.forEach((subject, subjectIdx) => {
            if (subject.topics && Array.isArray(subject.topics)) {
              subject.topics.forEach((topic, topicIdx) => {
                if (topic.subtopics && Array.isArray(topic.subtopics)) {
                  topic.subtopics.forEach((subtopic, subtopicIdx) => {
                    const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
                    // Check if subtopic is explicitly marked as true
                    newProgress[progressKey] = subtopic.checked === true;
                  });
                }
              });
            }
          });
        }
      });
    }
    
    console.log('[Progress] Rebuilt progress object with', Object.keys(newProgress).length, 'items');
    setProgress(newProgress);
  }, [currentPlan]);

  const handleTopicCheck = async (dayNumber, subjectIdx, topicIndex, subtopicIndex, isChecked) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

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
      console.log('Sending progress update:', { dayNumber, subjectIdx, topicIndex, subtopicIndex, completed: isChecked });
      const response = await fetch(getApiUrl(`/api/user/progress`), {
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

      console.log('Progress API response status:', response.status, response.ok);
      
      const data = await response.json();
      console.log('Progress API response data:', data);
      
      if (response.ok && data.success) {
        // Just show success message - local state already updated
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
        console.error('API response was not successful:', data);
        toast.error(data.error || 'Failed to save progress');
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

  const currentDayPlan = currentPlan.days?.find(day => day.dayNumber === selectedDay) || currentPlan.days?.[0];

  // Calculate overall progress across all days
  let totalAllSubtopics = 0;
  let completedAllSubtopics = 0;

  if (currentPlan && currentPlan.days) {
    currentPlan.days.forEach((day) => {
      const dayNumber = day.dayNumber;
      if (day.subtopics && Array.isArray(day.subtopics)) {
        day.subtopics.forEach((subject, subjectIdx) => {
          if (subject.topics && Array.isArray(subject.topics)) {
            subject.topics.forEach((topic, topicIdx) => {
              if (topic.subtopics && Array.isArray(topic.subtopics)) {
                topic.subtopics.forEach((subtopic, subtopicIdx) => {
                  totalAllSubtopics++;
                  const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
                  if (progress[progressKey] === true) {
                    completedAllSubtopics++;
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  const overallProgressPercentage = totalAllSubtopics > 0 ? Math.round((completedAllSubtopics / totalAllSubtopics) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Floating Back Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="fixed top-20 left-4 z-40 flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        aria-label="Go back to dashboard"
        title="Back to Dashboard"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Side Panel - Day Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md sticky top-8 h-[calc(100vh-6rem)]">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">📅 Select Day</h2>
                <p className="text-sm text-gray-600 mt-1">Total: {currentPlan.days?.length || 35} days</p>
              </div>

              <div className="p-4 max-h-[calc(100vh-14rem)] overflow-y-auto">
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

                    const dayProgressPercentage = dayTotalSubtopics > 0 ? Math.round((dayCompletedSubtopics / dayTotalSubtopics) * 100) : 0;

                    return (
                      <button
                        key={dayNumber}
                        onClick={() => setSelectedDay(dayNumber)}
                        className={`w-full p-3 rounded-lg transition-all text-left relative overflow-hidden group border-2 ${
                          selectedDay === dayNumber
                            ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border-gray-200'
                        }`}
                      >
                        {/* Progress Background Fill */}
                        <div
                          className={`absolute inset-0 transition-all duration-500 ${
                            selectedDay === dayNumber
                              ? 'bg-blue-100'
                              : 'bg-blue-300'
                          }`}
                          style={{ width: `${dayProgressPercentage}%` }}
                        ></div>

                        {/* Content */}
                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Day {dayNumber}</p>
                            <p className={`text-xs ${
                              selectedDay === dayNumber ? 'text-blue-500' : 'text-gray-600'
                            }`}>
                              {dayCompletedSubtopics}/{dayTotalSubtopics} subtopics
                            </p>
                          </div>
                          {dayCompletedSubtopics > 0 && dayCompletedSubtopics === dayTotalSubtopics ? (
                            <div className={`text-sm font-bold ${
                              selectedDay === dayNumber ? 'text-green-600' : 'text-green-600'
                            }`}>
                              ✓
                            </div>
                          ) : dayCompletedSubtopics > 0 ? (
                            <div className={`text-sm font-bold ${
                              selectedDay === dayNumber ? 'text-yellow-600' : 'text-yellow-500'
                            }`}>
                              ⏳
                            </div>
                          ) : null}
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
