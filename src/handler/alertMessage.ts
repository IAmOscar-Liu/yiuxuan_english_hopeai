import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleAlertMessage({
  replyToken,
  altText,
  text,
  action,
}: {
  replyToken?: string;
  altText?: string;
  text: string;
  action: messagingApi.Action;
}) {
  if (!replyToken) return Promise.resolve(null);
  //   // create an echoing text message
  // create an echoing text message
  const templateMessage: messagingApi.Message = {
    type: "template",
    altText: altText || text,
    template: {
      type: "buttons",
      text,
      actions: [action],
    },
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [templateMessage],
  });
}
