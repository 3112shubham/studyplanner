'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const PlanContext = createContext({});

export const usePlan = () => useContext(PlanContext);

export const PlanProvider = ({ children }) => {
  const { user, userData } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});

  // Listen to plan changes
  useEffect(() => {
    if (!user || !userData?.currentPlan?.planId) {
      setCurrentPlan(null);
      setLoading(false);
      return;
    }

    const planId = userData.currentPlan.planId;
    const unsubscribe = onSnapshot(doc(db, 'plans', planId), (doc) => {
      if (doc.exists()) {
        const planData = doc.data();
        setCurrentPlan(planData);
        
        // Initialize progress from plan
        if (planData.planData?.sections) {
          const initialProgress = {};
          planData.planData.sections.forEach(section => {
            section.days?.forEach(day => {
              day.subtopics?.forEach(subtopic => {
                initialProgress[subtopic.id] = subtopic.completed || false;
              });
            });
          });
          setProgress(initialProgress);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userData]);

  const markSubtopicsComplete = async (subtopicIds, completed = true) => {
    if (!user || !currentPlan) return;

    try {
      const updatedProgress = { ...progress };
      subtopicIds.forEach(id => {
        updatedProgress[id] = completed;
      });
      setProgress(updatedProgress);

      // Update in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        [`currentPlan.progress`]: updatedProgress,
        [`currentPlan.lastUpdated`]: new Date().toISOString(),
      });

      // Also update the plan document for analytics
      await updateDoc(doc(db, 'plans', currentPlan.planId), {
        [`userProgress.${user.uid}`]: updatedProgress,
        [`stats.lastActivity`]: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating progress:', error);
      return { success: false, error };
    }
  };

  const markDayComplete = async (sectionId, dayNumber, completed = true) => {
    if (!user || !currentPlan) return;

    try {
      // Find all subtopics for this day
      const section = currentPlan.planData?.sections?.find(s => s.sectionId === sectionId);
      if (!section) return { success: false, error: 'Section not found' };

      const day = section.days?.find(d => d.day === dayNumber);
      if (!day) return { success: false, error: 'Day not found' };

      const subtopicIds = day.subtopics?.map(st => st.id) || [];
      await markSubtopicsComplete(subtopicIds, completed);

      // Record day completion
      await updateDoc(doc(db, 'users', user.uid), {
        [`currentPlan.completedDays`]: arrayUnion({
          sectionId,
          day: dayNumber,
          completedAt: new Date().toISOString(),
        }),
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking day complete:', error);
      return { success: false, error };
    }
  };

  const calculateProgress = () => {
    if (!currentPlan || !progress) return { percentage: 0, completed: 0, total: 0 };

    const allSubtopics = [];
    currentPlan.planData?.sections?.forEach(section => {
      section.days?.forEach(day => {
        day.subtopics?.forEach(subtopic => {
          allSubtopics.push(subtopic.id);
        });
      });
    });

    const total = allSubtopics.length;
    if (total === 0) return { percentage: 0, completed: 0, total: 0 };

    const completed = allSubtopics.filter(id => progress[id]).length;
    const percentage = Math.round((completed / total) * 100);

    return { percentage, completed, total };
  };

  const getDayProgress = (sectionId, dayNumber) => {
    if (!currentPlan || !progress) return { percentage: 0, completed: 0, total: 0 };

    const section = currentPlan.planData?.sections?.find(s => s.sectionId === sectionId);
    if (!section) return { percentage: 0, completed: 0, total: 0 };

    const day = section.days?.find(d => d.day === dayNumber);
    if (!day || !day.subtopics) return { percentage: 0, completed: 0, total: 0 };

    const subtopics = day.subtopics;
    const total = subtopics.length;
    const completed = subtopics.filter(st => progress[st.id]).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { percentage, completed, total };
  };

  const getSectionProgress = (sectionId) => {
    if (!currentPlan || !progress) return { percentage: 0, completed: 0, total: 0 };

    const section = currentPlan.planData?.sections?.find(s => s.sectionId === sectionId);
    if (!section || !section.days) return { percentage: 0, completed: 0, total: 0 };

    let total = 0;
    let completed = 0;

    section.days.forEach(day => {
      day.subtopics?.forEach(subtopic => {
        total++;
        if (progress[subtopic.id]) completed++;
      });
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { percentage, completed, total };
  };

  const value = {
    currentPlan,
    loading,
    progress,
    markSubtopicsComplete,
    markDayComplete,
    calculateProgress,
    getDayProgress,
    getSectionProgress,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
};