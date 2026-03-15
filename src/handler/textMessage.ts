import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleTextMessage({
  text,
  replyToken,
}: {
  text: string | string[];
  replyToken?: string;
}) {
  if (!replyToken) return Promise.resolve(null);
  // create an echoing text message

  const messages: Array<messagingApi.Message> = Array.isArray(text)
    ? text.map((t) => ({ type: "text", text: t }))
    : [{ type: "text", text }];

  // if (!Array.isArray(text)) {
  // return client.replyMessage({
  //   replyToken,
  //   messages: [{
  //     type: 'text',
  //     text,
  //   }],
  // });

  // }
  // const echo: messagingApi.Message = {
  //   type: "text",
  //   text,
  // };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages,
  });
}
