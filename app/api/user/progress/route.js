import { NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Decode token to get userId
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const userId = decodedPayload.user_id || decodedPayload.uid;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Could not extract user ID from token' },
          { status: 401 }
        );
      }

      // Fetch progress from Firestore
      const progressDocResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/progress/studies`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (progressDocResponse.status === 404) {
        // No progress yet, return empty
        return NextResponse.json(
          { success: true, progress: {} },
          { status: 200 }
        );
      }

      if (!progressDocResponse.ok) {
        console.error('Progress fetch failed:', progressDocResponse.status);
        return NextResponse.json(
          { success: true, progress: {} },
          { status: 200 }
        );
      }

      const progressData = await progressDocResponse.json();

      // Extract progress data from Firestore document
      const progress = {};
      if (progressData.fields) {
        Object.keys(progressData.fields).forEach(key => {
          progress[key] = progressData.fields[key].booleanValue || false;
        });
      }

      return NextResponse.json(
        { success: true, progress },
        { status: 200 }
      );
    } catch (error) {
      console.error('Token decode error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const requestBody = await request.json();
    
    // Check if this is a batch update or single update
    const isBatch = Array.isArray(requestBody.batch);
    const updates = isBatch ? requestBody.batch : [{
      dayNumber: requestBody.dayNumber,
      subjectIdx: requestBody.subjectIdx,
      topicIndex: requestBody.topicIndex,
      subtopicIndex: requestBody.subtopicIndex,
      completed: requestBody.completed
    }];

    // Decode token to get userId
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const userId = decodedPayload.user_id || decodedPayload.uid;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Could not extract user ID from token' },
        { status: 401 }
      );
    }

    // Group updates by day for efficient processing
    const updatesByDay = {};
    updates.forEach(update => {
      const dayKey = update.dayNumber;
      if (!updatesByDay[dayKey]) updatesByDay[dayKey] = [];
      updatesByDay[dayKey].push(update);
    });

    // Process updates day by day
    for (const dayNumber in updatesByDay) {
      const dayDocName = `Day_${String(dayNumber).padStart(2, '0')}`;
      const dayUpdates = updatesByDay[dayNumber];
      
      // Fetch the day document
      const dayDocResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/planDays/${dayDocName}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!dayDocResponse.ok) continue;

      const dayDocData = await dayDocResponse.json();
      const fields = dayDocData.fields || {};
      const subtopicsArray = fields.subtopics?.arrayValue?.values || [];

      // Apply all updates for this day
      dayUpdates.forEach(({ subjectIdx, topicIndex, subtopicIndex, completed }) => {
        if (subtopicsArray[subjectIdx]) {
          const subjectMap = subtopicsArray[subjectIdx].mapValue?.fields || {};
          const topicsArray = subjectMap.topics?.arrayValue?.values || [];

          if (topicsArray[topicIndex]) {
            const topicMap = topicsArray[topicIndex].mapValue?.fields || {};
            const subtopicsInTopic = topicMap.subtopics?.arrayValue?.values || [];

            if (subtopicsInTopic[subtopicIndex]) {
              subtopicsInTopic[subtopicIndex].mapValue.fields.checked = { booleanValue: completed };
            }
          }
        }
      });

      // Send PATCH request for this day
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/planDays/${dayDocName}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fields: {
              ...fields,
              subtopics: { arrayValue: { values: subtopicsArray } },
            }
          }),
        }
      );
    }

    // Calculate overall progress from all days
    const allDaysResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/planDays?pageSize=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    let totalSubtopics = 0;
    let completedSubtopics = 0;

    if (allDaysResponse.ok) {
      const allDaysData = await allDaysResponse.json();
      const dayDocuments = allDaysData.documents || [];

      dayDocuments.forEach(dayDoc => {
        const daySubtopics = dayDoc.fields?.subtopics?.arrayValue?.values || [];
        daySubtopics.forEach(subjectValue => {
          const topics = subjectValue.mapValue?.fields?.topics?.arrayValue?.values || [];
          topics.forEach(topicValue => {
            const subtopics = topicValue.mapValue?.fields?.subtopics?.arrayValue?.values || [];
            subtopics.forEach(subtopicValue => {
              totalSubtopics++;
              if (subtopicValue.mapValue?.fields?.checked?.booleanValue === true) {
                completedSubtopics++;
              }
            });
          });
        });
      });
    }

    const overallProgress = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

    // Update user document with overall progress stats
    try {
      const existingUserResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      let existingUserFields = {};
      if (existingUserResponse.ok) {
        const existingUserDoc = await existingUserResponse.json();
        existingUserFields = existingUserDoc.fields || {};
      }

      // Update user document while preserving all existing fields
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fields: {
              ...existingUserFields,
              progressPercentage: { integerValue: overallProgress },
              completedSubtopics: { integerValue: completedSubtopics },
              lastProgressUpdate: { timestampValue: new Date().toISOString() }
            }
          }),
        }
      );
    } catch (error) {
      // Continue even if user stats update fails
    }

    return NextResponse.json(
      { 
        success: true, 
        progress: overallProgress, 
        completed: completedSubtopics, 
        total: totalSubtopics 
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
