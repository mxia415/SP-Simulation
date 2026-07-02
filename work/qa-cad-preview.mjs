import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto("http://localhost:8766/cad-preview/", { waitUntil: "networkidle" });
await page.waitForSelector(".dim-button");
await page.waitForTimeout(500);

const initial = await page.evaluate(() => {
  const canvas = document.querySelector("#cadCanvas");
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlack = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 8 || pixels[i + 1] > 8 || pixels[i + 2] > 8) nonBlack += 1;
  }
  return {
    curveCount: document.querySelector("#curveCount").textContent,
    dimensionCount: document.querySelector("#dimensionCount").textContent,
    buttons: document.querySelectorAll(".dim-button").length,
    nonBlack,
  };
});

await page.locator(".dim-button").first().click();
const selected = await page.locator("#selectedReadout").textContent();
await page.screenshot({
  path: "/Users/ming/Documents/Codex/2026-06-24/s/outputs/cad-preview-desktop.png",
  fullPage: true,
});

assert.equal(errors.length, 0, errors.join("\n"));
assert.equal(initial.curveCount, "5,947");
assert.equal(initial.dimensionCount, "28");
assert.equal(initial.buttons, 35);
assert.ok(initial.nonBlack > 5000, "canvas should contain CAD drawing pixels");
assert.equal(selected, "5025.92 mm");

await browser.close();
console.log(JSON.stringify({ initial, selected, errors }, null, 2));
