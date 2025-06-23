
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
// Import the specific authentication functions from firebase/auth
import { updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, ensureFirebaseInitialized, saveUserToFirestore, checkUsernameUnique, db, storage, updateUserProfilePhoto } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface User extends FirebaseUser {
  username?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserContext: (data: Partial<User>) => void; // For client-side updates
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfilePicture: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    ensureFirebaseInitialized();
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let appUsername = firebaseUser.displayName;
        let photoURL = firebaseUser.photoURL;

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          appUsername = data.username || appUsername;
          photoURL = data.photoURL || photoURL;
        }
        setUser({ ...firebaseUser, username: appUsername || undefined, photoURL: photoURL || null });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateUserContext = (data: Partial<User>) => {
    if (user) {
        setUser(prevUser => prevUser ? { ...prevUser, ...data } : null);
    }
  };

  const updateProfilePicture = async (file: File) => {
    if (!user) throw new Error("User not authenticated.");

    const filePath = `user-avatars/${user.uid}/avatar.jpg`;
    const sRef = storageRef(storage, filePath);
    
    await uploadBytes(sRef, file);
    const newPhotoURL = await getDownloadURL(sRef);
    
    await updateUserProfilePhoto(user.uid, newPhotoURL);
    
    // Update context state
    updateUserContext({ photoURL: newPhotoURL });
  };

  const signIn = async (email?: string, password?: string) => {
    setLoading(true);
    if (!email || !password) {
      setLoading(false);
      throw new Error("Email and password are required.");
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        const firebaseUser = userCredential.user;
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let appUsername = firebaseUser.displayName;
        let photoURL = firebaseUser.photoURL;

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          appUsername = data.username || appUsername;
          photoURL = data.photoURL || photoURL;
        }
        setUser({ ...firebaseUser, username: appUsername || undefined, photoURL: photoURL || null });
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email?: string, password?: string, username?: string) => {
    setLoading(true);
    if (!username) {
      setLoading(false);
      throw new Error("Username is required.");
    }
    if (!email || !password) {
      setLoading(false);
      throw new Error("Email and password are required.");
    }
    try {
      const isUsernameUnique = await checkUsernameUnique(username);
      if (!isUsernameUnique) {
        throw new Error("Username is already taken.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: username });
        await saveUserToFirestore(firebaseUser, username);
        setUser({ ...firebaseUser, username });
      }
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      setUser(null);
      router.push('/auth/signin');
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!email) {
      throw new Error("Email is required.");
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateUserContext, sendPasswordReset, updateProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
