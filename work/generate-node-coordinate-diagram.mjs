import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { DEFAULT_STATE, computePose } from "../outputs/html-version/model.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("./node_modules/playwright");

const pose = computePose(DEFAULT_STATE);
const baseRotationRadians = (pose.baseAngle * Math.PI) / 180;
const width = 7600;
const height = 3600;
const diagramLeft = 2150;
const diagramRight = 5450;
const diagramTop = 420;
const diagramBottom = 3300;
const yVisualFactor = 0.42;
const labelWidth = 1650;
const labelHeight = 150;
const leftLabelX = 70;
const rightLabelX = 5880;
const labelTop = 360;
const labelGap = 18;
const outputPath = "/Users/ming/Documents/Codex/2026-06-26/SP-S/outputs/SP-S-node-coordinate-diagram.png";
const htmlPath = "/private/tmp/sp-s-node-coordinate-diagram.html";

function clonePoint(point) {
  return { x: point.x, y: point.y || 0, z: point.z };
}

function applyBaseRotation(point) {
  const x = point.x * Math.cos(baseRotationRadians) + (point.y || 0) * Math.sin(baseRotationRadians);
  const y = -point.x * Math.sin(baseRotationRadians) + (point.y || 0) * Math.cos(baseRotationRadians);
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: point.z,
  };
}

function worldPoint(point) {
  return applyBaseRotation(clonePoint(point));
}

function formatPoint(point) {
  return `(${point.x.toFixed(1)}, ${(point.y || 0).toFixed(1)}, ${point.z.toFixed(1)})`;
}

function collectNodes() {
  const nodes = pose.joints.map((joint, index) => ({
    id: `J${index + 1}`,
    label: joint.name,
    point: worldPoint(joint),
    kind: "axis",
  }));

  nodes.push({ id: "T", label: "打印头末端", point: worldPoint(pose.toolCenter), kind: "tool" });

  Object.entries(pose.actuators).forEach(([, actuator]) => {
    actuator.instances.forEach((instance, index) => {
      const sideLabel = actuator.instances.length > 1 ? `-${index + 1}` : "";
      nodes.push({ label: `${actuator.label}${sideLabel} 末端`, point: worldPoint(instance.tail), kind: "actuator" });
      nodes.push({ label: `${actuator.label}${sideLabel} 前端`, point: worldPoint(instance.front), kind: "actuator" });
    });
  });

  Object.entries(pose.linkages).forEach(([key, linkage]) => {
    linkage.instances.forEach((instance, index) => {
      const sideLabel = linkage.instances.length > 1 ? `-${index + 1}` : "";
      nodes.push({ label: `连接杆${key}${sideLabel} 公共点`, point: worldPoint(instance.common), kind: "linkage" });
      nodes.push({ label: `连接杆${key}${sideLabel} ${linkage.link1.label} 锚点`, point: worldPoint(instance.link1Anchor), kind: "linkage" });
      nodes.push({ label: `连接杆${key}${sideLabel} ${linkage.link2.label} 锚点`, point: worldPoint(instance.link2Anchor), kind: "linkage" });
    });
  });

  return nodes;
}

function collectLines() {
  const lines = [];
  pose.segments.forEach((segment) => {
    lines.push({ a: worldPoint(segment.start), b: worldPoint(segment.end), kind: segment.key === "tool" ? "tool" : "arm" });
  });
  Object.values(pose.actuators).forEach((actuator) => {
    actuator.instances.forEach((instance) => lines.push({ a: worldPoint(instance.tail), b: worldPoint(instance.front), kind: "actuator" }));
  });
  Object.values(pose.linkages).forEach((linkage) => {
    linkage.instances.forEach((instance) => {
      lines.push({ a: worldPoint(instance.common), b: worldPoint(instance.link1Anchor), kind: "linkage" });
      lines.push({ a: worldPoint(instance.common), b: worldPoint(instance.link2Anchor), kind: "linkage" });
    });
  });
  return lines;
}

const nodes = collectNodes();
const lines = collectLines();
const allPoints = [...nodes.map((node) => node.point), ...lines.flatMap((line) => [line.a, line.b])];
const projected = allPoints.map((point) => ({ x: point.x + (point.y || 0) * yVisualFactor, z: point.z }));
const minX = Math.min(...projected.map((point) => point.x));
const maxX = Math.max(...projected.map((point) => point.x));
const minZ = Math.min(...projected.map((point) => point.z));
const maxZ = Math.max(...projected.map((point) => point.z));
const scale = Math.min((diagramRight - diagramLeft) / (maxX - minX), (diagramBottom - diagramTop) / (maxZ - minZ));

function project(point) {
  const displayX = point.x + (point.y || 0) * yVisualFactor;
  return {
    x: diagramLeft + (displayX - minX) * scale,
    y: diagramBottom - (point.z - minZ) * scale,
  };
}

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function lineColor(kind) {
  return { arm: "#f3b34c", tool: "#ff5d5d", actuator: "#9aa7b8", linkage: "#c77dff" }[kind] || "#ffffff";
}

