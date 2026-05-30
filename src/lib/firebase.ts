/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: Binds to correct Firestore instance */
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Sign in via Google popup helper
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Sign in with Google error:', error);
    throw error;
  }
}

// Sign in Student anonymously or with automated custom credentials fallback
export async function signInStudentAnonymously() {
  try {
    // 1. Try Firebase Anonymous Authentication first which is perfect
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (anonError: any) {
      console.warn('Anonymous Auth failed or disabled in Firebase Console. Trying automated fast credentials onboarding:', anonError);
      
      // 2. Fallback to a localized, unique student session registered via Firebase Auth
      let studentEmail = localStorage.getItem('almoalem_student_email');
      let studentPassword = localStorage.getItem('almoalem_student_pass');
      
      if (!studentEmail || !studentPassword) {
        const randNum = Math.floor(Math.random() * 9000000) + 1000000;
        studentEmail = `taleb_${randNum}@almoalem.dz`;
        studentPassword = `talebPass_${randNum}_DZ`;
        localStorage.setItem('almoalem_student_email', studentEmail);
        localStorage.setItem('almoalem_student_pass', studentPassword);
      }
      
      try {
        const signResult = await signInWithEmailAndPassword(auth, studentEmail, studentPassword);
        return signResult.user;
      } catch (signError: any) {
        // If not registered yet, create it on the fly
        if (signError.code === 'auth/user-not-found' || signError.code === 'auth/invalid-credential') {
          const createResult = await createUserWithEmailAndPassword(auth, studentEmail, studentPassword);
          return createResult.user;
        }
        throw signError;
      }
    }
  } catch (error) {
    console.error('Student Quick Sign-In failed completely:', error);
    throw error;
  }
}

// Global logout helper
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}
