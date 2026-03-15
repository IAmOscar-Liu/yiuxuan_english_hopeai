import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleJoin({ replyToken }: { replyToken: string }) {
  const welcomeMessage: messagingApi.Message = {
    type: "text",
    text: "Welcome! Thank you for joining.",
  };
  return client.replyMessage({
    replyToken,
    messages: [welcomeMessage],
  });
}
