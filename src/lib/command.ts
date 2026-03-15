import { handleTextMessage } from "../handler/textMessage";

export function handleCommand({
  replyToken,
  command,
}: {
  replyToken?: string;
  command: string;
}) {
  if (!replyToken) return Promise.resolve(null);
  //   // create an echoing text message
  if (command === "cancel")
    return handleTextMessage({
      replyToken,
      text: "動作已取消",
    });

  return Promise.resolve(null);
}
