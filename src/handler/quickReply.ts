import { messagingApi } from "@line/bot-sdk";
import { getFollowupChat } from "../firebase/chat";
import client from "../lib/client";

export async function handleStartConversationQuickReply({
  replyToken,
  user,
}: {
  replyToken?: string;
  user: {
    [field: string]: any;
  };
}) {
  if (!replyToken) return Promise.resolve(null);

  const chat = await getFollowupChat(user);

  const echo: messagingApi.Message = {
    type: "text",
    text: `Hello${user.nickName ? " " + user.nickName : ""}，我是老艾，你的希望陪伴者，在對話開始前，請先確定網路順暢，如需結束，請再次點選主選單『開始/結束對話』，祝您有個愉快的一天！`,
  };

  // create an echoing text message
  const templateMessage: messagingApi.Message = {
    type: "text",
    text: "請選擇你的需求？",
    quickReply: {
      items: [
        ...(chat
          ? ([
              {
                type: "action",
                action: {
                  type: "postback",
                  label: "接續上次對話",
                  data: "user_want_start_conversation:follow-up",
                },
              },
            ] as messagingApi.QuickReplyItem[])
          : []),
        {
          type: "action",
          action: {
            type: "postback",
            label: "分享一件今天的小好事",
            data: "user_want_start_conversation:share",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "直接進入主題",
            data: "user_want_start_conversation:topic",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "取消",
            data: "command:cancel",
          },
        },
      ],
    },
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [echo, templateMessage],
  });
}

export function handleSaveConversationQuickReply({
  replyToken,
}: {
  replyToken?: string;
}) {
  if (!replyToken) return Promise.resolve(null);

  // create an echoing text message
  const templateMessage: messagingApi.Message = {
    type: "text",
    text: "對話未完成，是否儲存？",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "儲存",
            data: "user_request_save_current_chat",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "不儲存",
            data: "user_request_not_save_current_chat",
          },
        },
      ],
    },
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [templateMessage],
  });
}
