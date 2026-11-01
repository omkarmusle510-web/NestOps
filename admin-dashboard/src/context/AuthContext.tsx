'use client';

// ──────────────────────────────────────
// Auth Context — Authentication and RBAC
// ──────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut as fbSignOut, 
  signInWithCredential, 
  signInAnonymously,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface AdminProfile {
  name: string;
  role: string;
  phone: string;
  id?: string;
}

interface AuthContextType {
  user: User | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  error: string | null;
  sendOtp: (phone: string) => Promise<boolean>;
  confirmOtp: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  isSimulated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USE_SIMULATION = false;
const MOCK_ADMIN_PHONE = '+15550100003';

const MOCK_ADMIN_PROFILE: AdminProfile = {
  id: 'admin_committee_1',
  name: 'Admin Committee Member',
  role: 'admin',
  phone: MOCK_ADMIN_PHONE,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom mock verification state
  const [mockVerificationPhone, setMockVerificationPhone] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Monitor Auth Status
  useEffect(() => {
    // Note: We use anonymous Firebase Auth for the mock session, 
    // so onAuthStateChanged will handle persistence natively.

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const HARDCODED_ADMIN_PHONE = '+919818557372';
          
          // Hardcoded super admin — bypass all Firestore checks
          if (currentUser.phoneNumber === HARDCODED_ADMIN_PHONE) {
            setUser(currentUser);
            setAdminProfile({
              name: 'Sanil (Admin)',
              role: 'admin',
              phone: currentUser.phoneNumber,
              id: currentUser.uid,
            });
          } else {
            // Verify if user is admin via Firestore
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists() && docSnap.data().role === 'admin') {
              setUser(currentUser);
              setAdminProfile({
                name: docSnap.data().name || 'Admin',
                role: docSnap.data().role,
                phone: currentUser.phoneNumber || '',
                id: currentUser.uid,
              });
            } else {
              // Check admins collection by phone
              const adminsRef = collection(db, 'admins');
              const q = query(adminsRef, where('phone', '==', currentUser.phoneNumber));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                setUser(currentUser);
                setAdminProfile({
                  name: querySnapshot.docs[0].data().name || 'Admin',
                  role: 'admin',
                  phone: currentUser.phoneNumber || '',
                  id: currentUser.uid,
                });
              } else {
                // Check if we are currently mid-login (simulated auth)
                if (typeof window !== 'undefined' && window.sessionStorage.getItem('auth_in_progress') === 'true') {
                  return;
                }

                // Not an admin, kick out
                setError('Access denied: You are not authorized as an administrator.');
                await fbSignOut(auth);
                setUser(null);
                setAdminProfile(null);
              }
            }
          }
        } else {
          setUser(null);
          setAdminProfile(null);
        }
      } catch (err) {
        console.error('Error verifying admin status:', err);
        // Fallback for local connection failures if mock mode is on
        if (USE_SIMULATION) {
          setError(null); // Don't block
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const sendOtp = async (phone: string): Promise<boolean> => {
    setError(null);
    try {
      const digits = phone.replace(/\D/g, '');
      const last10 = digits.slice(-10);
      const normalizedPhone = `+91${last10}`;
      
      const isMockAdmin = normalizedPhone.replace('+91', '').startsWith('981');
      if (USE_SIMULATION && isMockAdmin) {
        // Simulation path
        await new Promise((res) => setTimeout(res, 800));
        setMockVerificationPhone(normalizedPhone);
        return true;
      }
      
      // Real firebase auth verification
      if (process.env.NODE_ENV === 'development') {
        auth.settings.appVerificationDisabledForTesting = true;
      }
      
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }

      await setPersistence(auth, browserSessionPersistence);
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, normalizedPhone, appVerifier);
      setConfirmationResult(result);
      setMockVerificationPhone(normalizedPhone);
      return true;
    } catch (err: any) {
      console.error("FIREBASE SMS ERROR:", err);
      setError(err.message || 'Failed to send OTP code.');
      return false;
    }
  };

  const confirmOtp = async (code: string): Promise<boolean> => {
    setError(null);
    try {
      if (confirmationResult) {
        const cred = await confirmationResult.confirm(code);
        if (cred.user) {
          // Verify if they are an admin
          const docRef = doc(db, 'users', cred.user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().role === 'admin') {
            return true;
          } else {
            // Check admins collection by phone
            const adminsRef = collection(db, 'admins');
            const q = query(adminsRef, where('phone', '==', cred.user.phoneNumber));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              return true;
            } else {
              throw new Error('You are not authorized as an administrator.');
            }
          }
        }
        return true;
      }

      throw new Error('Verification session expired or invalid state.');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
      return false;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      if (isSimulated) {
        setIsSimulated(false);
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    adminProfile,
    loading,
    error,
    sendOtp,
    confirmOtp,
    signOut,
    clearError,
    isSimulated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
