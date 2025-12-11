import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    // Get userId from params
    let userId = params?.userId;
    
    // Fallback: try to get from query string if params is empty
    if (!userId) {
      const url = new URL(request.url);
      userId = url.searchParams.get('userId');
    }
    
    const authHeader = request.headers.get('Authorization');

    console.log('API: Received params:', params);
    console.log('API: userId from params:', userId);
    console.log('API: authHeader present:', !!authHeader);

    if (!authHeader || !userId) {
      console.log('ERROR: Missing authHeader:', !authHeader, 'Missing userId:', !userId);
      return NextResponse.json(
        { success: false, error: 'Missing required parameters', details: { authHeader: !!authHeader, userId: !!userId } },
        { status: 400 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

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
      console.error('User fetch failed:', userResponse.status, userResponse.statusText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    const currentPlanId = userData.fields?.currentPlan?.stringValue;

    if (!currentPlanId) {
      return NextResponse.json(
        { success: false, plan: null, message: 'No plan found for user' },
        { status: 200 }
      );
    }

    // Fetch the plan document
    const planResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/plans/${currentPlanId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!planResponse.ok) {
      console.error('Plan fetch failed:', planResponse.status, planResponse.statusText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch plan' },
        { status: planResponse.status }
      );
    }

    const planData = await planResponse.json();
    const planContent = JSON.parse(planData.fields?.planData?.stringValue || '{}');

    return NextResponse.json({
      success: true,
      plan: planContent,
      planId: currentPlanId,
      createdAt: planData.fields?.createdAt?.timestampValue,
    });

  } catch (error) {
    console.error('Fetch plan error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}
