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
    const { dayNumber, subjectIdx, topicIndex, subtopicIndex, completed } = await request.json();

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

      // Create progress key with all indices for unique identification
      const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIndex}_subtopic_${subtopicIndex}`;

      // Prepare the update data
      const updateData = {
        fields: {
          [progressKey]: { booleanValue: completed },
          lastUpdated: { timestampValue: new Date().toISOString() }
        }
      };

      // First, get the current document
      const getResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/progress/studies`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      let existingData = {};
      if (getResponse.ok) {
        const existingDoc = await getResponse.json();
        if (existingDoc.fields) {
          existingData = existingDoc.fields;
        }
      }

      // Merge with existing data
      const mergedData = {
        ...existingData,
        [progressKey]: { booleanValue: completed },
        lastUpdated: { timestampValue: new Date().toISOString() }
      };

      // Update progress in Firestore
      const updateResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/progress/studies`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ fields: mergedData }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error('Progress update failed:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update progress' },
          { status: 500 }
        );
      }

      // Calculate overall progress
      const completedCount = Object.values(mergedData).filter(field => field.booleanValue === true).length;
      const totalSubtopics = Object.keys(mergedData).filter(key => key.startsWith('day_')).length;
      const overallProgress = totalSubtopics > 0 ? Math.round((completedCount / totalSubtopics) * 100) : 0;

      // Update user's overall progress in the main user document
      try {
        // First, fetch the existing user document to preserve all fields
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
                completedSubtopics: { integerValue: completedCount },
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
        // Don't fail the request if user doc update fails
      }

      return NextResponse.json(
        { success: true, message: 'Progress updated', progress: overallProgress, completed: completedCount, total: totalSubtopics },
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
