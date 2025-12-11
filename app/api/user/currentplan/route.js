import { NextResponse } from 'next/server';

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
      
      // Decode the payload (second part)
      const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const userId = decodedPayload.user_id || decodedPayload.uid;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Could not extract user ID from token' },
          { status: 401 }
        );
      }

      console.log('Fetching plan for user:', userId);

      // Fetch user document to get current plan ID
      const userResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!userResponse.ok) {
        console.error('User fetch failed:', userResponse.status);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch user' },
          { status: userResponse.status }
        );
      }

      const userData = await userResponse.json();
      const currentPlanId = userData.fields?.currentPlan?.stringValue;

      if (!currentPlanId) {
        return NextResponse.json(
          { success: true, plan: null, message: 'No plan found for user' },
          { status: 200 }
        );
      }

      console.log('Fetching plan days for planId:', currentPlanId);

      // Fetch all day documents from the planDays subcollection
      const planDaysResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/planDays?pageSize=100`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!planDaysResponse.ok) {
        console.error('Plan days fetch failed:', planDaysResponse.status);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch plan days' },
          { status: planDaysResponse.status }
        );
      }

      const planDaysData = await planDaysResponse.json();
      const dayDocuments = planDaysData.documents || [];

      // Filter documents that belong to this plan
      const planDays = dayDocuments
        .filter(doc => doc.fields?.planId?.stringValue === currentPlanId)
        .sort((a, b) => {
          const dayA = a.fields?.dayNumber?.integerValue || 0;
          const dayB = b.fields?.dayNumber?.integerValue || 0;
          return dayA - dayB;
        })
        .map(doc => ({
          dayNumber: doc.fields?.dayNumber?.integerValue,
          title: doc.fields?.title?.stringValue,
          section: doc.fields?.section?.stringValue,
          sectionId: doc.fields?.sectionId?.stringValue,
          topics: doc.fields?.topics?.arrayValue?.values?.map(v => v.stringValue) || [],
          hours: parseFloat(doc.fields?.hours?.doubleValue || doc.fields?.hours?.integerValue || 0),
          pyqFocus: doc.fields?.pyqFocus?.stringValue,
          subtopics: (() => {
            // Handle new structured format (array of maps)
            const subtopicsArray = doc.fields?.subtopics?.arrayValue?.values;
            if (!subtopicsArray) return [];
            
            return subtopicsArray.map(subjectValue => {
              const subjectFields = subjectValue.mapValue?.fields || {};
              return {
                name: subjectFields.name?.stringValue || '',
                strength_level: subjectFields.strength_level?.stringValue || 'moderate',
                topics: (subjectFields.topics?.arrayValue?.values || []).map(topicValue => {
                  const topicFields = topicValue.mapValue?.fields || {};
                  return {
                    name: topicFields.name?.stringValue || '',
                    weightage_percent: topicFields.weightage_percent?.integerValue || 0,
                    subtopics: (topicFields.subtopics?.arrayValue?.values || []).map(subtopicValue => {
                      const subtopicFields = subtopicValue.mapValue?.fields || {};
                      return {
                        name: subtopicFields.name?.stringValue || '',
                        checked: subtopicFields.checked?.booleanValue || false,
                        prep_time_hours: subtopicFields.prep_time_hours?.doubleValue || 0
                      };
                    })
                  };
                })
              };
            });
          })(),
          completed: doc.fields?.completed?.booleanValue || false,
        }));

      if (planDays.length === 0) {
        console.log('No plan days found for plan:', currentPlanId);
        return NextResponse.json(
          { success: true, plan: null, message: 'Plan days not found' },
          { status: 200 }
        );
      }

      console.log('Successfully fetched plan with', planDays.length, 'days');
      console.log('First day sample:', planDays[0]);

      return NextResponse.json({
        success: true,
        plan: {
          planId: currentPlanId,
          days: planDays,
          totalDays: planDays.length,
          duration: planDays.length,
        },
        planId: currentPlanId,
        createdAt: userData.fields?.currentPlanCreatedAt?.timestampValue,
      });

    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Fetch plan error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}
