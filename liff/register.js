import { init, getProfile, closeLiff } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const formContainer = document.getElementById("register-form-container");
const registerForm = document.getElementById("registerForm");
const nicknameInput = document.getElementById("nickname");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
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

  // 3. Populate Form
  if (profile?.displayName) {
    nicknameInput.value = profile.displayName;
  }

  // 4. Show Form
  loadingDiv.classList.add("hidden");
  formContainer.classList.remove("hidden");

  // Initialize Bootstrap Modal
  let successModal;
  if (window.bootstrap) {
    successModal = new window.bootstrap.Modal(successModalEl);
  }

  // 5. Handle Form Submit
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = nicknameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
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
            phone,
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

  // 6. Handle Modal Close (Close LIFF)
  closeModalBtn.addEventListener("click", () => {
    closeLiff();
  });
})();
