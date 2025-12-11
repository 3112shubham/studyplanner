import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const { requestId, status, approvedBy } = await request.json();
    const token = authHeader.replace('Bearer ', '');

    if (!requestId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update request status in Firestore
    const updateData = {
      fields: {
        status: { stringValue: status },
      }
    };

    if (status === 'approved') {
      updateData.fields.approvedAt = { timestampValue: new Date().toISOString() };
      updateData.fields.approvedBy = { stringValue: approvedBy };
    }

    const firestoreResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests/${requestId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!firestoreResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to update request' },
        { status: firestoreResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Request ${status} successfully`,
    });

  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update request' },
      { status: 400 }
    );
  }
}
