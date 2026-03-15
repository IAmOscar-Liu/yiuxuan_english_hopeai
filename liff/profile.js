import { init, getProfile } from "./liff.js";
import { formatDateTime } from "./utils.js";

const loadingDiv = document.getElementById("loading");
const profileContainer = document.getElementById("profile-container");
const nicknameEl = document.getElementById("nickname");
const emailEl = document.getElementById("email");
const phoneEl = document.getElementById("phone");
const createdAtEl = document.getElementById("createdAt");

// Edit mode elements
const viewMode = document.getElementById("view-mode");
const editMode = document.getElementById("edit-mode");
const editBtn = document.getElementById("editBtn");
const cancelBtn = document.getElementById("cancelBtn");
const editForm = document.getElementById("editForm");
const nicknameInput = document.getElementById("nickname-input");
const emailInput = document.getElementById("email-input");
const phoneInput = document.getElementById("phone-input");
const saveBtn = document.getElementById("saveBtn");
const updateSuccessModalEl = document.getElementById("updateSuccessModal");

(async function () {
  // 1. Initialize LIFF
  const initError = await init();
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

  let currentUser = null;
  let authToken = "";

  // 3. Fetch user data from your API
  try {
    const res = await fetch(`/api/user/${userId}`);
    const resData = await res.json();

    if (res.ok && resData.success === true && resData.data.user) {
      const user = resData.data.user;
      currentUser = user;
      authToken = resData.data.token;

      // 4. Render user info
      nicknameEl.textContent = user.nickname || "-";
      emailEl.textContent = user.email || "-";
      phoneEl.textContent = user.phone || "-";

      if (user.createdAt && user.createdAt._seconds) {
        const dateObj = new Date(user.createdAt._seconds * 1000);
        createdAtEl.textContent = formatDateTime(dateObj);
      } else {
        createdAtEl.textContent = formatDateTime(null);
      }

      // 5. Show profile
      loadingDiv.classList.add("hidden");
      profileContainer.classList.remove("hidden");
    } else {
      loadingDiv.innerHTML = `<div class='text-danger'>無法取得使用者資料：${resData.message || "伺服器錯誤"}</div>`;
    }
  } catch (err) {
    console.error(err);
    loadingDiv.innerHTML = `<div class='text-danger'>網路錯誤，無法取得使用者資料。</div>`;
  }

  // Event Listeners for Edit Mode
  editBtn.addEventListener("click", () => {
    if (!currentUser) return;

    // Populate inputs
    nicknameInput.value = currentUser.nickname || "";
    emailInput.value = currentUser.email || "";
    phoneInput.value = currentUser.phone || "";

    // Toggle UI
    viewMode.classList.add("hidden");
    editMode.classList.remove("hidden");
    editBtn.classList.add("hidden");
  });

  cancelBtn.addEventListener("click", () => {
    editMode.classList.add("hidden");
    viewMode.classList.remove("hidden");
    editBtn.classList.remove("hidden");
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newData = {
      nickname: nicknameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
    };

    saveBtn.disabled = true;
    saveBtn.innerText = "儲存中...";

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newData),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        // Update local data
        currentUser = { ...currentUser, ...newData };

        // Update UI
        nicknameEl.textContent = currentUser.nickname || "-";
        emailEl.textContent = currentUser.email || "-";
        phoneEl.textContent = currentUser.phone || "-";

        // Show Success Modal
        const modal = new window.bootstrap.Modal(updateSuccessModalEl);
        modal.show();

        // Switch back to view mode
        editMode.classList.add("hidden");
        viewMode.classList.remove("hidden");
        editBtn.classList.remove("hidden");
      } else {
        alert(`更新失敗: ${resData.message || "未知錯誤"}`);
      }
    } catch (err) {
      alert("更新失敗: 網路錯誤");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerText = "儲存";
    }
  });
})();
