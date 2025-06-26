
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type User as FirebaseUser, updateProfile, deleteUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, Timestamp, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Function to get the initialized Firebase app
function getInitializedFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    try {
      return initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization critical error:", e);
      console.error("Using config:", firebaseConfig);
      throw e;
    }
  }
  return getApp();
}

const app: FirebaseApp = getInitializedFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

export const ensureFirebaseInitialized = (): FirebaseApp => {
  return getInitializedFirebaseApp();
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
  const userDocRef = doc(db, "users", user.uid);
  const usernameDocRef = doc(db, "usernames", username.toLowerCase());

  const batch = writeBatch(db);

  batch.set(userDocRef, {
    uid: user.uid,
    email: user.email || null,
    username: username,
    photoURL: user.photoURL || null,
    createdAt: serverTimestamp(),
  });

  batch.set(usernameDocRef, {
    uid: user.uid,
    username: username,
  });

  await batch.commit();
};

export const updateUserUsername = async (uid: string, oldUsername: string, newUsername: string) => {
  ensureFirebaseInitialized();
  const isUsernameUnique = await checkUsernameUnique(newUsername);
  if (!isUsernameUnique) {
    throw new Error("Username is already taken.");
  }

  const userDocRef = doc(db, "users", uid);
  const oldUsernameDocRef = doc(db, "usernames", oldUsername.toLowerCase());
  const newUsernameDocRef = doc(db, "usernames", newUsername.toLowerCase());

  const batch = writeBatch(db);
  batch.update(userDocRef, { username: newUsername });
  batch.delete(oldUsernameDocRef);
  batch.set(newUsernameDocRef, { uid: uid, username: newUsername });
  
  await batch.commit();
  
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { displayName: newUsername });
  }
};

export const updateUserProfilePhoto = async (uid: string, photoURL: string) => {
  ensureFirebaseInitialized();
  const userDocRef = doc(db, "users", uid);
  
  await updateDoc(userDocRef, { photoURL });

  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { photoURL });
  }
};


export const deleteUserAccount = async (user: FirebaseUser) => {
  ensureFirebaseInitialized();
  if (!user.username) throw new Error("Username is missing, cannot delete account data.");

  const userDocRef = doc(db, 'users', user.uid);
  const usernameDocRef = doc(db, 'usernames', user.username.toLowerCase());
  
  const batch = writeBatch(db);
  batch.delete(userDocRef);
  batch.delete(usernameDocRef);

  await batch.commit();

  await deleteUser(user);
};


export interface AppUser {
  uid: string;
  username: string;
  email: string | null;
  photoURL: string | null;
  createdAt: any;
}

export const getUsersFromIds = async (userIds: string[]): Promise<AppUser[]> => {
  ensureFirebaseInitialized();
  if (!userIds || userIds.length === 0) {
    return [];
  }
  try {
    if (userIds.length <= 30) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where('uid', 'in', userIds));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as AppUser);
    } else {
        const userDocsPromises = userIds.map(uid => getDoc(doc(db, "users", uid)));
        const userDocsSnapshots = await Promise.all(userDocsPromises);
        return userDocsSnapshots
          .filter(snap => snap.exists())
          .map(snap => snap.data() as AppUser);
    }
  } catch (error) {
    console.error("Error fetching users from IDs:", error);
    return [];
  }
};

/**
 * Deletes all messages in a group's subcollection and marks the group as cleaned.
 * This is intended to be called for expired groups.
 * @param groupId The ID of the group to clean up.
 */
export const cleanupExpiredGroup = async (groupId: string): Promise<void> => {
  ensureFirebaseInitialized();
  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const groupDocRef = doc(db, 'groups', groupId);

  const batch = writeBatch(db);

  // Get all messages to delete them in a batch
  const messagesSnapshot = await getDocs(messagesRef);
  messagesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  // Mark the group as cleaned and remove the invite code so it can't be used again.
  // We keep memberUserIds so the archive page still works for all members.
  batch.update(groupDocRef, {
    isCleaned: true,
    inviteCode: null,
  });

  await batch.commit();
};
