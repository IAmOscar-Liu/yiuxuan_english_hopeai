import admin from "../firebase-admin";
import { isDev } from "../lib/helper";
import { ChatType, ChatMessage, Report } from "../lib/openAI/type";

export async function saveUnfinishedChat(
  userId: string,
  data: {
    chatType: ChatType;
    followupId?: string | null;
    messages: ChatMessage[];
  },
  option?: { showDebug: boolean },
) {
  try {
    const db = admin.firestore();

    const chatDocRef = db.collection("hopeai_unfinished_chat").doc(userId);

    await chatDocRef.set(data);

    console.log(
      option?.showDebug || isDev()
        ? `[DEBUG] Saved document hopeai_unfinished_chat for userId: ${userId} with data: ${JSON.stringify(
            data,
          )}`
        : `Document unfinished chat for userId ${userId} has been saved.`,
    );
  } catch (error) {
    console.error(
      `Error saving unfinished chat document for userId ${userId}:`,
      error,
    );
  }
}

export async function getUnfinishedChat(
  userId: string,
  option?: { showDebug: boolean },
): Promise<{ [key: string]: any } | undefined> {
  try {
    const db = admin.firestore();

    const chatDocRef = db.collection("hopeai_unfinished_chat").doc(userId);

    const chatDoc = await chatDocRef.get();

    if (chatDoc.exists) {
      console.log(
        option?.showDebug || isDev()
          ? `Document unfinished chat for userId ${userId}: ${chatDoc.data()}`
          : `Document unfinished chat for userId ${userId} found`,
      );
      return { ...chatDoc.data(), id: chatDoc.id };
      // return chatDoc.data();
    } else {
      console.log(
        `No document found for unfinished chat for userId: ${userId}`,
      );
      return undefined;
    }
  } catch (error) {
    console.error(
      `Error getting unfinished chat document for userId ${userId}:`,
      error,
    );
  }
}

export async function deleteUnfinishedChat(
  userId: string,
  option?: { showDebug: boolean },
) {
  try {
    const db = admin.firestore();

    const chatDocRef = db.collection("hopeai_unfinished_chat").doc(userId);

    await chatDocRef.delete();

    console.log(
      option?.showDebug || isDev()
        ? `[DEBUG] Deleted document hopeai_unfinished_chat for userId: ${userId}`
        : `Document unfinished chat for userId ${userId} has been deleted.`,
    );
  } catch (error) {
    console.error(
      `Error deleting unfinished chat document for userId ${userId}:`,
      error,
    );
  }
}

export async function createChat({
  chatId,
  userId,
  chatType,
  followupId,
  data = [],
  report,
  reference = false,
}: {
  chatId: string;
  userId: string;
  chatType: ChatType;
  followupId?: string | null;
  data: ChatMessage[];
  report: Report;
  reference: boolean;
}) {
  const db = admin.firestore();
  const chatDocRef = db.collection("hopeai_chat").doc(chatId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (chatType === "follow-up" && data.length > 0) {
    data[0].content = "我想接續上次的話題";
  }

  try {
    await chatDocRef.set({
      userId,
      createdAt: now,
      chatType,
      followupId,
      data,
      report,
      reference,
    });
    console.log(
      `Chat document created for chatId ${chatId} and userId ${userId}`,
    );
    return true;
  } catch (error) {
    console.error(`Error creating chat document for chatId ${chatId}:`, error);
    return false;
  }
}

export async function getChatDocumentById(
  chatId: string,
): Promise<{ id: string; [key: string]: any } | null> {
  try {
    const db = admin.firestore();
    const doc = await db.collection("hopeai_chat").doc(chatId).get();

    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id };
  } catch (error) {
    console.error(`Error getting chat document by id ${chatId}:`, error);
    return null;
  }
}

export async function getFollowupChat(user: {
  [field: string]: any;
}): Promise<{ [key: string]: any } | null> {
  if (user.followupChatId) {
    // if user has set followupChatId, use it first.
    const chat = await getChatDocumentById(user.followupChatId);
    if (chat && chat.reference) return chat;
  }

  return await getLatestChat(user.id);
}

export async function getLatestChat(
  userId: string,
): Promise<{ [key: string]: any } | null> {
  try {
    const db = admin.firestore();
    const chatsRef = db.collection("hopeai_chat");

    const snapshot = await chatsRef
      .where("userId", "==", userId)
      .where("reference", "==", true)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { ...doc.data(), id: doc.id };
  } catch (error) {
    console.error(`Error getting latest chat for userId ${userId}:`, error);
    return null;
  }
}

export async function setChatReference(chatId: string, reference: boolean) {
  try {
    const db = admin.firestore();
    await db.collection("hopeai_chat").doc(chatId).update({ reference });
    console.log(`Chat reference set to ${reference} for chatId ${chatId}`);
    return true;
  } catch (error) {
    console.error(`Error setting chat reference for chatId ${chatId}:`, error);
    return false;
  }
}

export async function listChatDocuments({
  userId,
  startAt,
  endAt,
}: {
  userId: string;
  startAt?: Date;
  endAt?: Date;
}) {
  try {
    const db = admin.firestore();
    let query = db
      .collection("hopeai_chat")
      .where("userId", "==", userId)
      .where("reference", "==", true)
      .orderBy("createdAt", "desc");

    if (startAt) {
      query = query.where("createdAt", ">=", startAt);
    }

    if (endAt) {
      query = query.where("createdAt", "<=", endAt);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return docs;
  } catch (error) {
    console.error(`Error listing chat documents for userId ${userId}:`, error);
    return [];
  }
}
