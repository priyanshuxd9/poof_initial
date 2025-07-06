
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import type { UserRecord } from "firebase-admin/auth";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Helper to recursively delete all documents in a subcollection (like messages)
async function deleteCollection(collectionPath: string, batchSize: number) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(
  query: admin.firestore.Query,
  resolve: () => void,
) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

export const onUserDelete = functions
  .runWith({ maxInstances: 10 })
  .auth.user().onDelete(async (user: UserRecord) => {
    const { uid } = user;
    const logger = functions.logger;
    logger.log(`Starting cleanup for user: ${uid}`);

    try {
      const batch = db.batch();

      // 1. Delete user document and username reservation
      const userDocRef = db.collection("users").doc(uid);
      const userDocSnap = await userDocRef.get();
      const userData = userDocSnap.data();
      if (userData?.username) {
        const usernameDocRef = db.collection("usernames").doc(userData.username.toLowerCase());
        batch.delete(usernameDocRef);
        logger.log(`Scheduled deletion for username: ${userData.username}`);
      }
      batch.delete(userDocRef);
      logger.log(`Scheduled deletion for user doc: ${uid}`);


      // 2. Delete user's profile picture from Storage
      const avatarPath = `user-avatars/${uid}/avatar.jpg`;
      try {
        await storage.bucket().file(avatarPath).delete();
        logger.log(`Deleted avatar from Storage: ${avatarPath}`);
      } catch (error: any) {
        if (error.code !== 404) {
          logger.error(`Error deleting avatar for user ${uid}:`, error);
        }
      }

      // 3. Handle group ownership and memberships
      // Groups owned by the user get fully deleted
      const ownedGroupsQuery = db.collection("groups").where("ownerId", "==", uid);
      const ownedGroupsSnapshot = await ownedGroupsQuery.get();
      for (const doc of ownedGroupsSnapshot.docs) {
        logger.log(`User ${uid} owns group ${doc.id}. Deleting it.`);
        // Delete messages subcollection
        await deleteCollection(`groups/${doc.id}/messages`, 100);
        // Delete group avatar
        const groupAvatarPath = `group-avatars/${uid}/${doc.id}/avatar.jpg`;
        try {
            await storage.bucket().file(groupAvatarPath).delete();
        } catch (error: any) {
            if (error.code !== 404) logger.error(`Error deleting group avatar for ${doc.id}:`, error);
        }
        // Delete the group document itself
        batch.delete(doc.ref);
      }

      // Groups where the user is just a member are updated
      const memberGroupsQuery = db.collection("groups").where("memberUserIds", "array-contains", uid);
      const memberGroupsSnapshot = await memberGroupsQuery.get();
      for (const doc of memberGroupsSnapshot.docs) {
        if (doc.data().ownerId !== uid) {
          logger.log(`User ${uid} is a member of group ${doc.id}. Removing them.`);
          batch.update(doc.ref, {
            memberUserIds: admin.firestore.FieldValue.arrayRemove(uid),
          });
        }
      }

      // Commit all the Firestore deletions and updates
      await batch.commit();
      logger.log(`Successfully finished cleanup for user: ${uid}`);

    } catch (error) {
      logger.error(`Failed to cleanup user ${uid}:`, error);
      // Re-throwing the error ensures that the function execution is marked as a failure
      // in the Cloud Function logs, making it clear that something went wrong.
      throw new functions.https.HttpsError('internal', `Failed to cleanup user ${uid}`, error);
    }
  });
