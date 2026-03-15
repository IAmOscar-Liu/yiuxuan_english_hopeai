import { ChatMessage, ChatType } from "./openAI/type";

export function generateResumeChatText({
  chatType,
  messages,
}: {
  chatType: ChatType;
  messages: ChatMessage[];
}) {
  if (chatType === "follow-up" && messages.length > 0) {
    messages[0].content = "我想接續上次的話題";
  }

  return `以下是您上次未完成的對話內容：\n\n${messages.map((m) => `${m.role === "assistant" ? "老艾" : "你"}: ${m.content}`).join("\n")}`;
}
