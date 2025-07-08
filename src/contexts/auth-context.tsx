
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
// Import the specific authentication functions from firebase/auth
import { updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, ensureFirebaseInitialized, saveUserToFirestore, db, storage, updateUserProfilePhoto } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export interface User extends FirebaseUser {
  username?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isProcessingMagicLink: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserContext: (data: Partial<User>) => void; // For client-side updates
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfilePicture: (file: File) => Promise<void>;
  sendSignInLink: (email: string) => Promise<void>;
  checkAndSignInWithMagicLink: () => void;
  refreshKey: number;
  triggerDataRefresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const triggerDataRefresh = () => setRefreshKey(prev => prev + 1);


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
             // This case is important for magic link sign-ups where the user might not exist in Firestore yet.
             // We check for a display name set during a previous sign-up or retrieved from the magic link flow.
            if (firebaseUser.displayName) {
                await saveUserToFirestore(firebaseUser, firebaseUser.displayName);
                const newDocSnap = await getDoc(userDocRef);
                if (newDocSnap.exists()) {
                    const userData = newDocSnap.data();
                    setUser({
                    ...firebaseUser,
                    username: userData.username,
                    photoURL: userData.photoURL,
                    });
                }
            } else {
                // If there's no display name, it's an incomplete profile.
                // The app should handle this gracefully, maybe prompt for a username.
                setUser({ ...firebaseUser });
            }
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        // Set the display name. onAuthStateChanged will handle saving to Firestore.
        await updateProfile(firebaseUser, { displayName: username });
        // Manually trigger the listener logic since it might not have run yet.
        await saveUserToFirestore(firebaseUser, username);
        setUser({ ...firebaseUser, username });
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      setLoading(false);
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

  const sendSignInLink = async (email: string) => {
    const actionCodeSettings = {
        url: `${window.location.origin}/auth/signin`,
        handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };
  
  const checkAndSignInWithMagicLink = useCallback(async () => {
    // Only run this check on the signin page to avoid accidental sign-ins on other pages.
    if (typeof window === 'undefined' || !window.location.pathname.includes('/auth/signin')) {
        setIsProcessingMagicLink(false);
        return;
    }
    
    if (isSignInWithEmailLink(auth, window.location.href)) {
        setIsProcessingMagicLink(true);
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            // This can happen if the user opens the link on a different device.
            // We can prompt the user for their email.
            email = window.prompt('Please provide your email for confirmation');
        }

        if (!email) {
            toast({ title: "Sign in failed", description: "Email is required to complete sign-in.", variant: "destructive"});
            setIsProcessingMagicLink(false);
            return;
        }

        try {
            // onAuthStateChanged will handle routing and state updates.
            await signInWithEmailLink(auth, email, window.location.href);
            toast({ title: "Signed In", description: "Welcome! Redirecting..." });
            router.push('/dashboard');
        } catch (error: any) {
             toast({ title: "Sign in failed", description: "The link may be expired or invalid. Please try again.", variant: "destructive"});
             router.push('/auth/signin'); // Clear the URL params
        } finally {
            window.localStorage.removeItem('emailForSignIn');
            setIsProcessingMagicLink(false);
        }
    } else {
        setIsProcessingMagicLink(false);
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateUserContext, sendPasswordReset, updateProfilePicture, sendSignInLink, checkAndSignInWithMagicLink, isProcessingMagicLink, refreshKey, triggerDataRefresh }}>
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
