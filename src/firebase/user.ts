import admin from "../firebase-admin";

export async function createUser(
  userId: string,
  data: Record<string, any>,
  option?: { showDebug: boolean },
) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("hopeai_user").doc(userId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await userDocRef.set(
      {
        ...data,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    if (option?.showDebug) {
      console.log(`[DEBUG] User document created for userId: ${userId}`);
    }
    return true;
  } catch (error) {
    console.error(`Error creating user document for userId ${userId}:`, error);
    return false;
  }
}

export async function getUserDoc(
  userId: string,
  option?: { showDebug: boolean },
): Promise<{ id: string; [key: string]: any } | null> {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("hopeai_user").doc(userId);
    const doc = await userDocRef.get();

    if (doc.exists) {
      if (option?.showDebug) {
        console.log(`[DEBUG] User document found for userId: ${userId}`);
      }
      return { ...doc.data(), id: doc.id };
    }
    return null;
  } catch (error) {
    console.error(`Error getting user document by id ${userId}:`, error);
    return null;
  }
}

export async function updateUserDoc(
  userId: string,
  data: Record<string, any>,
  option?: { showDebug: boolean },
) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("hopeai_user").doc(userId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await userDocRef.update({
      ...data,
      updatedAt: now,
    });

    if (option?.showDebug) {
      console.log(`[DEBUG] User document updated for userId: ${userId}`);
    }
    return true;
  } catch (error) {
    console.error(`Error updating user document for userId ${userId}:`, error);
    return false;
  }
}
