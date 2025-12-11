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
    const { dayNumber, subjectIdx, topicIndex, subtopicIndex, completed } = requestBody;

    console.log('Progress POST received:', { dayNumber, subjectIdx, topicIndex, subtopicIndex, completed });

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

      console.log('Decoded userId:', userId);

      // Get the day document name
      const dayDocName = `Day_${String(dayNumber).padStart(2, '0')}`;
      console.log('Fetching day document:', dayDocName);
      
      // Fetch the planDay document to get current subtopics structure
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

      if (!dayDocResponse.ok) {
        console.error('Failed to fetch day document:', dayDocResponse.status);
        const errorData = await dayDocResponse.json();
        console.error('Day document fetch error:', errorData);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch day document', details: errorData },
          { status: 400 }
        );
      }

      const dayDocData = await dayDocResponse.json();
      const fields = dayDocData.fields || {};

      console.log('Day document fields keys:', Object.keys(fields));

      // Parse current subtopics array
      const subtopicsArray = fields.subtopics?.arrayValue?.values || [];
      console.log('Subtopics array length:', subtopicsArray.length);
      console.log('Checking indices:', { subjectIdx, topicIndex, subtopicIndex });

      // Update the specific subtopic's checked field
      if (subtopicsArray[subjectIdx]) {
        const subjectMap = subtopicsArray[subjectIdx].mapValue?.fields || {};
        const topicsArray = subjectMap.topics?.arrayValue?.values || [];
        console.log('Topics array length:', topicsArray.length);

        if (topicsArray[topicIndex]) {
          const topicMap = topicsArray[topicIndex].mapValue?.fields || {};
          const subtopicsInTopic = topicMap.subtopics?.arrayValue?.values || [];
          console.log('Subtopics in topic length:', subtopicsInTopic.length);

          if (subtopicsInTopic[subtopicIndex]) {
            // Update the checked field
            console.log(`Updating subtopic[${subjectIdx}][${topicIndex}][${subtopicIndex}] to ${completed}`);
            subtopicsInTopic[subtopicIndex].mapValue.fields.checked = { booleanValue: completed };
          } else {
            console.error(`Subtopic index ${subtopicIndex} not found in topics`);
          }
        } else {
          console.error(`Topic index ${topicIndex} not found in subject`);
        }
      } else {
        console.error(`Subject index ${subjectIdx} not found in subtopics array`);
      }

      // Update the planDay document with modified subtopics
      console.log('Sending PATCH request to update day document');
      const updateResponse = await fetch(
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
              updatedAt: { timestampValue: new Date().toISOString() }
            }
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error('Failed to update day document:', updateResponse.status, error);
        return NextResponse.json(
          { success: false, error: 'Failed to update progress', details: error },
          { status: 500 }
        );
      }

      const updateResponseData = await updateResponse.json();
      console.log(`Updated ${dayDocName} subtopic[${subjectIdx}][${topicIndex}][${subtopicIndex}] to ${completed}`);
      console.log('Update response:', updateResponseData);

      // Now calculate overall progress across all days
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
          console.log('Existing user fields preserved:', Object.keys(existingUserFields));
        }

        // Update user document while preserving all existing fields
        const userDocResponse = await fetch(
          `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              fields: {
                ...existingUserFields, // Include all existing fields
                progressPercentage: { integerValue: overallProgress },
                completedSubtopics: { integerValue: completedSubtopics },
                lastProgressUpdate: { timestampValue: new Date().toISOString() }
              }
            }),
          }
        );

        if (!userDocResponse.ok) {
          console.error('Failed to update user progress:', userDocResponse.status);
        }
      } catch (error) {
        console.error('Error updating user progress:', error);
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Progress updated', 
          progress: overallProgress, 
          completed: completedSubtopics, 
          total: totalSubtopics 
        },
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
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
