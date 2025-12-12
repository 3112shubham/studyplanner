'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getApiUrl } from '@/lib/api';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ChevronLeft, Check } from 'lucide-react';
import PlanViewer from '@/components/User/PlanViewer';

// Debounce helper
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function PlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [progress, setProgress] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const offlineQueueRef = useRef([]); // Queue for offline updates

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

  // Build progress object whenever plan changes (memoized)
  useEffect(() => {
    if (currentPlan) {
      buildProgressFromPlan();
      // Set default day after plan loads
      if (currentPlan.days && currentPlan.days.length > 0) {
        const dayNumberToSelect = currentPlan.days[0].dayNumber || 1;
        setSelectedDay(dayNumberToSelect);
      }
    }
  }, [currentPlan]);

  // Restore scroll position on mount and save on scroll
  useEffect(() => {
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem('planPageScrollPosition');
      if (savedPosition) {
        // Scroll immediately without flicker
        window.scrollY = parseInt(savedPosition);
        document.documentElement.scrollTop = parseInt(savedPosition);
        document.body.scrollTop = parseInt(savedPosition);
        sessionStorage.removeItem('planPageScrollPosition');
      }
    };

    // Restore immediately after plan loads
    if (currentPlan) {
      restoreScrollPosition();
    }

    // Save scroll position before unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem('planPageScrollPosition', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPlan]);

  const fetchUserPlan = useCallback(async () => {
    try {
      setPlanLoading(true);
      
      if (!user?.uid) {
        setPlanLoading(false);
        return;
      }

      // Check if plan is already cached in localStorage - include userId
      let cachedPlan = localStorage.getItem(`userPlan_${user.uid}`);
      let cacheTimestamp = localStorage.getItem(`userPlanCacheTime_${user.uid}`);
      
      // If not found, check dashboard cache as fallback
      if (!cachedPlan) {
        cachedPlan = localStorage.getItem(`userDashboardPlan_${user.uid}`);
        cacheTimestamp = localStorage.getItem(`userDashboardPlanCacheTime_${user.uid}`);
      }
      
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes
      
      if (cachedPlan && cacheTimestamp) {
        const timeSinceCached = Date.now() - parseInt(cacheTimestamp);
        if (timeSinceCached < cacheExpiry) {
          const parsedPlan = JSON.parse(cachedPlan);
          // Ensure plan has days array
          if (parsedPlan.days) {
            setCurrentPlan(parsedPlan);
            setPlanLoading(false);
            return;
          }
        }
      }

      // Fetch directly from Firestore - MUCH FASTER
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        setCurrentPlan(null);
        setPlanLoading(false);
        return;
      }

      const userData = userSnapshot.data();
      const planId = userData.currentPlan;

      if (!planId) {
        setCurrentPlan(null);
        setPlanLoading(false);
        return;
      }

      // Fetch all planDays for this user
      const planDaysRef = collection(db, 'users', user.uid, 'planDays');
      const planDaysSnapshot = await getDocs(planDaysRef);

      if (planDaysSnapshot.empty) {
        setCurrentPlan(null);
        setPlanLoading(false);
        return;
      }

      // Build plan object from planDays
      const days = [];
      planDaysSnapshot.forEach(doc => {
        const dayData = doc.data();
        days.push(dayData);
      });

      // Sort days by day number
      days.sort((a, b) => a.dayNumber - b.dayNumber);

      const plan = {
        id: planId,
        days: days,
        createdAt: userData.currentPlanCreatedAt,
      };

      // Cache the plan - include userId
      localStorage.setItem(`userPlan_${user.uid}`, JSON.stringify(plan));
      localStorage.setItem(`userPlanCacheTime_${user.uid}`, Date.now().toString());
      setCurrentPlan(plan);
    } catch (error) {
      toast.error('Error loading plan');
      setCurrentPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, [user?.uid]);

  const buildProgressFromPlan = useCallback(() => {
    if (!currentPlan?.days) return;
    
    const newProgress = {};
    for (let i = 0; i < currentPlan.days.length; i++) {
      const day = currentPlan.days[i];
      const dayNumber = day.dayNumber;
      if (!day.subtopics) continue;
      
      for (let si = 0; si < day.subtopics.length; si++) {
        const subject = day.subtopics[si];
        if (!subject.topics) continue;
        
        for (let ti = 0; ti < subject.topics.length; ti++) {
          const topic = subject.topics[ti];
          if (!topic.subtopics) continue;
          
          for (let sti = 0; sti < topic.subtopics.length; sti++) {
            const progressKey = `day_${dayNumber}_subject_${si}_topic_${ti}_subtopic_${sti}`;
            newProgress[progressKey] = topic.subtopics[sti].checked === true;
          }
        }
      }
    }
    setProgress(newProgress);
  }, [currentPlan]);

  const handleTopicCheck = useCallback((dayNumber, subjectIdx, topicIndex, subtopicIndex, isChecked) => {
    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }

    const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIndex}_subtopic_${subtopicIndex}`;

    // Update local state immediately for instant UI feedback
    setProgress(prev => ({
      ...prev,
      [progressKey]: isChecked
    }));

    // Direct Firestore update - NO API CALL
    const updateFirestore = async () => {
      try {
        const dayDocName = `Day_${String(dayNumber).padStart(2, '0')}`;
        const dayDocRef = doc(db, 'users', user.uid, 'planDays', dayDocName);
        
        // Get current document
        const daySnapshot = await getDoc(dayDocRef);
        if (!daySnapshot.exists()) {
          toast.error('Day document not found');
          return;
        }

        const dayData = daySnapshot.data();
        const subtopicsArray = dayData.subtopics || [];

        // Navigate the nested structure and update the specific subtopic
        if (subtopicsArray[subjectIdx]) {
          const subject = subtopicsArray[subjectIdx];
          if (subject.topics && subject.topics[topicIndex]) {
            const topic = subject.topics[topicIndex];
            if (topic.subtopics && topic.subtopics[subtopicIndex]) {
              // Update the subtopic's checked status
              topic.subtopics[subtopicIndex].checked = isChecked;
              
              // Persist back to Firestore
              await updateDoc(dayDocRef, {
                subtopics: subtopicsArray
              });

              // Invalidate plan cache so next fetch gets fresh data
              localStorage.removeItem(`userPlan_${user.uid}`);
              localStorage.removeItem(`userPlanCacheTime_${user.uid}`);
              localStorage.removeItem(`userDashboardPlan_${user.uid}`);
              localStorage.removeItem(`userDashboardPlanCacheTime_${user.uid}`);

              toast.success(`✓ Saved`, {
                duration: 1,
                icon: '💾',
              });
            }
          }
        }
      } catch (error) {
        // If offline, queue the update
        if (!navigator.onLine) {
          offlineQueueRef.current.push({
            dayNumber,
            subjectIdx,
            topicIndex,
            subtopicIndex,
            isChecked,
            timestamp: Date.now()
          });
          toast.info('Offline - will sync when online', { duration: 2 });
        } else {
          // Revert on error
          setProgress(prev => {
            const updated = { ...prev };
            delete updated[progressKey];
            return updated;
          });
          toast.error('Failed to save progress');
        }
      }
    };

    // Execute Firestore update
    updateFirestore();
  }, [user?.uid]);

  // Handle online/offline transitions
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (!navigator.onLine || offlineQueueRef.current.length === 0) return;

      const queue = [...offlineQueueRef.current];
      
      for (const update of queue) {
        try {
          const dayDocName = `Day_${String(update.dayNumber).padStart(2, '0')}`;
          const dayDocRef = doc(db, 'users', user.uid, 'planDays', dayDocName);
          
          const daySnapshot = await getDoc(dayDocRef);
          if (!daySnapshot.exists()) continue;

          const dayData = daySnapshot.data();
          const subtopicsArray = dayData.subtopics || [];

          if (subtopicsArray[update.subjectIdx]?.topics?.[update.topicIndex]?.subtopics?.[update.subtopicIndex]) {
            subtopicsArray[update.subjectIdx].topics[update.topicIndex].subtopics[update.subtopicIndex].checked = update.isChecked;
            
            await updateDoc(dayDocRef, { subtopics: subtopicsArray });
            offlineQueueRef.current = offlineQueueRef.current.filter(u => u.timestamp !== update.timestamp);
          }
        } catch (error) {
          // Keep trying
        }
      }

      if (offlineQueueRef.current.length === 0) {
        toast.success('All offline changes synced!', { duration: 2 });
        localStorage.removeItem('userPlan');
        localStorage.removeItem('userPlanCacheTime');
      }
    };

    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, [user?.uid]);

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes float-delay-1 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes float-delay-2 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes float-delay-3 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse-scale {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .float-1 { animation: float 3s ease-in-out infinite; }
          .float-2 { animation: float-delay-1 3s ease-in-out infinite 0.2s; }
          .float-3 { animation: float-delay-2 3s ease-in-out infinite 0.4s; }
          .float-4 { animation: float-delay-3 3s ease-in-out infinite 0.6s; }
          .spin-slow { animation: spin-slow 4s linear infinite; }
          .pulse-scale { animation: pulse-scale 2s ease-in-out infinite; }
        `}</style>
        
        <div className="text-center">
          {/* Main Loading Icon */}
          <div className="mb-4 sm:mb-8 relative w-24 sm:w-32 h-24 sm:h-32 mx-auto">
            {/* Outer rotating circle */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500 spin-slow"></div>
            
            {/* Middle circle */}
            <div className="absolute inset-4 rounded-full border-3 border-transparent border-b-purple-500 border-l-purple-400" style={{animation: 'spin-slow 3s linear infinite reverse'}}></div>
            
            {/* Inner pulsing circle */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 pulse-scale flex items-center justify-center text-white text-2xl">
              📚
            </div>
          </div>

          {/* Animated text */}
          <div className="mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">
              Loading Your Study Plan
            </h2>
            <p className="text-gray-600 text-xs sm:text-lg mb-3 sm:mb-4">
              Preparing your personalized learning journey
            </p>
            
            {/* Animated dots */}
            <div className="flex justify-center gap-1 sm:gap-2">
              <div className="float-1 w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full"></div>
              <div className="float-2 w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full"></div>
              <div className="float-3 w-2 h-2 sm:w-3 sm:h-3 bg-pink-500 rounded-full"></div>
              <div className="float-4 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full"></div>
            </div>
          </div>

          {/* Progress bar with gradient animation */}
          <div className="w-48 sm:w-64 sm:w-80 mx-auto">
            <div className="w-full h-1 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                style={{
                  animation: 'linear infinite',
                  backgroundSize: '200% 200%',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              ></div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">This usually takes a few seconds...</p>
          </div>

          {/* Fun facts while loading */}
          <div className="mt-4 sm:mt-8 text-xs sm:text-sm text-gray-600 max-w-xs mx-auto">
            <p className="italic">💡 Did you know? Breaking study into smaller chunks boosts retention!</p>
          </div>
        </div>
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
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Floating Back Button - Desktop Only */}
      <button
        onClick={() => router.push('/dashboard')}
        className="hidden sm:flex fixed top-20 left-4 z-40 items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        aria-label="Go back to dashboard"
        title="Back to Dashboard"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Mobile Day Selector - Collapsible Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-b border-gray-200">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-900">📅 Select Day</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-white hover:bg-red-50 text-red-600 font-semibold py-1 px-2 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap text-sm"
                    title="Close"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const cacheKeyPlan = `userPlan_${user.uid}`;
                      const cacheKeyTime = `userPlanCacheTime_${user.uid}`;
                      const cacheKeyDashboard = `userDashboardPlan_${user.uid}`;
                      const cacheKeyDashboardTime = `userDashboardPlanCacheTime_${user.uid}`;
                      localStorage.removeItem(cacheKeyPlan);
                      localStorage.removeItem(cacheKeyTime);
                      localStorage.removeItem(cacheKeyDashboard);
                      localStorage.removeItem(cacheKeyDashboardTime);
                      setCurrentPlan(null);
                      setProgress({});
                      fetchUserPlan();
                    }}
                    className="bg-white hover:bg-blue-50 text-blue-600 font-semibold py-1 px-2 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap text-sm"
                    title="Refresh data from database"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3">Total: {currentPlan.days?.length || 35} days</p>
              
              {/* Horizontal Scrollable Day List */}
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-2 pb-2">
                  {currentPlan.days?.map((day, index) => {
                    const dayNumber = day.dayNumber || (index + 1);
                    
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
                        className={`flex-shrink-0 px-3 py-2 rounded-lg transition-all relative overflow-hidden border-2 min-w-max ${
                          selectedDay === dayNumber
                            ? 'bg-white text-blue-600 border-blue-600 shadow-lg'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border-gray-200'
                        }`}
                      >
                        {/* Vertical Progress Fill - Bottom to Top */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
                            selectedDay === dayNumber ? 'bg-blue-100' : 'bg-blue-300'
                          }`}
                          style={{ height: `${dayProgressPercentage}%` }}
                        ></div>
                        <div className="relative">
                          <p className="font-semibold text-sm">D{dayNumber}</p>
                          <p className={`text-xs ${
                            selectedDay === dayNumber ? 'text-blue-500' : 'text-gray-600'
                          }`}>
                            {dayCompletedSubtopics}/{dayTotalSubtopics}
                          </p>
                          {dayCompletedSubtopics > 0 && dayCompletedSubtopics === dayTotalSubtopics && (
                            <div className="text-xs font-bold text-green-600 mt-1">✓</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Collapsed Navbar - Show when panel is hidden */}
        {!mobileMenuOpen && (
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-full bg-white rounded-xl shadow-md p-4 border-b border-gray-200 flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <h2 className="text-base font-bold text-gray-900">📅 Select Day</h2>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Side Panel - Day Selector (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md sticky top-8 h-[calc(100vh-6rem)]">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-bold text-gray-900">📅 Select Day</h2>
                  <button
                    onClick={() => {
                      const cacheKeyPlan = `userPlan_${user.uid}`;
                      const cacheKeyTime = `userPlanCacheTime_${user.uid}`;
                      const cacheKeyDashboard = `userDashboardPlan_${user.uid}`;
                      const cacheKeyDashboardTime = `userDashboardPlanCacheTime_${user.uid}`;
                      localStorage.removeItem(cacheKeyPlan);
                      localStorage.removeItem(cacheKeyTime);
                      localStorage.removeItem(cacheKeyDashboard);
                      localStorage.removeItem(cacheKeyDashboardTime);
                      setCurrentPlan(null);
                      setProgress({});
                      fetchUserPlan();
                    }}
                    className="bg-white hover:bg-blue-50 text-blue-600 font-semibold py-1 px-2 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap"
                    title="Refresh data from database"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">Total: {currentPlan.days?.length || 35} days</p>
              </div>

              <div className="p-4 max-h-[calc(100vh-14rem)] overflow-y-auto">
                <div className="space-y-2">
                  {currentPlan.days?.map((day, index) => {
                    const dayNumber = day.dayNumber || (index + 1);
                    
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
                        <div
                          className={`absolute inset-0 transition-all duration-500 ${
                            selectedDay === dayNumber
                              ? 'bg-blue-100'
                              : 'bg-blue-300'
                          }`}
                          style={{ width: `${dayProgressPercentage}%` }}
                        ></div>

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
                  <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 text-center">
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
              <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 text-center">
                <p className="text-gray-600">Day not found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
