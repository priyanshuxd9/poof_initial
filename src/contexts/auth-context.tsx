
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
// Import the specific authentication functions from firebase/auth
import { updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, ensureFirebaseInitialized, saveUserToFirestore, db, storage, updateUserProfilePhoto } from '@/lib/firebase';
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

    const authStateUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser({
              ...firebaseUser,
              username: userData.username || firebaseUser.displayName || undefined,
              photoURL: userData.photoURL || firebaseUser.photoURL || null,
            });
          } else {
            // This case might happen if user is authenticated but firestore doc creation failed
            setUser({ ...firebaseUser });
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser({ ...firebaseUser }); // Fallback to auth info
        } finally {
          setLoading(false);
        }

      } else {
        // No user is signed in
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup function for the effect
    return () => {
      authStateUnsubscribe();
    };
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
    
    // Manually update context now that onSnapshot is gone.
    updateUserContext({ photoURL: newPhotoURL });
  };

  const signIn = async (email?: string, password?: string) => {
    setLoading(true);
    if (!email || !password) {
      setLoading(false);
      throw new Error("Email and password are required.");
    }
    try {
      // The onAuthStateChanged listener will handle setting the user state.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false); // Ensure loading is turned off on error
      throw error;
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
      // The uniqueness check is now handled by the Firestore transaction via security rules.
      // This avoids the unauthenticated read error.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: username });
        await saveUserToFirestore(firebaseUser, username);
        // The onAuthStateChanged listener will handle setting the user state and redirect.
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      // Check for a specific error from Firestore if the username is taken
      if (error.code === 'permission-denied' || (error.message && error.message.includes('permission-denied'))) {
        throw new Error("Username is already taken or another error occurred.");
      }
      setLoading(false); // Ensure loading is turned off on other errors
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      // The onAuthStateChanged listener will handle setting user to null.
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
