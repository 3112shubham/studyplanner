import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { requestId, planData, approvedBy } = await request.json();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    if (!requestId || !planData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Get the plan request to find userId
    const getRequestResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests/${requestId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!getRequestResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch plan request' },
        { status: 400 }
      );
    }

    const requestData = await getRequestResponse.json();
    const userId = requestData.fields?.userId?.stringValue;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 400 }
      );
    }

    // Create plan document
    const planDocId = `plan_${Date.now()}`;
    
    // Extract day-wise details from planData sections
    const dayDetails = extractDayDetails(planData);

    const createPlanResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/plans?documentId=${planDocId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: userId },
            requestId: { stringValue: requestId },
            planName: { stringValue: planData.planName || 'Study Plan' },
            totalDays: { integerValue: planData.totalDays || 0 },
            dailyHours: { integerValue: planData.dailyHours || 0 },
            createdBy: { stringValue: approvedBy },
            createdAt: { timestampValue: new Date().toISOString() },
            status: { stringValue: 'active' },
          },
        }),
      }
    );

    if (!createPlanResponse.ok) {
      const error = await createPlanResponse.json();
      console.error('Plan creation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create plan' },
        { status: 400 }
      );
    }

    // Create day subcollections in users document
    await createDaySubcollections(userId, planDocId, dayDetails, token);

    // Update the plan request status to approved
    const updateRequestResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests/${requestId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fields: {
            status: { stringValue: 'approved' },
            approvedAt: { timestampValue: new Date().toISOString() },
            approvedBy: { stringValue: approvedBy },
            planId: { stringValue: planDocId },
          },
        }),
      }
    );

    if (!updateRequestResponse.ok) {
      console.error('Request update error:', await updateRequestResponse.json());
    }

    // First, fetch the existing user document to preserve all fields
    const getUserResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    let existingFields = {};
    if (getUserResponse.ok) {
      const existingUser = await getUserResponse.json();
      existingFields = existingUser.fields || {};
      console.log('Existing user fields:', Object.keys(existingFields));
    }

    // Update user document with current plan while preserving all existing fields
    const updateUserData = {
      fields: {
        ...existingFields, // Include all existing fields
        currentPlan: { stringValue: planDocId },
        planRequestStatus: { stringValue: 'approved' },
        currentPlanCreatedAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    };

    const updateUserResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateUserData),
      }
    );

    if (!updateUserResponse.ok) {
      const errorData = await updateUserResponse.json();
      console.error('User update error:', errorData);
      // Log detailed error info
      console.error('Failed to update user document with fields:', Object.keys(updateUserData.fields));
    } else {
      console.log('User document updated successfully with plan:', planDocId);
    }

    return NextResponse.json({
      success: true,
      planId: planDocId,
      message: 'Plan created and approved successfully!'
    });

  } catch (error) {
    console.error('Upload plan error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload plan' },
      { status: 400 }
    );
  }
}

// Extract day-wise details from plan data
function extractDayDetails(planData) {
  const dayDetails = {};
  
  console.log('Extracting day details from planData:', Object.keys(planData));
  
  // Handle both old format (sections with days) and new format (dayX keys)
  if (planData.sections && Array.isArray(planData.sections)) {
    // Old format handling
    console.log('Using old format (sections with days)');
    planData.sections.forEach(section => {
      if (section.days && Array.isArray(section.days)) {
        section.days.forEach(day => {
          const dayKey = `Day ${String(day.day).padStart(2, '0')}`;
          if (!dayDetails[dayKey]) {
            dayDetails[dayKey] = {
              dayNumber: day.day,
              title: day.title || '',
              section: section.name || '',
              sectionId: section.sectionId || '',
              topics: day.topics || [],
              hours: day.hours || 0,
              pyqFocus: day.pyqFocus || '',
              subtopics: day.subtopics || [],
              completed: day.completed || false,
            };
          }
        });
      }
    });
  } else {
    // New format: dayX keys directly in planData
    console.log('Using new format (dayX keys)');
    Object.entries(planData).forEach(([key, value]) => {
      if (key.match(/^day\d+$/i) && value && value.subjects && Array.isArray(value.subjects)) {
        const dayNumber = parseInt(key.replace(/\D/g, ''));
        const dayKey = `Day_${String(dayNumber).padStart(2, '0')}`;
        
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
        
        dayDetails[dayKey] = {
          dayNumber: dayNumber,
          title: mainTitle,
          section: value.subjects[0]?.name || 'General',
          sectionId: (value.subjects[0]?.name || 'general').toLowerCase().replace(/\s+/g, '_'),
          topics: allTopics,
          hours: Math.round(totalHours * 100) / 100, // Round to 2 decimals
          pyqFocus: '',
          subtopics: allSubjects,
          completed: false,
        };
        
        console.log(`Extracted ${dayKey}:`, {
          title: mainTitle,
          topics: allTopics.length,
          hours: totalHours,
          subjects: allSubjects.length
        });
      }
    });
  }
  
  console.log('Total days extracted:', Object.keys(dayDetails).length);
  return dayDetails;
}

// Create day subcollections in users document
async function createDaySubcollections(userId, planDocId, dayDetails, token) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    for (const [dayKey, dayData] of Object.entries(dayDetails)) {
      const docName = dayKey.replace(/\s+/g, '_'); // Day_01, Day_02, etc.
      
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/planDays?documentId=${docName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fields: {
              planId: { stringValue: planDocId },
              dayNumber: { integerValue: dayData.dayNumber },
              title: { stringValue: dayData.title || '' },
              section: { stringValue: dayData.section || '' },
              sectionId: { stringValue: dayData.sectionId || '' },
              topics: { arrayValue: { values: (dayData.topics || []).map(t => ({ stringValue: String(t) })) } },
              hours: { doubleValue: parseFloat(dayData.hours) || 0 },
              pyqFocus: { stringValue: dayData.pyqFocus || '' },
              subtopics: { stringValue: JSON.stringify(dayData.subtopics || []) },
              completed: { booleanValue: dayData.completed || false },
              createdAt: { timestampValue: new Date().toISOString() },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error(`Error creating day ${docName}:`, error);
        throw new Error(`Failed to create day ${docName}: ${JSON.stringify(error)}`);
      }
      
      console.log(`Successfully created day ${docName}`);
    }
  } catch (error) {
    console.error('Error creating day subcollections:', error);
    throw error;
  }
}
