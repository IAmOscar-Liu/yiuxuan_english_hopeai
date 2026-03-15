import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleConfirmMessage({
  replyToken,
  altText,
  text,
  actions,
}: {
  replyToken?: string;
  altText?: string;
  text: string;
  actions: messagingApi.Action[];
}) {
  if (!replyToken) return Promise.resolve(null);
  //   // create an echoing text message
  // create an echoing text message
  const templateMessage: messagingApi.Message = {
    type: "template",
    altText: altText || text,
    template: {
      type: "confirm",
      text,
      actions,
    },
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [templateMessage],
  });
}
