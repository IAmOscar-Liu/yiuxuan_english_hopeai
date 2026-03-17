import { init, getProfile } from "./liff.js";
import { formatDateTime } from "./utils.js";

const loadingDiv = document.getElementById("loading");
const profileContainer = document.getElementById("profile-container");
const nicknameEl = document.getElementById("nickname");
const emailEl = document.getElementById("email");
const ageRangeEl = document.getElementById("age-range");
const identityEl = document.getElementById("identity");
const usageEl = document.getElementById("usage");
const createdAtEl = document.getElementById("createdAt");

// Edit mode elements
const viewMode = document.getElementById("view-mode");
const editMode = document.getElementById("edit-mode");
const editBtn = document.getElementById("editBtn");
const cancelBtn = document.getElementById("cancelBtn");
const editForm = document.getElementById("editForm");
const nicknameInput = document.getElementById("nickname-input");
const emailInput = document.getElementById("email-input");
const ageRangeSelect = document.getElementById("age-range-input");
const identitySelect = document.getElementById("identity-input");
const identityOtherInput = document.getElementById("identity-other-input");
// usageCheckboxes will be queried when needed
const usageOtherCheckbox = document.getElementById("usage-other-checkbox");
const usageOtherInput = document.getElementById("usage-other-input");
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
  let apiSettings = null;

  const renderUserInfo = (user) => {
    nicknameEl.textContent = user.nickname || "-";
    emailEl.textContent = user.email || "-";

    // Map age range key to label
    let ageRangeDisplay = user.ageRange || "-";
    if (apiSettings?.ageRanges) {
      const found = apiSettings.ageRanges.find((a) => a.key === user.ageRange);
      if (found) ageRangeDisplay = found.label;
    }
    ageRangeEl.textContent = ageRangeDisplay;

    // Map identity key to label
    let identityDisplay = user.identity || "-";
    if (apiSettings?.identities) {
      const found = apiSettings.identities.find((i) => i.key === user.identity);
      if (found) identityDisplay = found.label;
    }
    identityEl.textContent = identityDisplay;

    // Map usage keys to labels
    if (user.usages && user.usages.length > 0) {
      const labels = user.usages.map((u) => {
        if (apiSettings?.usages) {
          const found = apiSettings.usages.find((item) => item.key === u);
          return found ? found.label : u;
        }
        return u;
      });
      usageEl.innerHTML = labels
        .map((label) => `<div class="mb-1">• ${label}</div>`)
        .join("");
    } else {
      usageEl.textContent = "-";
    }

    if (user.createdAt && user.createdAt._seconds) {
      const dateObj = new Date(user.createdAt._seconds * 1000);
      createdAtEl.textContent = formatDateTime(dateObj);
    } else {
      createdAtEl.textContent = formatDateTime(null);
    }
  };

  // 3. Fetch user data from your API
  try {
    const res = await fetch(`/api/user/${userId}`);
    const resData = await res.json();

    if (res.ok && resData.success === true && resData.data.user) {
      const user = resData.data.user;
      currentUser = user;
      authToken = resData.data.token;

      if (resData.data.settings) {
        apiSettings = resData.data.settings;
        const settings = apiSettings;
        // Inject Identities
        if (settings.identities) {
          const identitySelect = document.getElementById("identity-input");
          const otherOption =
            identitySelect.querySelector('option[value="其他"]');
          settings.identities.forEach((item) => {
            const opt = document.createElement("option");
            opt.value = item.key;
            opt.textContent = item.label;
            identitySelect.insertBefore(opt, otherOption);
          });
        }
        // Inject Usages
        if (settings.usages) {
          const usageContainer = document.getElementById("usage-container");
          settings.usages.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "form-check";
            div.innerHTML = `
              <input
                class="form-check-input usage-checkbox"
                type="checkbox"
                value="${item.key}"
                id="usage${index}"
              />
              <label class="form-check-label" for="usage${index}">
                ${item.label}
              </label>
            `;
            usageContainer.appendChild(div);
          });
        }
        // Inject Age Ranges
        if (settings.ageRanges) {
          const ageRangeSelect = document.getElementById("age-range-input");
          settings.ageRanges.forEach((item) => {
            const opt = document.createElement("option");
            opt.value = item.key;
            opt.textContent = item.label;
            ageRangeSelect.appendChild(opt);
          });
        }
      }

      // 4. Render user info
      renderUserInfo(user);

      // 5. Show profile
      loadingDiv.classList.add("hidden");
      profileContainer.classList.remove("hidden");
    } else if (res.ok && resData.success === true && !resData.data?.user) {
      // User not found, redirect to register
      window.location.href = "register.html";
      return;
    } else {
      loadingDiv.innerHTML = `<div class='text-danger'>無法取得使用者資料：${resData.message || "伺服器錯誤"}</div>`;
    }
  } catch (err) {
    console.error(err);
    loadingDiv.innerHTML = `<div class='text-danger'>網路錯誤，無法取得使用者資料。</div>`;
  }

  // Event Listeners for Edit Mode
  identitySelect.addEventListener("change", (e) => {
    if (e.target.value === "其他") {
      identityOtherInput.classList.remove("hidden");
    } else {
      identityOtherInput.classList.add("hidden");
    }
  });

  usageOtherCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      usageOtherInput.classList.remove("hidden");
    } else {
      usageOtherInput.classList.add("hidden");
    }
  });

  editBtn.addEventListener("click", () => {
    if (!currentUser) return;

    // Populate inputs
    nicknameInput.value = currentUser.nickname || "";
    emailInput.value = currentUser.email || "";
    ageRangeSelect.value = currentUser.ageRange || "";

    const standardIdentities = apiSettings?.identities?.map((i) => i.key) || [];
    if (currentUser.identity) {
      if (standardIdentities.includes(currentUser.identity)) {
        identitySelect.value = currentUser.identity;
        identityOtherInput.classList.add("hidden");
      } else {
        identitySelect.value = "其他";
        identityOtherInput.value = currentUser.identity;
        identityOtherInput.classList.remove("hidden");
      }
    } else {
      identitySelect.value = "";
      identityOtherInput.classList.add("hidden");
    }

    const standardUsages = apiSettings?.usages?.map((u) => u.key) || [];
    let hasOtherUsage = false;
    let otherUsageVal = "";

    const currentUsageCheckboxes = document.querySelectorAll(".usage-checkbox");
    currentUsageCheckboxes.forEach((cb) => {
      if (cb.id === "usage-other-checkbox") return;
      if (currentUser.usages && currentUser.usages.includes(cb.value)) {
        cb.checked = true;
      } else {
        cb.checked = false;
      }
    });

    if (currentUser.usages) {
      const otherUsages = currentUser.usages.filter(
        (u) => !standardUsages.includes(u),
      );
      if (otherUsages.length > 0) {
        hasOtherUsage = true;
        otherUsageVal = otherUsages.join(", ");
      }
    }

    usageOtherCheckbox.checked = hasOtherUsage;
    if (hasOtherUsage) {
      usageOtherInput.value = otherUsageVal;
      usageOtherInput.classList.remove("hidden");
    } else {
      usageOtherInput.value = "";
      usageOtherInput.classList.add("hidden");
    }

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

    const nicknameValue = nicknameInput.value.trim();
    if (!nicknameValue) {
      alert("請輸入暱稱");
      return;
    }

    const newData = {
      nickname: nicknameValue,
      email: emailInput.value.trim(),
      ageRange: ageRangeSelect.value,
      identity:
        identitySelect.value === "其他"
          ? identityOtherInput.value.trim()
          : identitySelect.value,
      usages: Array.from(document.querySelectorAll(".usage-checkbox"))
        .filter((cb) => cb.checked && cb.id !== "usage-other-checkbox")
        .map((cb) => cb.value),
    };

    if (usageOtherCheckbox.checked && usageOtherInput.value.trim()) {
      newData.usages.push(usageOtherInput.value.trim());
    }

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
        renderUserInfo(currentUser);

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
