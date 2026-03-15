import { getProfile, initWithSearchParams } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const errorMsg = document.getElementById("error-msg");

const hopeRing = document.getElementById("hope-ring");
const controlRing = document.getElementById("control-ring");
const actionRing = document.getElementById("action-ring");

const hopeVal = document.getElementById("hope-val");
const controlVal = document.getElementById("control-val");
const actionVal = document.getElementById("action-val");

function setRing(ring, radius, percentage) {
  const circumference = 2 * Math.PI * radius;
  ring.style.strokeDasharray = `${circumference} ${circumference}`;
  const offset = circumference - Math.min(percentage, 1) * circumference;
  ring.style.strokeDashoffset = offset;
}

const statusScores = {
  completed: 10,
  partial: 6,
  stuck: 3,
  not_started: 0,
};

(async function () {
  try {
    const initError = await initWithSearchParams(() => {});
    if (initError) throw new Error(`LIFF 初始化失敗: ${initError}`);

    const profile = await getProfile();
    const userId = profile?.userId;
    if (!userId) throw new Error("無法取得使用者 ID");

    // Get Token
    const userRes = await fetch(`/api/user/${userId}`);
    const userJson = await userRes.json();
    if (!userRes.ok || !userJson.success) throw new Error("取得使用者資料失敗");

    const token = userJson.data.token;

    // Fetch last 7 days chats
    const startAt = new Date();
    startAt.setDate(startAt.getDate() - 7);

    const chatRes = await fetch(
      `/api/chat/list?startAt=${startAt.toISOString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const chatJson = await chatRes.json();
    if (!chatRes.ok || !chatJson.success) throw new Error("取得對話記錄失敗");

    const chats = chatJson.data || [];

    // 1. 希望圈 (Hope) - Number of chats, goal 7
    const chatCount = chats.length;
    hopeVal.innerText = chatCount;
    setRing(hopeRing, 70, chatCount / 7);

    // 2. 掌控圈 (Control) - Latest feasibility, goal 10
    let latestFeasibility = 0;
    if (chats.length > 0) {
      // Find latest chat with a report and feasibility
      const latestWithFeasibility = chats.find(
        (c) => c.report && c.report.feasibility !== undefined,
      );
      if (latestWithFeasibility) {
        latestFeasibility = Number(latestWithFeasibility.report.feasibility);
      }
    }
    controlVal.innerText = latestFeasibility;
    setRing(controlRing, 54, latestFeasibility / 10);

    // 3. 行動圈 (Action) - Average of task_status
    let totalScore = 0;
    let scoreCount = 0;
    chats.forEach((chat) => {
      const status = chat.report?.task_status;
      if (status && statusScores[status] !== undefined) {
        totalScore += statusScores[status];
        scoreCount++;
      }
    });

    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    actionVal.innerText = avgScore.toFixed(1);
    setRing(actionRing, 38, avgScore / 10);

    loadingDiv.classList.add("d-none");
  } catch (err) {
    console.error(err);
    loadingDiv.classList.add("d-none");
    errorMsg.innerText = err.message;
    errorMsg.classList.remove("d-none");
  }
})();
