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

    // Fetch all plan requests from Firestore
    const firestoreResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/planRequests`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!firestoreResponse.ok) {
      console.error('Firestore error:', firestoreResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch requests' },
        { status: firestoreResponse.status }
      );
    }

    const data = await firestoreResponse.json();
    const documents = data.documents || [];

    // Transform Firestore documents to readable format
    const requests = documents.map(doc => {
      const fields = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        userId: fields.userId?.stringValue || '',
        userEmail: fields.userEmail?.stringValue || '',
        userName: fields.userName?.stringValue || '',
        days: fields.days?.integerValue || 0,
        topicStrengths: fields.topicStrengths?.mapValue?.fields || {},
        status: fields.status?.stringValue || 'pending',
        createdAt: fields.createdAt?.timestampValue || '',
        approvedAt: fields.approvedAt?.timestampValue || null,
        approvedBy: fields.approvedBy?.stringValue || '',
      };
    });

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
    });

  } catch (error) {
    console.error('Admin requests error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch requests' },
      { status: 400 }
    );
  }
}
