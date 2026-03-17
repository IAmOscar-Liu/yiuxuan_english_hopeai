export const CUSTOM_SETTINGS = {
  identities: [
    { key: "parent", label: "家長" },
    { key: "office_worker", label: "上班族" },
    { key: "educator", label: "老師／教育工作者" },
    { key: "freelancer", label: "自己接案的人" },
    { key: "business_owner", label: "自己做生意的人" },
  ],
  usages: [
    { key: "messy_mind", label: "腦中很亂，想整理清楚" },
    { key: "stuck", label: "有卡點，想找下一步" },
    { key: "stressed", label: "壓力很大，想先穩下來" },
    { key: "moving_forward", label: "想把一件事往前推進" },
    { key: "companion", label: "想找人陪我想一想" },
  ],
  ageRanges: [
    { key: "lt15", label: "<15" },
    { key: "15-25", label: "15-25" },
    { key: "25-34", label: "25-34" },
    { key: "35-44", label: "35-44" },
    { key: "45-54", label: "45-54" },
    { key: "55-64", label: "55-64" },
    { key: "gt54", label: ">54" },
  ],
};

export class Time {
  static oneSecond = 1000;
  static oneMinute = 60 * Time.oneSecond;
  static oneHour = 60 * Time.oneMinute;
  static oneDay = 24 * Time.oneHour;
}