function nodeColor(kind) {
  return { axis: "#ffffff", tool: "#ff5d5d", actuator: "#9aa7b8", linkage: "#c77dff" }[kind] || "#ffffff";
}

function labelLayout() {
  const left = [];
  const right = [];
  nodes.forEach((node) => {
    const target = project(node.point);
    const side = target.x < (diagramLeft + diagramRight) / 2 ? left : right;
    side.push({ node, target });
  });
  left.sort((a, b) => a.target.y - b.target.y);
  right.sort((a, b) => a.target.y - b.target.y);

  return [
    ...left.map((item, index) => ({ ...item, side: "left", box: { x: leftLabelX, y: labelTop + index * (labelHeight + labelGap) } })),
    ...right.map((item, index) => ({ ...item, side: "right", box: { x: rightLabelX, y: labelTop + index * (labelHeight + labelGap) } })),
  ];
}

const placedLabels = labelLayout();

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
svg += `<rect width="100%" height="100%" fill="#050505"/>`;
svg += `<style>
  .title{font:800 66px Arial,"PingFang SC","Hiragino Sans GB",sans-serif;fill:#fff}
  .sub{font:600 32px Arial,"PingFang SC","Hiragino Sans GB",sans-serif;fill:#b8bcc8}
  .label{font:800 42px Arial,"PingFang SC","Hiragino Sans GB",sans-serif;fill:#fff}
  .coord{font:800 48px Arial,"PingFang SC","Hiragino Sans GB",sans-serif;fill:#fff}
  .legend{font:800 28px Arial,"PingFang SC","Hiragino Sans GB",sans-serif;fill:#d6dae3}
</style>`;
svg += `<text x="120" y="95" class="title">GL-3DPRT-SP-S 节点坐标示意</text>`;
svg += `<text x="120" y="153" class="sub">默认姿态 90 / 90 / 90 / 0 / 180，单位 mm；坐标已应用整体旋转 180°，主图为 X-Z 投影，标签位于左右固定栏以避免重叠。</text>`;

[
  ["臂/打印头", "#f3b34c"],
  ["电缸", "#9aa7b8"],
  ["连接杆", "#c77dff"],
  ["轴心/末端", "#ffffff"],
].forEach(([name, color], index) => {
  const x = 120 + index * 380;
  svg += `<line x1="${x}" y1="226" x2="${x + 90}" y2="226" stroke="${color}" stroke-width="14" stroke-linecap="round"/>`;
  svg += `<text x="${x + 112}" y="236" class="legend">${escapeXml(name)}</text>`;
});

for (let gx = Math.ceil(minX / 500) * 500; gx <= maxX; gx += 500) {
  const a = project({ x: gx, y: 0, z: minZ });
  const b = project({ x: gx, y: 0, z: maxZ });
  svg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#202020" stroke-width="1"/>`;
}
for (let gz = Math.ceil(minZ / 500) * 500; gz <= maxZ; gz += 500) {
  const a = project({ x: minX, y: 0, z: gz });
  const b = project({ x: maxX, y: 0, z: gz });
  svg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#202020" stroke-width="1"/>`;
}

lines.forEach((line) => {
  const a = project(line.a);
  const b = project(line.b);
  svg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${lineColor(line.kind)}" stroke-width="${line.kind === "arm" ? 16 : 8}" stroke-linecap="round" opacity="0.92"/>`;
});

placedLabels.forEach(({ node, target, box, side }) => {
  const color = nodeColor(node.kind);
  const anchorX = side === "left" ? box.x + labelWidth : box.x;
  const anchorY = box.y + labelHeight / 2;
  svg += `<path d="M ${target.x.toFixed(1)} ${target.y.toFixed(1)} C ${((target.x + anchorX) / 2).toFixed(1)} ${target.y.toFixed(1)}, ${((target.x + anchorX) / 2).toFixed(1)} ${anchorY.toFixed(1)}, ${anchorX.toFixed(1)} ${anchorY.toFixed(1)}" fill="none" stroke="#6d717c" stroke-width="2.2" opacity="0.66"/>`;
  svg += `<circle cx="${target.x.toFixed(1)}" cy="${target.y.toFixed(1)}" r="16" fill="${color}" stroke="#050505" stroke-width="5"/>`;
  svg += `<rect x="${box.x}" y="${box.y}" width="${labelWidth}" height="${labelHeight}" rx="12" fill="rgba(0,0,0,0.86)" stroke="${color}" stroke-width="2.5"/>`;
  svg += `<text x="${box.x + 28}" y="${box.y + 50}" class="label">${escapeXml(node.label)}</text>`;
  svg += `<text x="${box.x + 28}" y="${box.y + 120}" class="coord">${escapeXml(formatPoint(node.point))}</text>`;
});

svg += `</svg>`;

const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#050505;}svg{display:block;}</style>${svg}`;
writeFileSync(htmlPath, html);

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 15000 });
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({ outputPath, nodeCount: nodes.length, width, height }, null, 2));
