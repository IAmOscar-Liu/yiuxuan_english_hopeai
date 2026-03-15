// Make sure to import environment variables at the very beginning
import "./lib/env";

import { middleware, webhook } from "@line/bot-sdk";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { corsOptions } from "./constants/corsOptions";
import {
  createChat,
  deleteUnfinishedChat,
  getChatDocumentById,
  getFollowupChat,
  getUnfinishedChat,
  saveUnfinishedChat,
  setChatReference,
} from "./firebase/chat";
import { getUserDoc, updateUserDoc } from "./firebase/user";
import { handleAlertMessage } from "./handler/alertMessage";
import {
  handleChatReportFlexMessage,
  handleChatReportMessage,
} from "./handler/chatReport";
import { handleConfirmMessage } from "./handler/confirmMessage";
import { handleJoin } from "./handler/join";
import { handleSystemIsBusy, handleUnregisterUser } from "./handler/others";
import {
  handleSaveConversationQuickReply,
  handleStartConversationQuickReply,
} from "./handler/quickReply";
import { handleTextMessage } from "./handler/textMessage";
import { handleCommand } from "./lib/command";
import { OpenAILib } from "./lib/openAI";
import { OpenAIResult } from "./lib/openAI/type";
import { generateResumeChatText } from "./lib/others";
import { limiter } from "./lib/rateLimit";
import RedisLib from "./lib/redis";
import { errorHandler } from "./middleware/errorHandler";
import ChatRouter from "./router/chat";
import UserRouter from "./router/user";

// create LINE SDK config from env variables
const lineMiddleware = middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

console.log(process.env.NODE_ENV);
console.log(process.env.LINE_CHANNEL_SECRET);

// create Express app
// about Express itself: https://expressjs.com/
const app = express(); // Use the cors middleware

