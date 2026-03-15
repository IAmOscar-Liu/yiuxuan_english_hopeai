async function fetchLiffId() {
  return await fetch("/api/liff/credential", { method: "POST" })
    .then((res) => res.json())
    .then((data) => ({ LIFF_ID: data.LIFF_ID, OA_ID: data.OA_ID }));
}

function init() {
  // Example using window.location.replace()
  return fetchLiffId()
    .then((data) =>
      liff.init({
        liffId: data.LIFF_ID, // local
        withLoginOnExternalBrowser: false, // Disable automatic login process
      }),
    )
    .then(() => null)
    .catch((e) => e.message);

  // return liff
  //   .init({
  //     liffId: LIFF_ID, // local
  //     withLoginOnExternalBrowser: false, // Disable automatic login process
  //   })
  //   .then(() => null)
  //   .catch((e) => e.message);
}

function initWithSearchParams(cb) {
  // Example using window.location.replace()
  return fetchLiffId()
    .then((data) =>
      liff.init({
        liffId: data.LIFF_ID, // local
        withLoginOnExternalBrowser: false, // Disable automatic login process
      }),
    )
    .then(() => {
      // Get the URL query string
      const queryString = window.location.search;

      // Create a URLSearchParams object
      const urlParams = new URLSearchParams(queryString);

      cb(urlParams);
    })
    .catch((e) => e.message);

  // return liff
  //   .init({
  //     liffId: LIFF_ID, // local
  //     withLoginOnExternalBrowser: false, // Disable automatic login process
  //   })
  //   .then(() => {
  //     // Get the URL query string
  //     const queryString = window.location.search;

  //     // Create a URLSearchParams object
  //     const urlParams = new URLSearchParams(queryString);

  //     cb(urlParams);
  //   })
  //   .catch((e) => e.message);
}

function isLoggedIn(options) {
  return liff.isLoggedIn(options);
}

function login(options) {
  liff.login(options);
}

async function getProfile() {
  return await liff.getProfile();
}

async function getDecodedIDToken() {
  return await liff.getDecodedIDToken();
}

async function closeLiff() {
  if (liff.isInClient()) {
    setTimeout(() => liff.closeWindow(), 100);
  } else {
    setTimeout(() => window.close(), 100);
  }
}

export {
  init,
  initWithSearchParams,
  isLoggedIn,
  login,
  getProfile,
  getDecodedIDToken,
  closeLiff,
};
