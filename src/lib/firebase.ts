
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Helper function to initialize Firebase and return the app instance
const initializeFirebaseApp = (): FirebaseApp => {
  if (getApps().length) {
    console.log("Firebase app already initialized.");
    return getApp();
  }
  try {
    const newApp = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
    return newApp;
  } catch (e) {
    console.error("Firebase initialization critical error:", e);
    // If initialization fails, the application cannot proceed with Firebase services.
    // Re-throwing the error makes it clear that initialization failed.
    throw e;
  }
};

const app: FirebaseApp = initializeFirebaseApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

export const ensureFirebaseInitialized = (): FirebaseApp => {
  // This function can now simply return the already initialized app
  // or rely on the top-level initialization.
  // For consistency and to ensure it's always called if needed elsewhere:
  if (!getApps().length) {
    // This case should ideally not be hit if the top-level 'app' is always initialized.
    // However, keeping it for safety if called independently before top-level const app is ready.
    try {
      console.log("Firebase (re)initialized by ensureFirebaseInitialized.");
      return initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization error in ensureFirebaseInitialized:", error);
      throw error;
    }
  }
  return getApp();
};

export const checkUsernameUnique = async (username: string): Promise<boolean> => {
  ensureFirebaseInitialized(); // Ensures db is available
  console.log("--- checkUsernameUnique CALLED for username:", username.toLowerCase());
  try {
    const usernamesRef = collection(db, "usernames");
    const q = query(usernamesRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    console.log("--- checkUsernameUnique querySnapshot empty:", querySnapshot.empty);
    return querySnapshot.empty;
  } catch (error) {
    console.error("--- checkUsernameUnique Firestore Error:", error);
    throw error; // Re-throw to be caught by calling function
  }
};

export const saveUserToFirestore = async (user: FirebaseUser, username: string) => {
  ensureFirebaseInitialized(); // Ensures db is available
  console.log("--- saveUserToFirestore CALLED ---");
  console.log("User object (FirebaseUser from Auth):", JSON.stringify(user, null, 2));
  console.log("Username parameter to save:", username);

  const userData = {
    uid: user.uid,
    email: user.email || null,
    username: username,
    photoURL: user.photoURL || null,
    createdAt: serverTimestamp(),
  };
  console.log("Attempting to write to 'users' collection with path:", `/users/${user.uid}`);
  console.log("Data for 'users' collection:", JSON.stringify(userData, null, 2));
  const userDocRef = doc(db, "users", user.uid);

  try {
    await setDoc(userDocRef, userData);
    console.log("Successfully wrote to 'users' collection for UID:", user.uid);
  } catch (error) {
    console.error("Error writing to 'users' collection for UID:", user.uid, error);
    throw error;
  }

  const usernameData = {
    uid: user.uid,
    username: username,
  };
  const lowercaseUsername = username.toLowerCase();
  console.log("Attempting to write to 'usernames' collection with path:", `/usernames/${lowercaseUsername}`);
  console.log("Data for 'usernames' collection:", JSON.stringify(usernameData, null, 2));
  const usernameDocRef = doc(db, "usernames", lowercaseUsername);

  try {
    await setDoc(usernameDocRef, usernameData);
    console.log("Successfully wrote to 'usernames' collection for username:", lowercaseUsername);
  } catch (error) {
    console.error("Error writing to 'usernames' collection for username:", lowercaseUsername, error);
    throw error;
  }
  console.log("--- saveUserToFirestore COMPLETED ---");
};
