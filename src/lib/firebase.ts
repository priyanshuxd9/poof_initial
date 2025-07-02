
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type User as FirebaseUser, updateProfile, deleteUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, Timestamp, writeBatch, updateDoc, deleteDoc, arrayRemove, arrayUnion } from "firebase/firestore";
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

  // This write will fail if the username document already exists, thanks to our security rules.
  batch.set(usernameDocRef, {
    uid: user.uid,
    username: username,
  });

  await batch.commit();
};

export const updateUserUsername = async (uid: string, oldUsername: string, newUsername:string) => {
  ensureFirebaseInitialized();
  
  const userDocRef = doc(db, "users", uid);
  const oldUsernameDocRef = doc(db, "usernames", oldUsername.toLowerCase());
  const newUsernameDocRef = doc(db, "usernames", newUsername.toLowerCase());

  const batch = writeBatch(db);
  batch.update(userDocRef, { username: newUsername });
  batch.delete(oldUsernameDocRef);
  batch.set(newUsernameDocRef, { uid: uid, username: newUsername });
  
  try {
    await batch.commit();
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateProfile(auth.currentUser, { displayName: newUsername });
    }
  } catch (error) {
     console.error("Error updating username:", error);
     throw new Error("Username is already taken or another error occurred.");
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


export const deleteUserAccount = async (user: FirebaseUser & { username?: string }) => {
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
 * Updates the self-destruct timer for a group. Only owners should be able to call this.
 * @param groupId The ID of the group to update.
 * @param newSelfDestructDate The new date for self-destruction.
 */
export const updateGroupTimer = async (groupId: string, newSelfDestructDate: Date): Promise<void> => {
  ensureFirebaseInitialized();
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    selfDestructAt: Timestamp.fromDate(newSelfDestructDate),
  });
};

/**
 * Allows a user to leave a group, unless they are the owner.
 * @param groupId The ID of the group to leave.
 * @param userId The ID of the user leaving.
 * @param username The username of the user leaving.
 */
export const leaveGroup = async (groupId: string, userId: string, username: string): Promise<void> => {
    ensureFirebaseInitialized();
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
        throw new Error("Group not found.");
    }
    
    const groupData = groupSnap.data();
    if (groupData.ownerId === userId) {
        throw new Error("Group owners cannot leave. You must 'Poof' the group to delete it.");
    }

    const batch = writeBatch(db);
    
    // 1. Remove user from group and update activity
    batch.update(groupRef, {
        memberUserIds: arrayRemove(userId),
        lastActivity: serverTimestamp(),
    });

    // 2. Add system message to chat
    const messagesColRef = collection(db, "groups", groupId, "messages");
    const newMessageRef = doc(messagesColRef);
    batch.set(newMessageRef, {
        senderId: "system",
        type: "system_leave",
        text: `${username} has left the group.`,
        createdAt: serverTimestamp(),
    });

    await batch.commit();
};

/**
 * Allows a user to join a group using an invite code.
 * @param inviteCode The invite code for the group.
 * @param user The user object of the person joining.
 */
export const joinGroupWithCode = async (inviteCode: string, user: { uid: string, username: string }) => {
  ensureFirebaseInitialized();
  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("inviteCode", "==", inviteCode.trim()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("No group found with that invite code. Please check the code and try again.");
  }

  const groupDoc = querySnapshot.docs[0];
  const groupData = groupDoc.data();
  const groupId = groupDoc.id;

  if (groupData.memberUserIds?.includes(user.uid)) {
    return { success: true, alreadyMember: true, groupId: groupId, groupName: groupData.name };
  }
  
  const selfDestructTimestamp = groupData.selfDestructAt as Timestamp;
  if (selfDestructTimestamp.toDate() < new Date()) {
     throw new Error("This group has already self-destructed.");
  }

  const batch = writeBatch(db);
  const groupDocRef = doc(db, "groups", groupId);
  const messagesColRef = collection(db, "groups", groupId, "messages");
  const newMessageRef = doc(messagesColRef);

  // 1. Update group with new member and activity
  batch.update(groupDocRef, {
    memberUserIds: arrayUnion(user.uid),
    lastActivity: serverTimestamp(),
  });

  // 2. Add system message about joining
  batch.set(newMessageRef, {
    senderId: 'system',
    type: 'system_join',
    text: `${user.username} has joined the group.`,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return { success: true, alreadyMember: false, groupId: groupId, groupName: groupData.name };
};
