'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getApiUrl } from '../api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (userId, token) => {
    try {
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || {};
        return {
          uid: fields.uid?.stringValue || userId,
          role: fields.role?.stringValue || 'user',
          name: fields.name?.stringValue || '',
          email: fields.email?.stringValue || '',
          status: fields.status?.stringValue || 'active',
          currentPlan: fields.currentPlan?.stringValue || null,
          planRequestStatus: fields.planRequestStatus?.stringValue || null,
          currentPlanCreatedAt: fields.currentPlanCreatedAt?.timestampValue || null,
          progress: fields.progress?.mapValue?.fields || {},
        };
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('firebaseToken');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userId) {
      setUser({
        uid: userId,
        email: userEmail,
      });
      
      // If role is cached, use it first
      if (userRole) {
        setUserData({
          role: userRole,
          email: userEmail,
        });
        setLoading(false);
      } else {
        // Fetch user data including role from Firestore
        fetchUserData(userId, token).then((data) => {
          if (data) {
            setUserData(data);
            // Cache the role
            localStorage.setItem('userRole', data.role);
          }
          setLoading(false);
        });
      }
    } else {
      setLoading(false);
    }
  }, []);

  const signup = async (email, password, name) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Registration failed');
        return { success: false, error: data.error };
      }

      // Store token and user info
      localStorage.setItem('firebaseToken', data.idToken || '');
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userRole', 'user'); // New users are always 'user' role

      setUser({
        uid: data.userId,
        email: email,
      });

      setUserData({
        role: 'user',
        name: name,
        email: email,
      });

      toast.success('Account created successfully!');
      return { success: true, user: { uid: data.userId, email }, role: 'user' };
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      return { success: false, error };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
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

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || 'Login failed';
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Store token and user info
      localStorage.setItem('firebaseToken', data.idToken);
      localStorage.setItem('userId', data.localId);
      localStorage.setItem('userEmail', data.email);

      // Clear old user's cache to avoid showing cached data
      if (typeof window !== 'undefined') {
        // Get all cache keys and remove user-specific ones (old cache format)
        localStorage.removeItem('userPlan');
        localStorage.removeItem('userPlanCacheTime');
        localStorage.removeItem('userDashboardPlan');
        localStorage.removeItem('userDashboardPlanCacheTime');
        localStorage.removeItem('userPendingRequest');
        localStorage.removeItem('userPendingRequestCacheTime');
      }

      setUser({
        uid: data.localId,
        email: data.email,
      });

      // Fetch user data including role
      const userData = await fetchUserData(data.localId, data.idToken);
      if (userData) {
        setUserData(userData);
        localStorage.setItem('userRole', userData.role);
      }

      toast.success('Logged in successfully!');
      return { 
        success: true, 
        user: { uid: data.localId, email: data.email },
        role: userData?.role || 'user'
      };
    } catch (error) {
      toast.error(error.message || 'Login failed');
      return { success: false, error };
    }
  };

  const logout = async () => {
    try {
      // Get userId before clearing it
      const userIdToRemove = localStorage.getItem('userId');
      
      // Clear all user data and cache
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      
      // Clear all user-specific cache (old format)
      localStorage.removeItem('userPlan');
      localStorage.removeItem('userPlanCacheTime');
      localStorage.removeItem('userDashboardPlan');
      localStorage.removeItem('userDashboardPlanCacheTime');
      localStorage.removeItem('userPendingRequest');
      localStorage.removeItem('userPendingRequestCacheTime');
      
      // Clear all user-specific cache with userId format
      if (userIdToRemove) {
        localStorage.removeItem(`userPlan_${userIdToRemove}`);
        localStorage.removeItem(`userPlanCacheTime_${userIdToRemove}`);
        localStorage.removeItem(`userDashboardPlan_${userIdToRemove}`);
        localStorage.removeItem(`userDashboardPlanCacheTime_${userIdToRemove}`);
        localStorage.removeItem(`userPendingRequest_${userIdToRemove}`);
        localStorage.removeItem(`userPendingRequestCacheTime_${userIdToRemove}`);
      }
      
      setUser(null);
      setUserData(null);
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resetPassword = async (email) => {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            requestType: 'PASSWORD_RESET',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error?.message || 'Password reset failed');
        return { success: false, error: data.error };
      }

      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Password reset failed');
      return { success: false, error };
    }
  };

  const updateUserData = async (uid, data) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fields: Object.entries(data).reduce((acc, [key, value]) => {
              acc[key] = { stringValue: String(value) };
              return acc;
            }, {}),
          }),
        }
      );

      if (!response.ok) {
        toast.error('Failed to update profile');
        return { success: false };
      }

      setUserData(data);
      toast.success('Profile updated!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
      return { success: false, error };
    }
  };

  const value = {
    user,
    userData,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};