RedisLib.clearAllRedisData();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post("/api/callback", lineMiddleware, (req, res) => {
  console.log("Received events:", req.body.events);
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.use("/api", express.json());
app.use("/api", cors(corsOptions));

app.post("/api/liff/credential", (req, res) =>
  res.json({
    LIFF_ID: process.env.LINE_LIFF_ID,
    OA_ID: process.env.LINE_OA_ID,
  }),
);

app.use("/api", morgan("dev"));

app.get("/api/test", (req, res) => {
  res.json({ result: "success" });
});

app.use("/api/user", UserRouter);
app.use("/api/chat", ChatRouter);

// The type of `event` is `line.messagingApi.WebhookEvent` from the @line/bot-sdk package.
async function handleEvent(event: webhook.Event) {
  if (event.type === "join" || event.type === "follow")
    return handleJoin({ replyToken: event.replyToken });

  if (!event.source?.userId) return Promise.resolve(null);
  const user = await getUserDoc(event.source!.userId);

  if (event.type === "message" && event.message.type === "text") {
    // handle rich menu clicked
    if (event.message.text === "我的希望存簿") {
      if (!user) return handleUnregisterUser(event.replyToken);
      return handleConfirmMessage({
        text: "我的希望存簿",
        replyToken: event.replyToken,
        actions: [
          {
            type: "uri",
            label: "對話摘要",
            uri: process.env.LINE_LIFF_URL! + `/chat-summary.html`,
          },
          {
            type: "uri",
            label: "對話紀錄",
            uri: process.env.LINE_LIFF_URL! + `/chat-history.html`,
          },
        ],
      });
    } else if (event.message.text === "影片連結") {
      return handleTextMessage({
        text: "此功能尚未開發，敬請期待！",
        replyToken: event.replyToken,
      });
    } else if (event.message.text === "我的帳號") {
      if (!user) {
        return handleAlertMessage({
          text: "您尚未註冊，請點選下方按鈕註冊帳號",
          replyToken: event.replyToken,
          action: {
            type: "uri",
            label: "註冊",
            uri: process.env.LINE_LIFF_URL! + `/register.html`,
          },
        });
      }
      return handleAlertMessage({
        text: "點選下方按鈕查看個人資料",
        replyToken: event.replyToken,
        action: {
          type: "uri",
          label: "查看",
          uri: process.env.LINE_LIFF_URL! + `/profile.html`,
        },
      });
    }

    if (event.message.text === "開始/結束對話") {
      if (!user) return handleUnregisterUser(event.replyToken);
      if (await OpenAILib.getCurrentChat(user)) {
        return handleAlertMessage({
          replyToken: event.replyToken,
          text: "是否結束本次對話？如需結束，請點選下方按鈕",
          action: {
            type: "postback",
            label: "結束對話",
            data: "user_cancel_task",
          },
        });
      }
      const chat = await getUnfinishedChat(user.id);
      if (chat) {
        return handleConfirmMessage({
          replyToken: event.replyToken,
          text: "您有未完成的對話，是否繼續？",
          actions: [
            {
              type: "postback",
              label: "是，繼續對話",
              data: "user_want_resume_conversation",
            },
            {
              type: "postback",
              label: "否，重新開始",
              data: "user_initiate_task",
            },
          ],
        });
      }
      return handleAlertMessage({
        replyToken: event.replyToken,
        text: "請點選下方按鈕開始對話",
        action: {
          type: "postback",
          label: "開始對話",
          data: "user_initiate_task",
        },
      });
    }

    // handle user sent text message
    if (!user) return handleUnregisterUser(event.replyToken);
    const textMessage = event.message.text;
    if (!limiter.canExecute(user)) return handleSystemIsBusy(event.replyToken);
    if (await OpenAILib.getCurrentChat(user)) {
      const openAIResult = await OpenAILib.chat({
        user,
        message: textMessage,
      });
      if (openAIResult.success && openAIResult.completed) {
        const chatId = uuidv4();
        try {
          await createChat({
            chatId,
            userId: user.id,
            chatType: openAIResult.chatType,
            followupId: openAIResult.followupId,
            data: openAIResult.history,
            report: openAIResult.report,
            reference: false,
          });
          await deleteUnfinishedChat(user.id);
          return handleChatReportMessage({
            chatId,
            replyToken: event.replyToken,
            report: openAIResult.report,
          });
        } catch (error) {
          console.error(error);
          return handleTextMessage({
            replyToken: event.replyToken,
            text: `很抱歉，由於系統發生錯誤，對話結束 - ${error}`,
          });
        }
      }
      return handleTextMessage({
        replyToken: event.replyToken,
        text: openAIResult.success
          ? openAIResult.reply
          : `很抱歉，系統目前無法回覆你的訊息 - ${openAIResult.error}`,
      });
    }
  }

  if (event.type === "postback") {
    if (!user) return handleUnregisterUser(event.replyToken);

    if (event.postback.data.startsWith("command:")) {
      const command = event.postback.data.replace("command:", "");
      return handleCommand({ replyToken: event.replyToken, command });
    }

    if (event.postback.data === "user_cancel_task") {
      if (!OpenAILib.getCurrentChat(user))
        return handleTextMessage({
          replyToken: event.replyToken,
          text: "對話已結束",
        });

      return handleSaveConversationQuickReply({
        replyToken: event.replyToken,
      });
    }

    if (event.postback.data === "user_request_save_current_chat") {
      const currentChat = await OpenAILib.getCurrentChat(user);
      if (!currentChat) return Promise.resolve(null);

      try {
        await saveUnfinishedChat(user.id, currentChat);
        await OpenAILib.deleteChat(user);
        return handleTextMessage({
          replyToken: event.replyToken,
          text: "本次對話已儲存，下次可繼續使用",
        });
      } catch (error) {
        return handleTextMessage({
          replyToken: event.replyToken,
          text: `無法儲存本次對話 - ${(error as Error).message}`,
        });
      }
    }

    if (event.postback.data === "user_request_not_save_current_chat") {
      if (!(await OpenAILib.getCurrentChat(user))) return Promise.resolve(null);

      await deleteUnfinishedChat(user.id);
      await OpenAILib.deleteChat(user);
      return handleTextMessage({
        replyToken: event.replyToken,
        text: "對話結束",
      });
    }

    if (event.postback.data === "user_initiate_task") {
      if (await OpenAILib.getCurrentChat(user))
        return handleTextMessage({
          replyToken: event.replyToken,
          text: "課程已開始",
        });
      return handleStartConversationQuickReply({
        replyToken: event.replyToken,
        user: user,
      });
    }

    if (event.postback.data === "user_want_resume_conversation") {
      if (!limiter.canExecute(user))
        return handleSystemIsBusy(event.replyToken);
      if (await OpenAILib.getCurrentChat(user))
        return handleTextMessage({
          replyToken: event.replyToken,
          text: "對話已開始",
        });
      const chat = await getUnfinishedChat(user.id);
      // console.log(chat);
      if (!chat) return Promise.resolve(null);
      await RedisLib.setChatHistory({
        userId: user.id,
        chatType: chat.chatType,
        followupId: chat.followupId,
        messages: chat.messages,
      });
      return handleTextMessage({
        replyToken: event.replyToken,
        text: [
          generateResumeChatText({
            chatType: chat.chatType,
            messages: chat.messages,
          }),
          "您可以接續上次未完成的對話",
        ],
      });
    }

    if (event.postback.data.startsWith("user_want_start_conversation:")) {
      if (!limiter.canExecute(user))
        return handleSystemIsBusy(event.replyToken);
      if (await OpenAILib.getCurrentChat(user))
        return handleTextMessage({
          replyToken: event.replyToken,
          text: "對話已開始",
        });
      const chatType = event.postback.data.replace(
        "user_want_start_conversation:",
        "",
      );

      if (
        chatType === "share" ||
        chatType === "topic" ||
        chatType === "follow-up"
      ) {
        await deleteUnfinishedChat(user.id);
        let openAIResult: OpenAIResult;
        if (chatType === "share" || chatType === "topic") {
          openAIResult = await OpenAILib.chat({
            user: user,
            message:
              chatType === "share" ? "分享一件今天的小好事" : "直接進主題",
            chatType,
          });
        } else {
          const chat = await getFollowupChat(user);
          if (!chat) return Promise.resolve(null);
          openAIResult = await OpenAILib.chat({
            user: user,
            message: `我想接續上次的話題\n${JSON.stringify(chat.report)}`,
            chatType,
            followupId: chat.id,
          });
        }

        return handleTextMessage({
          replyToken: event.replyToken,
          text: !openAIResult.success
            ? `很抱歉，系統目前無法回覆你的訊息 - ${openAIResult.error}`
            : openAIResult.completed
              ? "對話結束"
              : openAIResult.reply,
        });
      }
      return Promise.resolve(null);
    }

    if (event.postback.data.startsWith("user_request_refer_chat:")) {
      const chatId = event.postback.data.replace(
        "user_request_refer_chat:",
        "",
      );
      if (!chatId) return Promise.resolve(null);

      const [_, __, chat] = await Promise.all([
        setChatReference(chatId, true),
        updateUserDoc(user.id, { followupChatId: chatId }),
        getChatDocumentById(chatId),
      ]);
      if (!chat) return Promise.resolve(null);
      return handleChatReportFlexMessage({
        replyToken: event.replyToken,
        data: chat,
      });
    }

    if (event.postback.data === "user_request_not_refer_chat") {
      return handleTextMessage({
        replyToken: event.replyToken,
        text: "對話結束",
      });
    }
  }

  return Promise.resolve(null);
}

app.use(errorHandler);

// Set static folder
// app.use(express.static(__dirname + "/../liff/"));
app.use(express.static(path.join(__dirname, "../liff")));

// Handle SPA
// app.get(/.*/, (_, res) => res.sendFile(__dirname + "/../liff/index.html"));
app.get(/.*/, (_, res) =>
  res.sendFile(path.join(__dirname, "../liff/index.html")),
);

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
