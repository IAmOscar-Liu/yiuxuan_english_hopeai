import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleUnregisterUser(replyToken?: string) {
  if (!replyToken) return Promise.resolve(null);
  // create an echoing text message

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: "您尚未註冊，請點選主選單『我的帳號』註冊帳號",
      },
    ],
  });
}

export function handleSystemIsBusy(replyToken?: string) {
  if (!replyToken) return Promise.resolve(null);
  // create an echoing text message

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: "系統正在回覆您的訊息，請稍後......",
      },
    ],
  });
}
