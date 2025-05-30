
"use client";

import type { User as FirebaseUser } from 'firebase/auth'; // Using Firebase type for compatibility
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, ensureFirebaseInitialized, saveUserToFirestore, checkUsernameUnique } from '@/lib/firebase'; // Using mock auth
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    ensureFirebaseInitialized(); // Ensure Firebase is initialized (mocked)
    const unsubscribe = auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // In a real app, you might fetch additional user data (like username) from Firestore here
        setUser({ ...firebaseUser, username: (firebaseUser as any).displayName || firebaseUser.email?.split('@')[0] });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email?: string, password?: string) => {
    setLoading(true);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      if (userCredential.user) {
        setUser({ ...userCredential.user, username: (userCredential.user as any).displayName || userCredential.user.email?.split('@')[0]});
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
    try {
      const isUsernameUnique = await checkUsernameUnique(username);
      if (!isUsernameUnique) {
        throw new Error("Username is already taken.");
      }

      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        await auth.updateProfile(firebaseUser, { displayName: username });
        await saveUserToFirestore(firebaseUser, username); // Save additional user data
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
