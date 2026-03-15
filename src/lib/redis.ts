import Redis from "ioredis";
import { ChatType, ChatMessage } from "./openAI/type";

// Initialize the Redis client (assuming 'redis' variable is available)
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});

// Time-To-Live (TTL) in seconds (1 month)
const TTL = 60 * 60 * 24 * 30;

class RedisLib {
  // --- Chat History Functions ---

  /**
   * Adds a new message to history, and resets TTL for both history and chapter.
   */
  static async addChatMessage(
    userId: string,
    message: ChatMessage,
  ): Promise<void> {
    const historyKey = `ai_chat:history:${userId}`;
    const chatTypeKey = `ai_user:chatType:${userId}`;
    const messageString = JSON.stringify(message);

    // Use a Redis Pipeline for atomic execution and efficiency
    await redis
      .multi()
      .rpush(historyKey, messageString) // 1. Add the message
      .expire(historyKey, TTL) // 2. Reset history TTL
      .expire(chatTypeKey, TTL) // 3. Reset chapter TTL (Synchronization)
      .exec();
  }

  /**
   * Retrieves the entire chat history for a user (Read) and resets its TTL.
   */
  static async getChatHistory(userId: string): Promise<ChatMessage[]> {
    const key = `ai_chat:history:${userId}`;

    try {
      // Await the pipeline result (an array of two-element tuples)
      const result = await redis
        .multi()
        .lrange(key, 0, -1) // Command 1
        .expire(key, TTL) // Command 2
        .exec();

      if (!result) return [];

      // Get the result of the first command (LRANGE) -> [0]
      // Get the actual data (result part of the tuple) -> [1]
      const historyStrings = result[0][1] as string[] | null;

      // Check for errors (optional, but recommended for robustness)
      // if (result[0][0]) {
      //   throw result[0][0];
      // }

      return historyStrings ? historyStrings.map((str) => JSON.parse(str)) : [];
    } catch (e) {
      return [];
    }
  }

  // --- User Chapter Functions ---

  /**
   * Sets the current chapter for a user (Write) and sets the expiration.
   */
  static async setChatType(userId: string, chatType: ChatType): Promise<void> {
    const key = `ai_user:chatType:${userId}`;
    // SET with EX option sets the value AND the expiration atomically
    await redis.set(key, chatType, "EX", TTL);
  }

  static async setFollowUpId(
    userId: string,
    followupId: string,
  ): Promise<void> {
    const key = `ai_user:followupId:${userId}`;
    // SET with EX option sets the value AND the expiration atomically
    await redis.set(key, followupId, "EX", TTL);
  }

  static async setChatHistory({
    userId,
    chatType,
    followupId,
    messages,
  }: {
    userId: string;
    chatType: ChatType;
    followupId?: string | null;
    messages: ChatMessage[];
  }): Promise<void> {
    const chatTypeKey = `ai_user:chatType:${userId}`;
    const historyKey = `ai_chat:history:${userId}`;

    const pipeline = redis.multi();

    pipeline.set(chatTypeKey, chatType, "EX", TTL);
    pipeline.del(historyKey);

    if (followupId) {
      pipeline.set(`ai_user:followupId:${userId}`, followupId, "EX", TTL);
    }

    if (messages.length > 0) {
      const messageStrings = messages.map((m) => JSON.stringify(m));
      pipeline.rpush(historyKey, ...messageStrings);
      pipeline.expire(historyKey, TTL);
    }

    await pipeline.exec();
  }

  /**
   * Retrieves the current chapter for a user (Read) and resets its TTL.
   */
  static async getChatType(userId: string): Promise<ChatType | null> {
    const key = `ai_user:chatType:${userId}`;

    try {
      // Await the pipeline result (an array of two-element tuples)
      const result = await redis
        .multi()
        .get(key) // Command 1
        .expire(key, TTL) // Command 2
        .exec();

      if (!result) return null;

      // Get the result of the first command (GET) -> [0]
      // Get the actual data (result part of the tuple) -> [1]
      const chatType = result[0][1] as string | null;

      // Check for errors (optional)
      // if (result[0][0]) {
      //   throw result[0][0];
      // }

      return chatType as ChatType | null;
    } catch (e) {
      return null;
    }
  }

  static async getFollowupId(userId: string): Promise<string | null> {
    const key = `ai_user:followupId:${userId}`;

    try {
      // Await the pipeline result (an array of two-element tuples)
      const result = await redis
        .multi()
        .get(key) // Command 1
        .expire(key, TTL) // Command 2
        .exec();

      if (!result) return null;

      // Get the result of the first command (GET) -> [0]
      // Get the actual data (result part of the tuple) -> [1]
      const chatType = result[0][1] as string | null;

      // Check for errors (optional)
      // if (result[0][0]) {
      //   throw result[0][0];
      // }

      return chatType as string | null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Deletes the entire chat history and the user's current chapter (Full Cleanup).
   * @param userId The ID of the user.
   */
  static async deleteChatHistory(userId: string): Promise<void> {
    const historyKey = `ai_chat:history:${userId}`;
    const chatTypeKey = `ai_user:chatType:${userId}`;
    const followupKey = `ai_user:followupId:${userId}`;

    // Use a pipeline to ensure both keys are deleted in a single transaction
    await redis
      .multi()
      .del(historyKey) // Deletes the chat history List
      .del(chatTypeKey) // Deletes the user chapter String
      .del(followupKey) // Deletes the user follow-up ID
      .exec();
    // The result of .exec() can be ignored as we only care that the operation completes.
  }

  /**
   * Deletes only the user's current chapter.
   * @param userId The ID of the user.
   */
  static async deleteChapter(userId: string): Promise<void> {
    const chatTypeKey = `ai_user:chatType:${userId}`;
    const followupKey = `ai_user:followupId:${userId}`;
    await redis.multi().del(chatTypeKey).del(followupKey).exec();
  }

  /**
   * ⚠️ DANGER ZONE: Clears ALL keys from the currently selected Redis database.
   * Use with extreme caution, typically only in development or testing environments.
   */
  static async clearAllRedisData(): Promise<void> {
    await redis.flushdb();
    console.log("Redis database flushed successfully.");
  }
}

export default RedisLib;
