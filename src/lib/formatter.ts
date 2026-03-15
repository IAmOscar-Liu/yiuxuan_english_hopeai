/**
 * Converts a JavaScript Date object to a readable string in the format "YYYY-MM-DD HH:mm:ss".
 * If the input is not a valid Date, returns "Invalid Date".
 * @param date - The JavaScript Date object to format.
 * @returns A formatted date string.
 */
export function formatDateToString(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid Date";
  }
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDateToLocal(date: Date) {
  const pad = (n: any) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatFirebaseDateTime(date: any) {
  if (date.seconds == null) return "N/A";
  const timestamp = Number(date.seconds * 1000);
  return convertTimeStampToLocalTimeString(timestamp);
}

export function convertTimeStampToLocalTimeString(timestamp: number) {
  const date = new Date(timestamp); // convert seconds → ms

  // Create formatter for Asia/Taipei
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.TIME_ZONE || "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}:${lookup.second}`;
}

export function formatUserRole(role: any) {
  switch (role) {
    case "student":
      return "學生";
    case "parent":
      return "家長";
    case "teacher":
      return "老師";
    default:
      return "N/A";
  }
}
