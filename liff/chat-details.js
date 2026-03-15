import {
  formatDateTime,
  getSessionTypeText,
  getTaskStatusText,
} from "./utils.js";
import { getProfile, initWithSearchParams } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const contentDiv = document.getElementById("content");

(async function () {
  let chatId;

  // 1. Initialize LIFF
  const initError = await initWithSearchParams((urlParams) => {
    chatId = urlParams.get("chatId");
  });
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }

  // 2. Get Profile to get userId
  const profile = await getProfile();
  const userId = profile?.userId;

  if (!userId) {
    loadingDiv.innerHTML = `<div class='text-danger'>無法取得使用者 ID。請確認您是在 LINE App 中開啟此頁面。</div>`;
    return;
  }

  try {
    // 3. Get User Token
    const userRes = await fetch(`/api/user/${userId}`);
    const userJson = await userRes.json();

    if (!userRes.ok || !userJson.success) {
      throw new Error(userJson.message || "User fetch failed");
    }

    const token = userJson.data.token;
    const userInfo = userJson.data.user;

    // 4. Get Chat Details
    const chatRes = await fetch(`/api/chat/${chatId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const chatJson = await chatRes.json();

    if (!chatRes.ok || !chatJson.success) {
      throw new Error(chatJson.message || "Chat fetch failed");
    }

    const chatData = chatJson.data;
    renderPage(chatData, userInfo);
  } catch (err) {
    console.error(err);
    loadingDiv.innerHTML = `<div class='text-danger'>無法載入資料: ${err.message}</div>`;
  }

  function renderPage(chat, user) {
    const report = chat.report || {};
    const messages = chat.data || [];

    // Handle timestamps
    let createdDateStr = "-";
    if (chat.createdAt && chat.createdAt._seconds) {
      createdDateStr = formatDateTime(new Date(chat.createdAt._seconds * 1000));
    } else if (chat.createdAt) {
      createdDateStr = formatDateTime(chat.createdAt);
    }

    // Build HTML
    let html = "";

    // --- 1. Report / Summary Section ---
    html += `
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0 text-truncate">
            <i class="bi bi-journal-text me-2"></i>
            ${getSessionTypeText(report.session_type || chat.chatType)}
            ${report.block_type ? `- ${report.block_type}` : ""}
          </h5>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-baseline mb-3">
            <h6 class="card-subtitle text-muted mb-0">會員：${user.nickname || user.displayName || "未知"}</h6>
            <small class="text-secondary" style="font-size: 0.85em;">${createdDateStr}</small>
          </div>
          ${report.summary ? `<div class="alert alert-light border mb-3"><strong>結論：</strong>${report.summary}</div>` : ""}
          
          <dl class="row mb-0">
            ${
              report.task_status
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-clipboard-check me-1"></i>回報小步</dt>
              <dd class="col-sm-9 fw-medium">${getTaskStatusText(report.task_status)}</dd>`
                : ""
            }
            
            ${
              report.next_step
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-arrow-right-circle me-1"></i>下一步</dt>
              <dd class="col-sm-9 fw-medium">${report.next_step}</dd>`
                : ""
            }
            
            ${
              report.planned_time
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-clock me-1"></i>開始時間</dt>
              <dd class="col-sm-9 fw-medium">${report.planned_time}</dd>`
                : ""
            }
            
            ${
              report.planned_duration
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-hourglass-split me-1"></i>持續時間</dt>
              <dd class="col-sm-9 fw-medium">${report.planned_duration}</dd>`
                : ""
            }

            ${
              report.success_definition
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-trophy me-1"></i>成功定義</dt>
              <dd class="col-sm-9 fw-medium">${report.success_definition}</dd>`
                : ""
            }
            
            ${
              report.feasibility
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-bar-chart me-1"></i>掌控度</dt>
              <dd class="col-sm-9 fw-medium">${report.feasibility} / 10</dd>`
                : ""
            }

            ${
              report.coach_feedback
                ? `
              <dt class="col-sm-3 text-success"><i class="bi bi-chat-quote me-1"></i>回饋</dt>
              <dd class="col-sm-9 fw-medium text-pre-wrap">${report.coach_feedback}</dd>`
                : ""
            }
          </dl>

          ${
            chat.followupId
              ? `
            <div class="mt-3 text-end">
              <a href="chat-details.html?chatId=${chat.followupId}" class="btn btn-outline-primary btn-sm">
                查看前次對話 <i class="bi bi-arrow-right"></i>
              </a>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;

    // --- 2. Chat History Section ---
    html += `
      <div class="card shadow-sm mb-4">
        <div class="card-header bg-light" role="button" data-bs-toggle="collapse" data-bs-target="#chatHistoryCollapse" aria-expanded="true" aria-controls="chatHistoryCollapse">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-chat-dots me-2"></i>對話紀錄</h5>
            <i class="bi bi-chevron-down"></i>
          </div>
        </div>
        <div id="chatHistoryCollapse" class="collapse show">
          <div class="card-body">
            <div class="d-flex flex-column">
    `;
    messages.forEach((msg) => {
      const isUser = msg.role === "user";
      html += `
        <div class="chat-bubble ${isUser ? "user" : "assistant"}">
          ${msg.content.replace(/\n/g, "<br>")}
        </div>
      `;
    });
    html += `</div></div></div></div>`;

    // Render
    contentDiv.innerHTML = html;
    loadingDiv.classList.add("hidden");
    contentDiv.classList.remove("hidden");
  }
})();
