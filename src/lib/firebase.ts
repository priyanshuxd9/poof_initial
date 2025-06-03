
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

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

export const ensureFirebaseInitialized = () => {
  if (!getApps().length) {
    try {
      initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  }
};

export const checkUsernameUnique = async (username: string): Promise<boolean> => {
  ensureFirebaseInitialized();
  const usernamesRef = collection(db, "usernames");
  const q = query(usernamesRef, where("username", "==", username.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

export const saveUserToFirestore = async (user: FirebaseUser, username: string) => {
  ensureFirebaseInitialized();
  console.log("--- saveUserToFirestore CALLED ---");
  console.log("User object:", JSON.stringify(user, null, 2));
  console.log("Username parameter:", username);

  const userData = {
    uid: user.uid,
    email: user.email,
    username: username,
    photoURL: user.photoURL,
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
    throw error; // Re-throw the error to be caught by the calling function
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
    throw error; // Re-throw the error
  }
  console.log("--- saveUserToFirestore COMPLETED ---");
};
