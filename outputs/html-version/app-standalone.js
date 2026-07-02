(async () => {
  try {
    const scriptUrl = document.currentScript?.src || window.location.href;
    const appUrl = new URL("./app.mjs?v=20260630-sp-s-display-text", scriptUrl).href;
    await import(appUrl);
  } catch (error) {
    window.__lingzhuBootErrors = window.__lingzhuBootErrors || [];
    window.__lingzhuBootErrors.push(error?.message || String(error));
    throw error;
  }
})();
