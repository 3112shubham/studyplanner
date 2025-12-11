import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Check for pending plan requests for this user
    const queryResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests?pageSize=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const queryData = await queryResponse.json();
    const documents = queryData.documents || [];

    // Find pending request for this user
    const pendingRequest = documents.find(doc => {
      const userIdField = doc.fields?.userId?.stringValue;
      const statusField = doc.fields?.status?.stringValue;
      return userIdField === userId && statusField === 'pending';
    });

    if (pendingRequest) {
      return NextResponse.json({
        success: true,
        hasPendingRequest: true,
        requestId: pendingRequest.name.split('/').pop(),
        status: 'pending',
      });
    }

    return NextResponse.json({
      success: true,
      hasPendingRequest: false,
    });

  } catch (error) {
    console.error('Check plan request error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check plan request' },
      { status: 400 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received plan request body:', body);
    
    const { userId, days, topicStrengths, userName, userEmail } = body;

    // Validate required fields
    if (!userId || days === undefined || !topicStrengths) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate days is a number
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 7 || daysNum > 120) {
      return NextResponse.json(
        { success: false, error: 'Days must be a number between 7 and 120' },
        { status: 400 }
      );
    }

    console.log('Validation passed, creating plan request...');

    // Get auth token from the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Check for existing pending or approved requests
    const checkResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests?pageSize=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const checkData = await checkResponse.json();
    const documents = checkData.documents || [];

    // Check if user already has a pending or approved request
    const existingRequest = documents.find(doc => {
      const userIdField = doc.fields?.userId?.stringValue;
      const statusField = doc.fields?.status?.stringValue;
      return userIdField === userId && (statusField === 'pending' || statusField === 'approved');
    });

    if (existingRequest) {
      const status = existingRequest.fields?.status?.stringValue;
      return NextResponse.json(
        { 
          success: false, 
          error: `You already have a ${status} plan request. Please wait for admin approval.`,
          hasPendingRequest: true,
          status: status,
        },
        { status: 400 }
      );
    }

    // Transform topicStrengths to Firestore format
    const topicStrengthsFields = Object.entries(topicStrengths).reduce((acc, [key, value]) => {
      acc[key] = { stringValue: String(value) };
      return acc;
    }, {});

    // Step 1: Create plan request document in planRequests collection
    const firestoreResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: userId },
            userEmail: { stringValue: userEmail || '' },
            userName: { stringValue: userName || '' },
            days: { integerValue: daysNum },
            topicStrengths: { mapValue: { fields: topicStrengthsFields } },
            status: { stringValue: 'pending' },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    );

    const firestoreData = await firestoreResponse.json();

    if (!firestoreResponse.ok) {
      console.error('Firestore creation error:', {
        status: firestoreResponse.status,
        error: firestoreData
      });
      return NextResponse.json(
        { success: false, error: 'Failed to create plan request' },
        { status: firestoreResponse.status }
      );
    }

    const planRequestId = firestoreData.name.split('/').pop();
    console.log('Plan request created successfully:', planRequestId);

    // Step 2: Update user document with plan request reference
    const userUpdateResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fields: {
            planRequest: { stringValue: planRequestId },
            planRequestStatus: { stringValue: 'pending' },
            planRequestDate: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    );

    if (!userUpdateResponse.ok) {
      console.error('User update error:', await userUpdateResponse.json());
      // Still return success since the plan request was created
    } else {
      console.log('User document updated with plan request');
    }

    return NextResponse.json({
      success: true,
      planRequestId: planRequestId,
      message: 'Plan request submitted successfully! Admin will review and create your plan.'
    });

  } catch (error) {
    console.error('Plan request error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Plan request failed' },
      { status: 400 }
    );
  }
}
