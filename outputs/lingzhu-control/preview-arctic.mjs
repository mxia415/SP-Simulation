import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";

const SSAO_PASS_ENABLED = true;
const RENDER_SCALE = 1 / 1000;
const DEVICE_AXIS_X = new THREE.Vector3(1, 0, 0);
const DEVICE_AXIS_Y = new THREE.Vector3(0, 0, 1);
const DEVICE_AXIS_Z = new THREE.Vector3(0, 1, 0);
const MODEL_REFERENCE_STATE = { x: -3050, y: -135, z: -1590, rx: 0, ry: 0, rz: -90, scale: 1, unitScale: 1 };
const MODEL_ASSETS = [
  "assets/base.glb.gz",
  "assets/base_link.glb.gz",
  "assets/arm1.glb.gz",
  "assets/arm2.glb.gz",
  "assets/arm3.glb.gz",
  "assets/tool.glb.gz",
  "assets/cyl1_xn_base.glb.gz",
  "assets/cyl1_xn_end.glb.gz",
  "assets/cyl1_xp_base.glb.gz",
  "assets/cyl1_xp_end.glb.gz",
  "assets/cyl2_xn_base.glb.gz",
  "assets/cyl2_xn_end.glb.gz",
  "assets/cyl2_xp_base.glb.gz",
  "assets/cyl2_xp_end.glb.gz",
  "assets/cyl3_mid_base.glb.gz",
  "assets/cyl3_mid_end.glb.gz",
  "assets/link_a1_xn.glb.gz",
  "assets/link_a1_xp.glb.gz",
  "assets/link_a2_mid.glb.gz",
  "assets/link_b1_xn.glb.gz",
  "assets/link_b1_xp.glb.gz",
];

const ARCTIC_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xf7f8f9,
  roughness: 0.94,
  metalness: 0.01,
  envMapIntensity: 0.08,
});

const canvas = document.querySelector("#viewport");
const status = document.querySelector("#status");
const aoInput = document.querySelector("#aoStrength");
const shadowInput = document.querySelector("#shadowStrength");
const aoValue = document.querySelector("#aoValue");
const shadowValue = document.querySelector("#shadowValue");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xeef1f4, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef1f4);
scene.fog = new THREE.Fog(0xeef1f4, 13, 30);

const camera = new THREE.PerspectiveCamera(38, 1, 0.08, 90);
camera.position.set(5.7, 3.95, 6.8);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0.35, 0.72, 0.1);
orbit.minDistance = 2.8;
orbit.maxDistance = 18;

const modelRoot = new THREE.Group();
scene.add(modelRoot);

const groundShadowMaterial = new THREE.ShadowMaterial({ color: 0x87909a, opacity: Number(shadowInput.value) });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), groundShadowMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.015;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(12, 12, 0xc2c8ce, 0xd9dde1);
grid.position.y = -0.012;
scene.add(grid);

const hemi = new THREE.HemisphereLight(0xffffff, 0xd1d6dc, 0.92);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4.8, 7.2, 5.4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 22;
keyLight.shadow.camera.left = -7;
keyLight.shadow.camera.right = 7;
keyLight.shadow.camera.top = 7;
keyLight.shadow.camera.bottom = -7;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
rimLight.position.set(-4, 3.8, -5);
scene.add(rimLight);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ssaoPass = new SSAOPass(scene, camera, 1, 1);
ssaoPass.enabled = SSAO_PASS_ENABLED;
ssaoPass.kernelRadius = Number(aoInput.value) * 11;
ssaoPass.minDistance = 0.003;
ssaoPass.maxDistance = 0.17;
composer.addPass(ssaoPass);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function deviceRotationQuaternion(rx, ry, rz) {
  const qx = new THREE.Quaternion().setFromAxisAngle(DEVICE_AXIS_X, degToRad(rx));
  const qy = new THREE.Quaternion().setFromAxisAngle(DEVICE_AXIS_Y, degToRad(ry));
  const qz = new THREE.Quaternion().setFromAxisAngle(DEVICE_AXIS_Z, degToRad(rz));
  return new THREE.Quaternion().multiply(qz).multiply(qy).multiply(qx);
}

function applyReferenceTransform(object) {
  object.position.set(
    MODEL_REFERENCE_STATE.x * RENDER_SCALE,
    MODEL_REFERENCE_STATE.z * RENDER_SCALE,
    MODEL_REFERENCE_STATE.y * RENDER_SCALE,
  );
  object.quaternion.copy(
    deviceRotationQuaternion(MODEL_REFERENCE_STATE.rx, MODEL_REFERENCE_STATE.ry, MODEL_REFERENCE_STATE.rz),
  );
  object.scale.setScalar(MODEL_REFERENCE_STATE.scale * MODEL_REFERENCE_STATE.unitScale);
}

async function gzipBase64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

async function gzipResponseToArrayBuffer(response) {
  const blob = await response.blob();
  return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

async function loadModel(path) {
  const response = await fetch(`${path}?v=20260701-arctic-preview`);
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  const buffer = await gzipResponseToArrayBuffer(response);
  const gltf = await new Promise((resolve, reject) => loader.parse(buffer, "", resolve, reject));
  const wrapper = new THREE.Group();
  wrapper.name = path;
  wrapper.add(gltf.scene);
  applyReferenceTransform(wrapper);
  wrapper.traverse((child) => {
    if (!child.isMesh) return;
    child.material = ARCTIC_MATERIAL.clone();
    child.castShadow = true;
    child.receiveShadow = true;
  });
  modelRoot.add(wrapper);
  return wrapper;
}

function frameLoadedModels() {
  const box = new THREE.Box3().setFromObject(modelRoot);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z);
  orbit.target.copy(center);
  camera.position.copy(center.clone().add(new THREE.Vector3(radius * 1.05, radius * 0.72, radius * 1.18)));
  camera.near = Math.max(0.02, radius / 180);
  camera.far = Math.max(80, radius * 7);
  camera.updateProjectionMatrix();
  orbit.update();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function render() {
  orbit.update();
  composer.render();
  requestAnimationFrame(render);
}

function updateControls() {
  const ao = Number(aoInput.value);
  const shadow = Number(shadowInput.value);
  ssaoPass.kernelRadius = ao * 11;
  groundShadowMaterial.opacity = shadow;
  aoValue.textContent = ao.toFixed(1);
  shadowValue.textContent = shadow.toFixed(2);
}

async function init() {
  resize();
  window.addEventListener("resize", resize);
  aoInput.addEventListener("input", updateControls);
  shadowInput.addEventListener("input", updateControls);
  updateControls();
  const results = await Promise.allSettled(MODEL_ASSETS.map(loadModel));
  const loaded = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - loaded;
  status.textContent = failed
    ? `已加载 ${loaded} 个模型，${failed} 个失败。可继续查看 Arctic 材质效果。`
    : `已加载 ${loaded} 个模型。拖拽旋转，滚轮缩放。`;
  frameLoadedModels();
  render();
}

init().catch((error) => {
  status.textContent = `预览加载失败：${error.message || error}`;
});
