import { messagingApi } from "@line/bot-sdk";
import { formatFirebaseDateTime } from "../formatter";
import { Report } from "./type";

/**
 * Try to parse the assistant reply as a report JSON.
 * If it doesn't match the expected shape, return null.
 */
export function tryParseReport(text: string): Report | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

  try {
    const obj = JSON.parse(trimmed);

    if (
      obj &&
      typeof obj === "object" &&
      typeof obj.complete === "boolean" &&
      typeof obj.block_type === "string" &&
      (typeof obj.feasibility === "number" ||
        typeof obj.feasibility === "string") &&
      (typeof obj.task_done === "number" ||
        typeof obj.task_done === "string") &&
      (typeof obj.session_stage === "number" ||
        typeof obj.session_stage === "string") &&
      typeof obj.next_step === "string" &&
      typeof obj.planned_time === "string" &&
      typeof obj.planned_duration === "string" &&
      typeof obj.success_definition === "string" &&
      typeof obj.task_status === "string" &&
      typeof obj.session_type === "string" &&
      typeof obj.summary === "string" &&
      typeof obj.coach_feedback === "string"
    ) {
      obj.feasibility = Number(obj.feasibility);
      obj.task_done = Number(obj.task_done);
      obj.session_stage = Number(obj.session_stage);
      return obj as Report;
    }
  } catch {
    // not valid JSON, ignore
  }

  return null;
}

function getTaskStatusText(task_status: string) {
  switch (task_status) {
    case "completed":
      return "我做到了";
    case "partial":
      return "我有動一點 ";
    case "not_started":
      return "我還沒開始";
    case "stuck":
      return "我試了但卡住";
    default:
      return task_status;
  }
}

function getSessionTypeText(session_type: string) {
  switch (session_type) {
    case "good_thing":
      return "好事分享";
    case "new_topic":
      return "新主題";
    case "follow_up":
      return "接續話題";
    case "task_checkin":
      return "任務簽到";
    default:
      return session_type;
  }
}

/*
{
"complete": true,
"block_type": "害怕失控",
"feasibility": 8,
"task_done": 1,
"session_stage": 10,
"next_step": "下班前用十五分鐘上人力銀行瀏覽約三十個職缺，挑出三到五個喜歡的",
"planned_time": "下班前十五分鐘",
"planned_duration": "十五分鐘",
"success_definition": "從約三十個職缺中挑出三到五個喜歡的職缺",
"task_status": "",
"session_type": "new_topic",
"summary": "本輪聚焦在離職後空窗期帶來的收入不確定與房租、卡費壓力，先把焦慮轉成可估的行動：下班前用十五分鐘在職缺平台瀏覽約三十個職缺，挑出三到五個喜歡的，作為後續推算空窗期與求職節奏的起點。",
"coach_feedback": "把「空窗多久」從腦內擔心改成一個十五分鐘可完成的小步，這個抓法很務實。"
}
*/

export function createReportString(report: Report) {
  let result = "🎉 恭喜您完成此次對話！以下是對話成果：\n\n";

  if (report.session_type)
    result += `💬 對話類型：${getSessionTypeText(report.session_type)}\n\n`;
  if (report.block_type) result += `🧩 卡點：${report.block_type}\n\n`;
  if (report.task_status)
    result += `✅ 回報小步：${getTaskStatusText(report.task_status)}\n\n`;
  if (report.summary) result += `📝 結論：${report.summary}\n\n`;
  if (report.next_step) result += `🚀 下一步：${report.next_step}\n\n`;
  if (report.planned_time) result += `⏰ 開始時間：${report.planned_time}\n\n`;
  if (report.planned_duration)
    result += `⏳ 持續時間：${report.planned_duration}\n\n`;
  if (report.success_definition)
    result += `🎯 成功定義：${report.success_definition}\n\n`;
  if (report.feasibility) result += `🌟 掌控度：${report.feasibility}\n\n`;
  if (report.coach_feedback) result += `💡 回饋：${report.coach_feedback}\n\n`;

  return result;
}

export function buildChatReportFlexMessage({
  chatId,
  report,
  createdAt,
}: {
  chatId: string;
  report: Report;
  createdAt: any;
}) {
  const flexMessageJson: messagingApi.FlexContainer = {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
      action: {
        type: "uri",
        uri: `${process.env.LINE_LIFF_URL}/chat-details.html?chatId=${chatId}`,
      },
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `[${getSessionTypeText(report.session_type)}] ${report.block_type}`,
          weight: "bold",
          size: "xl",
        },
        {
          type: "text",
          text: report.summary, // <-- Add your subtitle text here
          size: "sm",
          color: "#888888",
          margin: "md",
          wrap: true,
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            ...(report.task_status
              ? ([
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "回報小步",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 2,
                        maxLines: 1,
                        wrap: false,
                      },
                      {
                        type: "text",
                        text: getTaskStatusText(report.task_status),
                        wrap: true,
                        color: "#666666",
                        size: "sm",
                        flex: 5,
                      },
                    ],
                  },
                ] as messagingApi.FlexComponent[])
              : []),
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "下一步",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                  maxLines: 1,
                  wrap: false,
                },
                {
                  type: "text",
                  text: report.next_step,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "開始時間",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                  maxLines: 1,
                  wrap: false,
                },
                {
                  type: "text",
                  text: report.planned_time,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "持續時間",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                  maxLines: 1,
                  wrap: false,
                },
                {
                  type: "text",
                  text: report.planned_duration,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "掌控度",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                  maxLines: 1,
                  wrap: false,
                },
                {
                  type: "text",
                  text: `${report.feasibility} / 10`,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "完成時間",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                  maxLines: 1,
                  wrap: false,
                },
                {
                  type: "text",
                  text: formatFirebaseDateTime(createdAt),
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "查看細節",
            uri: `${process.env.LINE_LIFF_URL}/chat-details.html?chatId=${chatId}`,
          },
        },
        {
          type: "box",
          layout: "vertical",
          contents: [],
          margin: "sm",
        },
      ],
      flex: 0,
    },
  };

  return flexMessageJson;
}
