import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";
import { Report } from "../lib/openAI/type";
import {
  buildChatReportFlexMessage,
  createReportString,
} from "../lib/openAI/utils";

export function handleChatReportMessage({
  report,
  replyToken,
  chatId,
}: {
  replyToken?: string;
  report: Report;
  chatId: string;
}) {
  if (!replyToken) return Promise.resolve(null);

  const echo: messagingApi.Message = {
    type: "text",
    text: createReportString(report),
  };

  const templateMessage: messagingApi.Message = {
    type: "template",
    altText: "是否儲存本次對話？以便下次繼續使用",
    template: {
      type: "confirm",
      text: "是否儲存本次對話？以便下次繼續使用",
      actions: [
        {
          type: "postback",
          label: "儲存",
          data: `user_request_refer_chat:${chatId}`,
        },
        {
          type: "postback",
          label: "不儲存",
          data: "user_request_not_refer_chat",
        },
      ],
    },
  };

  return client.replyMessage({
    replyToken,
    messages: [echo, templateMessage],
  });
}

export function handleChatReportFlexMessage({
  replyToken,
  data,
}: {
  replyToken?: string;
  data: {
    [field: string]: any;
  };
}) {
  if (!replyToken) return Promise.resolve(null);

  const echo: messagingApi.Message = {
    type: "text",
    text: "對話已儲存，以下是您本次對話的成果圖卡",
  };

  // Create the message object to be sent
  const message: messagingApi.Message = {
    type: "flex",
    altText: "您的對話成果圖卡",
    contents: buildChatReportFlexMessage({
      chatId: data.id,
      report: data.report,
      createdAt: data.createdAt,
    }),
  };

  return client.replyMessage({
    replyToken,
    messages: [echo, message],
  });
}
