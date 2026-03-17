import { init, getProfile, closeLiff } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const formContainer = document.getElementById("register-form-container");
const registerForm = document.getElementById("registerForm");
const nicknameInput = document.getElementById("nickname");
const emailInput = document.getElementById("email");
const ageRangeSelect = document.getElementById("age-range");
const identitySelect = document.getElementById("identity");
const identityOtherInput = document.getElementById("identity-other");
// usageCheckboxes will be queried in the submit handler
const usageOtherCheckbox = document.getElementById("usage-other-checkbox");
const usageOtherInput = document.getElementById("usage-other");
const successModalEl = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");

(async function () {
  // 1. Initialize LIFF
  const initError = await init();
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }

  // 2. Get Profile
  const profile = await getProfile();
  const userId = profile?.userId;

  if (!userId) {
    loadingDiv.innerHTML = `<div class='text-danger'>無法取得使用者 ID。請確認您是在 LINE App 中開啟此頁面。</div>`;
    return;
  }

  // 3. Check if user already registered
  try {
    const res = await fetch(`/api/user/${userId}`);
    const resData = await res.json();
    if (res.ok && resData.success === true) {
      if (resData.data?.user) {
        // User already registered, redirect to profile
        window.location.href = "profile.html";
        return;
      }

      if (resData.data?.settings) {
        const settings = resData.data.settings;
        // Inject Identities
        if (settings.identities) {
          const identitySelect = document.getElementById("identity");
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
          const ageRangeSelect = document.getElementById("age-range");
          settings.ageRanges.forEach((item) => {
            const opt = document.createElement("option");
            opt.value = item.key;
            opt.textContent = item.label;
            ageRangeSelect.appendChild(opt);
          });
        }
      }
    }
  } catch (err) {
    console.error("Error checking registration status:", err);
  }

  // 4. Populate Form
  if (profile?.displayName) {
    nicknameInput.value = profile.displayName;
  }

  // 5. Show Form
  loadingDiv.classList.add("hidden");
  formContainer.classList.remove("hidden");

  // Show/Hide Other Input
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

  // Initialize Bootstrap Modal
  let successModal;
  if (window.bootstrap) {
    successModal = new window.bootstrap.Modal(successModalEl);
  }

  // 6. Handle Form Submit
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = nicknameInput.value.trim();
    const email = emailInput.value.trim();
    const ageRange = ageRangeSelect.value;
    let identity = identitySelect.value;
    if (identity === "其他") {
      identity = identityOtherInput.value.trim();
    }

    const usages = [];
    const currentUsageCheckboxes = document.querySelectorAll(".usage-checkbox");
    currentUsageCheckboxes.forEach((cb) => {
      if (cb.checked) {
        if (cb.id === "usage-other-checkbox") {
          const otherVal = usageOtherInput.value.trim();
          if (otherVal) usages.push(otherVal);
        } else {
          usages.push(cb.value);
        }
      }
    });

    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (!nickname) {
      alert("請輸入暱稱");
      return;
    }

    // Disable button to prevent double submit
    submitBtn.disabled = true;
    submitBtn.innerText = "註冊中...";

    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          data: {
            nickname,
            email,
            ageRange,
            identity,
            usages,
          },
        }),
      });

      const data = await res.json();

      if (res.ok && data.success === true) {
        if (successModal) successModal.show();
      } else {
        alert(`註冊失敗：${data.message || "發生未知錯誤"}`);
        submitBtn.disabled = false;
        submitBtn.innerText = "註冊";
      }
    } catch (err) {
      console.error(err);
      alert("網路錯誤，請稍後再試。");
      submitBtn.disabled = false;
      submitBtn.innerText = "註冊";
    }
  });

  // 7. Handle Modal Close (Close LIFF)
  closeModalBtn.addEventListener("click", () => {
    closeLiff();
  });
})();
