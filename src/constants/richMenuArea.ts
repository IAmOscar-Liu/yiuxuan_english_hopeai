import { messagingApi } from "@line/bot-sdk";

// export const richMenuAArea: messagingApi.RichMenuArea[] = [
//   {
//     bounds: { x: 0, y: 0, width: 1250, height: 843 },
//     action: { type: "message", text: "選擇主題" },
//   },
//   {
//     bounds: { x: 1251, y: 0, width: 1250, height: 843 },
//     action: { type: "message", text: "登入" },
//   },
// ];

export const richMenuAArea: messagingApi.RichMenuArea[] = [
  {
    bounds: { x: 0, y: 0, width: 1250, height: 843 },
    action: { type: "message", text: "開始/結束對話" },
  },
  {
    bounds: { x: 1251, y: 0, width: 1250, height: 843 },
    action: { type: "message", text: "我的希望存簿" },
  },
  {
    bounds: { x: 0, y: 844, width: 1250, height: 843 },
    action: { type: "message", text: "影片連結" },
  },
  {
    bounds: { x: 1251, y: 844, width: 1250, height: 843 },
    action: { type: "message", text: "我的帳號" },
  },
];
