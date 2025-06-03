
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

// Initialize Firebase
function getInitializedFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    try {
      console.log("Attempting Firebase initialization..."); // Log from a previous step
      const newApp = initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully by initializeApp."); // Log from a previous step
      return newApp;
    } catch (e) {
      console.error("Firebase initialization critical error:", e);
      throw e;
    }
  }
  console.log("Firebase app already initialized, getting existing app."); // Log from a previous step
  return getApp();
}

const app: FirebaseApp = getInitializedFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

export const ensureFirebaseInitialized = (): FirebaseApp => {
  if (!getApps().length) {
    console.warn("ensureFirebaseInitialized called when no apps were found, re-initializing.");
    try {
      return initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization error in ensureFirebaseInitialized:", error);
      throw error;
    }
  }
  return getApp();
};

export const checkUsernameUnique = async (username: string): Promise<boolean> => {
  // ensureFirebaseInitialized(); // Redundant if app is initialized globally
  console.log("--- checkUsernameUnique CALLED for username:", username); // Log from a previous step
  try {
    const usernamesRef = collection(db, "usernames");
    const q = query(usernamesRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    console.log("--- checkUsernameUnique querySnapshot empty:", querySnapshot.empty); // Log from a previous step
    return querySnapshot.empty;
  } catch (error) {
    console.error("--- checkUsernameUnique Firestore Error:", error);
    throw error;
  }
};

export const saveUserToFirestore = async (user: FirebaseUser, username: string) => {
  // ensureFirebaseInitialized(); // Redundant
  console.log("--- saveUserToFirestore CALLED ---"); // Log from a previous step
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
