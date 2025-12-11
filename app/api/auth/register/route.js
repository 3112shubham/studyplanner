import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Call Firebase REST API to create user
    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const signUpData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      return NextResponse.json(
        { success: false, error: signUpData.error?.message || 'Registration failed' },
        { status: 400 }
      );
    }

    const userId = signUpData.localId;
    const idToken = signUpData.idToken;

    console.log('Creating user document in Firestore for userId:', userId);

    // Create user document in Firestore using REST API with authentication
    const firestoreResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users?documentId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: userId },
            email: { stringValue: email },
            name: { stringValue: name },
            role: { stringValue: 'user' },
            createdAt: { timestampValue: new Date().toISOString() },
            updatedAt: { timestampValue: new Date().toISOString() },
            planRequest: { nullValue: null },
            currentPlan: { nullValue: null },
            progress: { mapValue: { fields: {} } },
            status: { stringValue: 'active' },
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
      // Still return success because user was created in Firebase Auth
      // The Firestore document can be created later
    } else {
      console.log('User document created successfully:', firestoreData.name);
    }

    return NextResponse.json({
      success: true,
      userId: userId,
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}