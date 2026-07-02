import { chromium } from "./node_modules/playwright/index.mjs";

const url = process.argv[2] || "http://127.0.0.1:8876/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-gl=swiftshader"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const consoleErrors = [];
  const failedRequests = [];
  const responses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on("response", (response) => {
    if (response.url().includes("base") || response.url().endsWith(".mjs")) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);
  const stats = await page.evaluate(() => ({
    status: document.querySelector("#baseModelStatus")?.textContent,
    hasDebug: Boolean(window.__lingzhuDebug),
    model: window.__lingzhuDebug?.baseModel,
    consoleErrors: window.__lingzhuDebug?.baseModel?.error ? [window.__lingzhuDebug.baseModel.error] : [],
  }));
  stats.consoleErrors.push(...consoleErrors);
  stats.failedRequests = failedRequests;
  stats.responses = responses;
  if (!stats.model?.loaded) process.exitCode = 1;
  console.log(JSON.stringify(stats, null, 2));
} finally {
  await browser.close();
}
