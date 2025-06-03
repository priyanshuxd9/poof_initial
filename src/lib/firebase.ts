
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAfnPfSbgGE1JXcOTe0qZpIVlyFD_mENXE",
  authDomain: "poof-g7bev.firebaseapp.com",
  projectId: "poof-g7bev",
  storageBucket: "poof-g7bev.firebasestorage.app",
  messagingSenderId: "268606847310",
  appId: "1:268606847310:web:5399a15965eb864de0461f"
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
  // Check against the lowercase version of the username to ensure case-insensitivity for uniqueness
  const q = query(usernamesRef, where("username", "==", username.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

export const saveUserToFirestore = async (user: FirebaseUser, username: string) => {
  ensureFirebaseInitialized(); // This ensures 'db' is initialized

  const userData = {
    uid: user.uid,
    email: user.email,
    username: username,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  };
  console.log("Attempting to write to 'users' collection:", `/users/${user.uid}`, JSON.stringify(userData, null, 2));
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, userData)
    .then(() => console.log("Successfully wrote to 'users' collection."))
    .catch(error => console.error("Error writing to 'users' collection:", error));


  const usernameData = {
    uid: user.uid,
    username: username, // Storing original username for potential display, rule checks uid
  };
  const lowercaseUsername = username.toLowerCase();
  console.log("Attempting to write to 'usernames' collection:", `/usernames/${lowercaseUsername}`, JSON.stringify(usernameData, null, 2));
  const usernameDocRef = doc(db, "usernames", lowercaseUsername);
  await setDoc(usernameDocRef, usernameData)
    .then(() => console.log("Successfully wrote to 'usernames' collection."))
    .catch(error => console.error("Error writing to 'usernames' collection:", error));
};

