
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
// Import the specific authentication functions from firebase/auth
import { updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, ensureFirebaseInitialized, saveUserToFirestore, checkUsernameUnique, db, storage, updateUserProfilePhoto } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
    // This will hold the listener unsubscribe function, so we can call it on cleanup.
    let userDocListenerUnsubscribe: (() => void) | null = null;

    const authStateUnsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      // If a previous user doc listener exists, unsubscribe from it
      if (userDocListenerUnsubscribe) {
        userDocListenerUnsubscribe();
      }

      if (firebaseUser) {
        setLoading(true); // Set loading while we fetch/listen for user doc
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Set up the real-time listener
        userDocListenerUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Combine the latest auth object with the latest firestore data
            setUser({
              ...firebaseUser,
              username: userData.username || firebaseUser.displayName || undefined,
              photoURL: userData.photoURL || firebaseUser.photoURL || null,
            });
          } else {
            // This case might happen if user is authenticated but firestore doc creation failed
            // We can still set the user with basic auth info
            setUser({ ...firebaseUser });
          }
          setLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            setUser({ ...firebaseUser }); // Fallback to auth info
            setLoading(false);
        });

      } else {
        // No user is signed in
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup function for the effect
    return () => {
      authStateUnsubscribe();
      if (userDocListenerUnsubscribe) {
        userDocListenerUnsubscribe();
      }
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
    
    // The onSnapshot listener will automatically update the context state,
    // so a manual call to updateUserContext is no longer strictly necessary here,
    // but it can provide a slightly faster UI update perception.
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
    // No finally block needed as onAuthStateChanged handles success
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
        // The onAuthStateChanged listener will handle setting the user state.
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setLoading(false); // Ensure loading is turned off on error
      throw error;
    }
    // No finally block needed as onAuthStateChanged handles success
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
