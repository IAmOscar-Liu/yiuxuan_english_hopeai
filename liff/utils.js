export function formatDateTime(dateInput) {
  if (!dateInput) return "-";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

export function getTaskStatusText(task_status) {
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

export function getSessionTypeText(session_type) {
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
