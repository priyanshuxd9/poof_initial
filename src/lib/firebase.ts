// TODO: Replace with your actual Firebase configuration
// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const auth = getAuth(app);
// const db = getFirestore(app);
// const storage = getStorage(app);

// export { app, auth, db, storage };

// Mock implementation for scaffolding
export const auth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
    // Simulate an unauthenticated user initially
    setTimeout(() => callback(null), 100);
    return () => {}; // Unsubscribe function
  },
  signInWithEmailAndPassword: async (email?: string, password?: string) => {
    if (email === 'test@example.com' && password === 'password') {
      return { user: { uid: '123', email: 'test@example.com', displayName: 'TestUser' } };
    }
    throw new Error('Invalid credentials');
  },
  createUserWithEmailAndPassword: async (email?: string, password?: string) => {
     if (email && password) {
        return { user: { uid: '123', email, displayName: email.split('@')[0] } };
     }
     throw new Error('Failed to create user');
  },
  updateProfile: async (user: any, profile: any) => {
    // Mock profile update
    return Promise.resolve();
  },
  signOut: async () => {
    // Mock sign out
    return Promise.resolve();
  }
};

export const db = {}; // Mock Firestore
export const storage = {}; // Mock Storage

export const ensureFirebaseInitialized = () => {
  // This function would normally ensure Firebase is initialized.
  // For this scaffold, it does nothing.
};

// Helper to simulate checking username uniqueness
export const checkUsernameUnique = async (username: string): Promise<boolean> => {
  // In a real app, this would query Firestore:
  // const usernameDoc = await getDoc(doc(db, "usernames", username));
  // return !usernameDoc.exists();
  console.log(`Checking username uniqueness for: ${username}`);
  return !['testuser', 'admin'].includes(username.toLowerCase()); // Mock some taken usernames
};

// Helper to simulate saving user data
export const saveUserToFirestore = async (user: any, username: string) => {
  // In a real app, this would write to Firestore:
  // await setDoc(doc(db, "users", user.uid), { email: user.email, username, createdAt: serverTimestamp() });
  // await setDoc(doc(db, "usernames", username), { userId: user.uid });
  console.log(`Saving user ${user.uid} with username ${username} to Firestore`);
};
