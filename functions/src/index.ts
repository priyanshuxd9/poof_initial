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
 * Deletes all documents in a collection or subcollection in batches.
 * @param {string} collectionPath The path to the collection.
 * @param {number} batchSize The number of documents to delete in each batch.
 */
async function deleteCollection(collectionPath: string, batchSize: number) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  let snapshot = await query.get();
  while (snapshot.size > 0) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Get the next batch
    snapshot = await query.get();
  }
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
      if (userDocSnap.exists()) {
        batch.delete(userDocRef);
        logger.log(`Scheduled deletion for user doc: ${uid}`);
      }

      // 2. Delete user's profile picture from Storage
      const avatarPath = `user-avatars/${uid}/avatar.jpg`;
      try {
        await storage.bucket().file(avatarPath).delete();
        logger.log(`Deleted avatar from Storage: ${avatarPath}`);
      } catch (e: unknown) {
        const error = e as {code?: number};
        if (error.code !== 404) {
          logger.error(`Error deleting avatar for user ${uid}:`, error);
        }
      }

      // 3. Handle group ownership and memberships
      const ownedGroupsQuery = db
        .collection("groups")
        .where("ownerId", "==", uid);
      const ownedGroupsSnapshot = await ownedGroupsQuery.get();
      for (const doc of ownedGroupsSnapshot.docs) {
        logger.log(`User ${uid} owns group ${doc.id}. Deleting it.`);
        await deleteCollection(`groups/${doc.id}/messages`, 100);

        const groupAvatarPath = `group-avatars/${uid}/${doc.id}/avatar.jpg`;
        try {
          await storage.bucket().file(groupAvatarPath).delete();
        } catch (e: unknown) {
          const error = e as {code?: number};
          if (error.code !== 404) {
            const logMsg = `Error deleting group avatar for ${doc.id}:`;
            logger.error(logMsg, error);
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
          const logMsg =
            `User ${uid} is a member of group ${doc.id}. Removing them.`;
          logger.log(logMsg);
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
