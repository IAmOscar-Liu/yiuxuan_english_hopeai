import OpenAI from "openai";
import { limiter } from "../rateLimit";
import RedisLib from "../redis";
import { PRE_INPUTS } from "./preInputs";
import { ChatType, OpenAIResult } from "./type";
import { tryParseReport } from "./utils";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

export class OpenAILib {
  static async getCurrentChatType(user: { [field: string]: any }) {
    const userId = user.id;
    const chatType = await RedisLib.getChatType(userId);
    return chatType;
  }

  static async deleteChat(user: { [field: string]: any }) {
    const userId = user.id;
    await RedisLib.deleteChatHistory(userId);
  }

  static async getCurrentChat(user: { [field: string]: any }) {
    const userId = user.id;

    const chatType = await RedisLib.getChatType(userId);
    if (!chatType) return null;

    const followupId = await RedisLib.getFollowupId(userId);

    const userHistories = await RedisLib.getChatHistory(userId);
    return {
      chatType,
      followupId,
      messages: userHistories,
    };
  }

  static async chat({
    user,
    message,
    chatType,
    followupId,
  }: {
    user: {
      [field: string]: any;
    };
    message: string;
    chatType?: ChatType;
    followupId?: string;
  }): Promise<OpenAIResult> {
    console.log(`[AI:user] userId ${user.id} message: ${message}`);
    try {
      limiter.execute(user);

      const userId = user.id;

      let currentChatType = await RedisLib.getChatType(userId);

      if (!currentChatType && chatType) {
        await RedisLib.setChatType(userId, chatType);
        currentChatType = chatType;
      }
      if (!currentChatType) {
        return {
          success: false,
          error: "No chapter found for this user",
        };
      }

      let currentFollowupId = await RedisLib.getFollowupId(userId);
      if (!currentFollowupId && followupId) {
        await RedisLib.setFollowUpId(userId, followupId);
        currentFollowupId = followupId;
      }

      const preInput = chatType === "follow-up" ? [] : PRE_INPUTS;

      await RedisLib.addChatMessage(userId, {
        role: "user",
        content: message,
      });
      const userHistories = await RedisLib.getChatHistory(userId);
      // console.log(`userId ${userId} history`, userHistories);

      // system + history as Responses input
      const input = [
        ...preInput,
        ...userHistories.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const response = await openai.responses.create({
        prompt: {
          id: process.env.OPENAI_PROMPT_ID!,
          ...(process.env.OPENAI_PROMPT_VERSION
            ? { version: process.env.OPENAI_PROMPT_VERSION }
            : {}),
        },
        // @ts-expect-error
        input,
        reasoning: {
          summary: "auto",
        },
        tools: [
          {
            type: "file_search",
            vector_store_ids: ["vs_699e647ef20881918e2f3e4fa9f3e4d7"],
          },
        ],
        store: true,
        include: [
          "reasoning.encrypted_content",
          "web_search_call.action.sources",
        ],
      });

      // Assistant text (combined)
      const assistantText = response.output_text || "";

      // Try to parse as report JSON
      const report = tryParseReport(assistantText);

      if (report) {
        console.log(`user ${userId} got report`);
        setTimeout(() => {
          OpenAILib.deleteChat(user);
        }, 0);
        return {
          success: true,
          completed: true,
          chatType: currentChatType,
          followupId: currentFollowupId,
          report,
          history: userHistories,
        };
      }

      // Save assistant message into history (store raw text)
      // userHistories[userId].push({
      //   role: "assistant",
      //   content: assistantText,
      // });
      await RedisLib.addChatMessage(userId, {
        role: "assistant",
        content: assistantText,
      });

      console.log(`[AI:assistant] userId ${userId} reply: ${assistantText}`);
      return {
        success: true,
        completed: false,
        reply: assistantText,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `很抱歉，系統目前無法回覆你的訊息 - ${err}`,
      };
    } finally {
      limiter.finish(user);
    }
  }
}
