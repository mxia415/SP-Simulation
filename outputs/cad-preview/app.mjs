const canvas = document.querySelector("#cadCanvas");
const ctx = canvas.getContext("2d");
const majorList = document.querySelector("#majorList");
const dimensionList = document.querySelector("#dimensionList");
const selectedReadout = document.querySelector("#selectedReadout");
const labelToggle = document.querySelector("#labelToggle");

let data;
let transform = { scale: 1, x: 0, y: 0 };
let selectedIndex = -1;
let dragStart = null;

const majorThreshold = 900;

function modelToScreen(point) {
  return {
    x: point[0] * transform.scale + transform.x,
    y: -point[1] * transform.scale + transform.y,
  };
}

function centerOfBox(box) {
  return [
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
  ];
}

function fitView() {
  const rect = canvas.getBoundingClientRect();
  const min = data.bbox.min;
  const max = data.bbox.max;
  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const scale = Math.min((rect.width - 80) / width, (rect.height - 80) / height);
  transform.scale = scale;
  transform.x = rect.width / 2 - ((min[0] + max[0]) / 2) * scale;
  transform.y = rect.height / 2 + ((min[1] + max[1]) / 2) * scale;
  draw();
}

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function drawCurve(curve) {
  if (curve.points.length < 2) return;
  ctx.beginPath();
  curve.points.forEach((point, index) => {
    const p = modelToScreen(point);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function drawDimension(dim, index) {
  const center = modelToScreen(centerOfBox(dim.bbox));
  const isMajor = dim.value >= majorThreshold;
  const isSelected = index === selectedIndex;
  const label = dim.text;
  const width = Math.max(44, label.length * 8 + 18);
  const height = 24;

  ctx.fillStyle = isSelected ? "rgba(247, 183, 49, 0.95)" : isMajor ? "rgba(72, 198, 217, 0.92)" : "rgba(20, 24, 28, 0.86)";
  ctx.strokeStyle = isSelected ? "#ffffff" : isMajor ? "#48c6d9" : "#4a555f";
  ctx.lineWidth = isSelected ? 2 : 1;
  roundRect(center.x - width / 2, center.y - height / 2, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSelected ? "#11161a" : "#eef3f5";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, center.x, center.y + 0.5);
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function draw() {
  if (!data) return;
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(183, 192, 200, 0.38)";
  ctx.lineWidth = 1;
  data.curves.forEach(drawCurve);

  if (selectedIndex >= 0) {
    const dim = data.dimensions[selectedIndex];
    const boxMin = modelToScreen(dim.bbox.min);
    const boxMax = modelToScreen(dim.bbox.max);
    ctx.strokeStyle = "#f7b731";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(
      Math.min(boxMin.x, boxMax.x),
      Math.min(boxMin.y, boxMax.y),
      Math.abs(boxMax.x - boxMin.x),
      Math.abs(boxMax.y - boxMin.y)
    );
    ctx.setLineDash([]);
  }

  if (labelToggle.checked) {
    data.dimensions.forEach(drawDimension);
  }
}

function selectDimension(index) {
  selectedIndex = index;
  const dim = data.dimensions[index];
  selectedReadout.textContent = `${dim.text} mm`;
  document.querySelectorAll(".dim-button").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.index) === index);
  });
  draw();
}

function makeButton(dim, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dim-button";
  button.dataset.index = index;
  const c = centerOfBox(dim.bbox);
  button.innerHTML = `<strong>${dim.text}</strong><span>X ${c[0].toFixed(0)} · Y ${c[1].toFixed(0)}</span>`;
  button.addEventListener("click", () => selectDimension(index));
  return button;
}

function populateLists() {
  const sorted = data.dimensions
    .map((dim, index) => ({ dim, index }))
    .sort((a, b) => b.dim.value - a.dim.value);

  sorted.filter(({ dim }) => dim.value >= majorThreshold).forEach(({ dim, index }) => {
    majorList.appendChild(makeButton(dim, index));
  });

  sorted.forEach(({ dim, index }) => {
    dimensionList.appendChild(makeButton(dim, index));
  });
}

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const before = {
    x: (event.clientX - rect.left - transform.x) / transform.scale,
    y: -((event.clientY - rect.top - transform.y) / transform.scale),
  };
  const factor = event.deltaY < 0 ? 1.12 : 0.88;
  transform.scale *= factor;
  transform.x = event.clientX - rect.left - before.x * transform.scale;
  transform.y = event.clientY - rect.top + before.y * transform.scale;
  draw();
}, { passive: false });

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  dragStart = { x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y };
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragStart) return;
  transform.x = dragStart.tx + event.clientX - dragStart.x;
  transform.y = dragStart.ty + event.clientY - dragStart.y;
  draw();
});

canvas.addEventListener("pointerup", () => {
  dragStart = null;
});

document.querySelector("#fitButton").addEventListener("click", fitView);
labelToggle.addEventListener("change", draw);
window.addEventListener("resize", () => {
  resize();
  fitView();
});

data = await fetch("../wq3d_db001_preview_geometry.json").then((response) => response.json());
document.querySelector("#curveCount").textContent = data.curve_count.toLocaleString();
document.querySelector("#dimensionCount").textContent = data.dimension_count.toString();
populateLists();
resize();
fitView();
