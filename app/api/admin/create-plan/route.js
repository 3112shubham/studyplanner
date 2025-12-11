import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';

export async function POST(request) {
  try {
    const { adminId, userId, userEmail, planName, planData, requestData } = await request.json();

    // Create plan document
    const planRef = doc(collection(db, 'plans'));
    await setDoc(planRef, {
      planId: planRef.id,
      planName,
      planName: planData.planName || planName,
      totalDays: planData.totalDays || 0,
      dailyHours: planData.dailyHours || 0,
      createdBy: adminId,
      createdFor: userId,
      userEmail,
      requestData,
      createdAt: serverTimestamp(),
      isActive: true,
    });

    // Extract and create day subcollections
    await createDaySubcollections(userId, planRef.id, planData);

    // Update user document with plan (only update these specific fields)
    await updateDoc(doc(db, 'users', userId), {
      currentPlan: planRef.id,
      planRequestStatus: 'approved',
      currentPlanCreatedAt: serverTimestamp(),
    });

    // Update plan request status
    if (requestData?.requestId) {
      await updateDoc(doc(db, 'planRequests', requestData.requestId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: adminId,
        assignedPlanId: planRef.id,
      });
    }

    return NextResponse.json({
      success: true,
      planId: planRef.id,
      message: 'Plan created and assigned successfully'
    });

  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// Extract day-wise details from plan sections and create subcollections
async function createDaySubcollections(userId, planId, planData) {
  try {
    console.log('Creating day subcollections for user:', userId);
    
    // Handle both old format (sections with days) and new format (dayX keys)
    if (planData.sections && Array.isArray(planData.sections)) {
      // Old format handling
      console.log('Using old format (sections with days)');
      for (const section of planData.sections) {
        if (section.days && Array.isArray(section.days)) {
          for (const day of section.days) {
            const dayDocName = `Day_${String(day.day).padStart(2, '0')}`;
            const dayRef = doc(db, 'users', userId, 'planDays', dayDocName);

            await setDoc(dayRef, {
              planId,
              dayNumber: day.day,
              title: day.title || '',
              section: section.name || '',
              sectionId: section.sectionId || '',
              topics: day.topics || [],
              hours: day.hours || 0,
              pyqFocus: day.pyqFocus || '',
              subtopics: day.subtopics || [],
              completed: false,
              createdAt: serverTimestamp(),
            });
            
            console.log(`Created day document: ${dayDocName}`);
          }
        }
      }
    } else {
      // New format: dayX keys directly in planData
      console.log('Using new format (dayX keys)');
      for (const [key, value] of Object.entries(planData)) {
        if (key.match(/^day\d+$/i) && value && value.subjects && Array.isArray(value.subjects)) {
          const dayNumber = parseInt(key.replace(/\D/g, ''));
          const dayDocName = `Day_${String(dayNumber).padStart(2, '0')}`;
          
          // Extract title and topics from subjects
          let mainTitle = '';
          let allTopics = [];
          let totalHours = 0;
          let allSubjects = [];
          
          if (value.subjects.length > 0) {
            mainTitle = value.subjects[0].name || `Day ${dayNumber}`;
            
            // Collect all topics and hours from all subjects
            value.subjects.forEach(subject => {
              allSubjects.push(subject);
              if (subject.topics && Array.isArray(subject.topics)) {
                subject.topics.forEach(topic => {
                  if (topic.name) {
                    allTopics.push(topic.name);
                  }
                  if (topic.subtopics && Array.isArray(topic.subtopics)) {
                    totalHours += topic.subtopics.reduce((sum, st) => sum + (st.prep_time_hours || 0), 0);
                  }
                });
              }
            });
          }
          
          const dayRef = doc(db, 'users', userId, 'planDays', dayDocName);
          await setDoc(dayRef, {
            planId,
            dayNumber: dayNumber,
            title: mainTitle,
            section: value.subjects[0]?.name || 'General',
            sectionId: (value.subjects[0]?.name || 'general').toLowerCase().replace(/\s+/g, '_'),
            topics: allTopics,
            hours: Math.round(totalHours * 100) / 100,
            pyqFocus: '',
            subtopics: allSubjects,
            completed: false,
            createdAt: serverTimestamp(),
          });
          
          console.log(`Created day document: ${dayDocName} with ${allTopics.length} topics and ${totalHours} hours`);
        }
      }
    }
  } catch (error) {
    console.error('Error creating day subcollections:', error);
    throw error;
  }
}