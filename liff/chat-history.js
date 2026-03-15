import { formatDateTime, getSessionTypeText } from "./utils.js";
import { getProfile, init } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const chatListDiv = document.getElementById("chat-list");
const chatCardsContainer = document.getElementById("chat-cards-container");
const filterSelect = document.getElementById("filter-select");
const dateInputsContainer = document.getElementById("date-inputs-container");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const submitDateBtn = document.getElementById("submit-date-btn");
const clearStartDateBtn = document.getElementById("clear-start-date");
const clearEndDateBtn = document.getElementById("clear-end-date");
const confirmSetBtn = document.getElementById("confirmSetBtn");

let currentUserToken = null;
let currentUserId = null;
let followupChatId = null;
let pendingChatId = null;

let confirmModal = null;
let successToast = null;

const SESSION_STORAGE_KEY = "chat_history_filter";

function updateClearButtonVisibility() {
  if (startDateInput.value) {
    clearStartDateBtn.classList.add("visible");
  } else {
    clearStartDateBtn.classList.remove("visible");
  }

  if (endDateInput.value) {
    clearEndDateBtn.classList.add("visible");
  } else {
    clearEndDateBtn.classList.remove("visible");
  }
}

function saveFilterToSession() {
  const filterData = {
    filterValue: filterSelect.value,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
  };
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(filterData));
  updateClearButtonVisibility();
}

function loadFilterFromSession() {
  const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (saved) {
    try {
      const { filterValue, startDate, endDate } = JSON.parse(saved);
      filterSelect.value = filterValue || "all";
      startDateInput.value = startDate || "";
      endDateInput.value = endDate || "";

      if (filterValue === "custom") {
        dateInputsContainer.classList.remove("d-none");
      }
      updateClearButtonVisibility();
    } catch (e) {
      console.error("Error parsing saved filter", e);
    }
  }
}

async function fetchAndRenderChats() {
  if (!currentUserToken || !currentUserId) return;

  saveFilterToSession();

  chatCardsContainer.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-secondary" role="status"></div></div>';

  let startAt, endAt;
  const filterValue = filterSelect.value;

  if (filterValue === "last-week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startAt = d.toISOString();
  } else if (filterValue === "last-month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    startAt = d.toISOString();
  } else if (filterValue === "custom") {
    if (startDateInput.value)
      startAt = new Date(startDateInput.value).toISOString();
    if (endDateInput.value) endAt = new Date(endDateInput.value).toISOString();
  }

  try {
    let url = `/api/chat/list`;
    const params = new URLSearchParams();
    if (startAt) params.append("startAt", startAt);
    if (endAt) params.append("endAt", endAt);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${currentUserToken}` },
    });
    const json = await res.json();

    if (!res.ok || !json.success)
      throw new Error(json.message || "Failed to fetch chats");

    renderChatCards(json.data);
  } catch (err) {
    console.error(err);
    chatCardsContainer.innerHTML = `<div class="alert alert-danger">載入失敗: ${err.message}</div>`;
  }
}

function renderChatCards(chats) {
  if (!chats || chats.length === 0) {
    chatCardsContainer.innerHTML =
      '<div class="text-center py-5 text-muted">目前沒有對話紀錄</div>';
    return;
  }

  // Determine which chat to mark as the follow-up target
  let targetId = followupChatId;
  const chatIds = chats.map((c) => c.id);

  // If followupChatId is not in the current list (e.g. filtered out or doesn't exist),
  // default to the latest one (index 0) if it's the "all" filter, or maybe just leave it.
  // The user said "By default, the latest chat should be the one user can follow up next time".
  if (!targetId || !chatIds.includes(targetId)) {
    targetId = chats[0].id;
  }

  chatCardsContainer.innerHTML = chats
    .map((chat) => {
      const report = chat.report || {};
      let dateStr = "-";
      if (chat.createdAt && chat.createdAt._seconds) {
        dateStr = formatDateTime(new Date(chat.createdAt._seconds * 1000));
      } else if (chat.createdAt) {
        dateStr = formatDateTime(chat.createdAt);
      }

      const sessionTitle = getSessionTypeText(
        report.session_type || chat.chatType,
      );
      const blockTitle = report.block_type ? ` - ${report.block_type}` : "";
      const isTarget = chat.id === targetId;

      return `
      <div class="card shadow-sm mb-3 ${isTarget ? "border-success" : ""}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <a href="chat-details.html?chatId=${chat.id}" class="card-link flex-grow-1 me-2">
              <h5 class="card-title text-primary mb-1">
                ${sessionTitle}${blockTitle}
              </h5>
              <div class="text-muted small mb-2">${dateStr}</div>
            </a>
            <div class="d-flex flex-column align-items-end">
              ${
                isTarget
                  ? '<span class="badge bg-success mb-2 match-btn-sm">下次接續對話</span>'
                  : `<button class="btn btn-outline-secondary btn-sm mb-2 match-btn-sm set-followup-btn" data-chat-id="${chat.id}">
                      <i class="bi bi-pin-angle"></i> 設為接續
                    </button>`
              }
            </div>
          </div>
          <a href="chat-details.html?chatId=${chat.id}" class="card-link">
            ${
              report.summary
                ? `<p class="card-text mt-2 mb-0 summary-truncate">${report.summary}</p>`
                : '<p class="card-text text-muted mt-2 mb-0 small">無摘要</p>'
            }
          </a>
        </div>
      </div>
    `;
    })
    .join("");

  // Attach event listeners to the new buttons
  document.querySelectorAll(".set-followup-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      pendingChatId = btn.getAttribute("data-chat-id");
      if (confirmModal) {
        confirmModal.show();
      }
    });
  });
}

async function updateFollowupChat(chatId) {
  try {
    const res = await fetch("/api/user/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUserToken}`,
      },
      body: JSON.stringify({ followupChatId: chatId }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Update failed");
    }

    if (successToast) {
      successToast.show();
    }

    // Clear focus to prevent sticky hover/active states
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Refresh the data
    followupChatId = chatId;
    fetchAndRenderChats();
  } catch (err) {
    console.error(err);
    alert(`更新失敗: ${err.message}`);
  }
}

