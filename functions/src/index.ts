
/**
 * @fileoverview Cloud Functions for user data management.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import type {UserRecord} from "firebase-functions/v1/auth";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

/**
 * Recursively deletes documents from a query batch.
 * @param {admin.firestore.Query} query The Firestore query to execute.
 * @param {() => void} resolve The promise resolution function.
 * @param {(err: Error) => void} reject The promise rejection function.
 */
async function deleteQueryBatch(
  query: admin.firestore.Query,
  resolve: () => void,
  reject: (err: Error) => void,
) {
  try {
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
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error as Error);
  }
}

/**
 * Deletes all documents in a Firestore collection.
 * @param {string} collectionPath The path to the collection.
 * @param {number} batchSize The number of documents to delete in each batch.
 * @return {Promise<void>} A promise that resolves when the collection is deleted.
 */
function deleteCollection(
  collectionPath: string,
  batchSize: number,
): Promise<void> {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

/**
 * Handles the cleanup of user data when a user account is deleted.
 * This includes deleting user docs, storage files, and handling group
 * ownership/memberships.
 */
export const onUserDelete = functions
  .runWith({maxInstances: 10})
  .auth.user()
  .onDelete(async (user: UserRecord) => {
    const {uid} = user;
    const logger = functions.logger;
    logger.log(`Starting cleanup for user: ${uid}`);

    try {
      const batch = db.batch();
      const userDocRef = db.collection("users").doc(uid);
      const userDocSnap = await userDocRef.get();
      const userData = userDocSnap.data();

      // 1. Delete user document and username reservation
      if (userData?.username && typeof userData.username === "string") {
        const usernameDocRef = db
          .collection("usernames")
          .doc(userData.username.toLowerCase());
        batch.delete(usernameDocRef);
        logger.log(`Scheduled deletion for username: ${userData.username}`);
      }
      if (userDocSnap.exists) {
        batch.delete(userDocRef);
        logger.log(`Scheduled deletion for user doc: ${uid}`);
      }

      // 2. Delete user's profile picture from Storage
      const avatarPath = `user-avatars/${uid}/avatar.jpg`;
      try {
        await storage.bucket().file(avatarPath).delete();
        logger.log(`Deleted avatar from Storage: ${avatarPath}`);
      } catch (e) {
        if (e instanceof Error && (e as {code?: number}).code !== 404) {
          logger.error(`Error deleting avatar for user ${uid}:`, e);
        }
      }

      // 3. Handle group ownership and memberships
      const ownedGroupsQuery = db.collection("groups").where("ownerId", "==", uid);
      const ownedGroupsSnapshot = await ownedGroupsQuery.get();
      for (const doc of ownedGroupsSnapshot.docs) {
        logger.log(`User ${uid} owns group ${doc.id}. Deleting it.`);
        await deleteCollection(`groups/${doc.id}/messages`, 100);

        const groupAvatarPath = `group-avatars/${uid}/${doc.id}/avatar.jpg`;
        try {
          await storage.bucket().file(groupAvatarPath).delete();
        } catch (e) {
          if (e instanceof Error && (e as {code?: number}).code !== 404) {
            logger.error(`Error deleting group avatar for ${doc.id}:`, e);
          }
        }
        batch.delete(doc.ref);
      }

      const memberGroupsQuery = db
        .collection("groups")
        .where("memberUserIds", "array-contains", uid);
      const memberGroupsSnapshot = await memberGroupsQuery.get();
      for (const doc of memberGroupsSnapshot.docs) {
        if (doc.data().ownerId !== uid) {
          logger.log(
            `User ${uid} is a member of group ${doc.id}. Removing them.`
          );
          batch.update(doc.ref, {
            memberUserIds: FieldValue.arrayRemove(uid),
          });
        }
      }

      await batch.commit();
      logger.log(`Successfully finished cleanup for user: ${uid}`);
    } catch (error) {
      logger.error(`Failed to cleanup user ${uid}:`, error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to cleanup user ${uid}`,
        error,
      );
    }
  });