// LIFF init and prefill
(async function () {
  const initError = await init();

  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }

  const profile = await getProfile();
  currentUserId = profile?.userId;

  if (!currentUserId) {
    loadingDiv.innerHTML = `<div class='text-danger'>無法取得使用者 ID。請確認您是在 LINE App 中開啟此頁面。</div>`;
    return;
  }

  try {
    const userRes = await fetch(`/api/user/${currentUserId}`);
    const userJson = await userRes.json();
    if (!userRes.ok || !userJson.success)
      throw new Error(userJson.message || "User fetch failed");

    currentUserToken = userJson.data.token;
    followupChatId = userJson.data.user.followupChatId;

    // Initialize Bootstrap components
    confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
    successToast = new bootstrap.Toast(document.getElementById("successToast"));

    loadingDiv.classList.add("d-none");
    chatListDiv.classList.remove("d-none");

    loadFilterFromSession();
    fetchAndRenderChats();
  } catch (err) {
    console.error(err);
    loadingDiv.innerHTML = `<div class='text-danger'>初始化失敗: ${err.message}</div>`;
  }
})();

filterSelect.addEventListener("change", () => {
  if (filterSelect.value === "custom") {
    dateInputsContainer.classList.remove("d-none");
  } else {
    dateInputsContainer.classList.add("d-none");
    fetchAndRenderChats();
  }
});

submitDateBtn.addEventListener("click", fetchAndRenderChats);

confirmSetBtn.addEventListener("click", async () => {
  if (pendingChatId) {
    if (confirmModal) confirmModal.hide();
    await updateFollowupChat(pendingChatId);
    pendingChatId = null;
  }
});

startDateInput.addEventListener("input", updateClearButtonVisibility);
endDateInput.addEventListener("input", updateClearButtonVisibility);

clearStartDateBtn.addEventListener("click", () => {
  startDateInput.value = "";
  saveFilterToSession();
});

clearEndDateBtn.addEventListener("click", () => {
  endDateInput.value = "";
  saveFilterToSession();
});
