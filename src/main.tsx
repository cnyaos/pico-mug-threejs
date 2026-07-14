import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Layers3, Pause, Play, Rotate3D, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";

function roundedRectPath(shape: THREE.Shape | THREE.Path, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
}

function seededNoise(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createGrayField(seed: number, base: number, amplitude: number, blur = false) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const random = seededNoise(seed);
  for (let y = 0; y < size; y += 1) {
    const broad = Math.sin(y * 0.019) * amplitude * 0.24;
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const meso = Math.sin(x * 0.071 + y * 0.043) * amplitude * 0.18;
      const micro = (random() - 0.5) * amplitude;
      const value = THREE.MathUtils.clamp(base + broad + meso + micro, 0, 255);
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  if (blur) { ctx.filter = "blur(0.55px)"; ctx.drawImage(canvas, 0, 0); ctx.filter = "none"; }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createRimTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#a88d6c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const random = seededNoise(7319);
  for (let i = 0; i < 3400; i += 1) {
    const light = random() > 0.58;
    ctx.fillStyle = light ? `rgba(225,205,170,${0.12 + random() * 0.34})` : `rgba(68,48,37,${0.1 + random() * 0.3})`;
    const radius = 0.35 + random() * 1.4;
    ctx.beginPath();
    ctx.arc(random() * canvas.width, random() * canvas.height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 1);
  return texture;
}

function createBrandingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#c9ced2";
  ctx.beginPath();
  ctx.moveTo(348, 116);
  ctx.quadraticCurveTo(306, 116, 306, 158);
  ctx.lineTo(306, 210);
  ctx.quadraticCurveTo(306, 270, 382, 282);
  ctx.quadraticCurveTo(458, 294, 512, 236);
  ctx.quadraticCurveTo(566, 294, 642, 282);
  ctx.quadraticCurveTo(718, 270, 718, 210);
  ctx.lineTo(718, 158);
  ctx.quadraticCurveTo(718, 116, 676, 116);
  ctx.closePath();
  ctx.fill();
  ctx.font = "600 46px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "1px";
  ctx.fillText("PICO Industry Design Studio", 512, 616);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createPicoMugModel() {
  const root = new THREE.Group();
  root.name = "body-root";
  const roughnessField = createGrayField(1817, 226, 24, true);
  const heightField = createGrayField(4021, 128, 34, true);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.88, roughnessMap: roughnessField, bumpMap: heightField, bumpScale: 0.012, metalness: 0 });
  const handleMaterial = bodyMaterial.clone();
  handleMaterial.roughness = 0.83;
  const darkClay = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.92, roughnessMap: roughnessField, bumpMap: heightField, bumpScale: 0.006, side: THREE.DoubleSide });
  const rimClay = new THREE.MeshStandardMaterial({ color: 0xffffff, map: createRimTexture(), roughness: 0.68, bumpMap: heightField, bumpScale: 0.008 });

  const outerProfile = [
    new THREE.Vector2(0, 0.08),
    new THREE.Vector2(1.42, 0.08),
    new THREE.Vector2(1.56, 0.12),
    new THREE.Vector2(1.64, 0.18),
    new THREE.Vector2(1.73, 0.42),
    new THREE.Vector2(1.78, 0.72),
    new THREE.Vector2(1.82, 2.1),
    new THREE.Vector2(1.86, 4.2),
    new THREE.Vector2(1.84, 4.28)
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(outerProfile, 128), bodyMaterial);
  body.name = "body-shell";
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const interiorProfile = [new THREE.Vector2(0, 0.445), new THREE.Vector2(1.55, 0.445), new THREE.Vector2(1.64, 0.56), new THREE.Vector2(1.68, 4.17)];
  const interior = new THREE.Mesh(new THREE.LatheGeometry(interiorProfile, 128), darkClay);
  interior.name = "inner-cavity";
  root.add(interior);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.065, 12, 128), rimClay);
  rim.name = "warm-rim-structural";
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.25;
  rim.castShadow = true;
  root.add(rim);

  const brandingGeometry = new THREE.CylinderGeometry(1.847, 1.847, 1.8, 48, 1, true, -0.5, 1.0);
  const brandingMaterial = new THREE.MeshBasicMaterial({ map: createBrandingTexture(), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const branding = new THREE.Mesh(brandingGeometry, brandingMaterial);
  branding.name = "front-branding";
  branding.position.y = 1.45;
  root.add(branding);

  const handleShape = new THREE.Shape();
  roundedRectPath(handleShape, 1.48, 1.08, 2.16, 2.3, 0.5);
  const handleHole = new THREE.Path();
  roundedRectPath(handleHole, 1.98, 1.52, 1.16, 1.42, 0.28);
  handleShape.holes.push(handleHole);
  const handleGeometry = new THREE.ExtrudeGeometry(handleShape, { depth: 0.52, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: 0.14, bevelThickness: 0.12, curveSegments: 32 });
  handleGeometry.translate(0, 0, -0.26);
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.name = "handle";
  handle.castShadow = true;
  handle.receiveShadow = true;
  root.add(handle);

  const handleUpper = new THREE.Object3D();
  handleUpper.name = "handle-upper";
  handleUpper.position.set(1.63, 3.05, 0);
  root.add(handleUpper);
  const handleLower = new THREE.Object3D();
  handleLower.name = "handle-lower";
  handleLower.position.set(1.63, 1.12, 0);
  root.add(handleLower);
  const gripCenter = new THREE.Object3D();
  gripCenter.name = "grip-center";
  gripCenter.position.set(2.55, 2.08, 0);
  root.add(gripCenter);

  root.userData.sculptRuntime = {
    nodes: { "body-root": root, handle, "inner-cavity": interior, "warm-rim": rim, "front-branding": branding },
    meshes: { body, interior, rim, handle, branding },
    sockets: { "handle-upper": handleUpper, "handle-lower": handleLower, "grip-center": gripCenter },
    colliders: { body: { type: "cylinder", radius: 1.86, height: 4.28 } },
    destructionGroups: {}
  };
  return root;
}

type SceneHandles = {
  setAutoRotate: (value: boolean) => void;
  setExploded: (value: boolean) => void;
  resetView: () => void;
  dispose: () => void;
};

function createScene(mount: HTMLDivElement): SceneHandles {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e5df);
  const mobileView = mount.clientWidth < 760;
  const initialCamera = mobileView ? new THREE.Vector3(5.5, 5.6, 15.5) : new THREE.Vector3(5.2, 5.5, 10.6);
  const initialTarget = mobileView ? new THREE.Vector3(0.9, 3.15, 0) : new THREE.Vector3(-0.15, 2.05, 0);
  const camera = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.copy(initialCamera);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.copy(initialTarget);
  controls.minDistance = 6.5;
  controls.maxDistance = mobileView ? 24 : 18;
  controls.maxPolarAngle = Math.PI * 0.58;
  controls.autoRotateSpeed = 0.72;

  const mug = createPicoMugModel();
  mug.rotation.y = -0.08;
  scene.add(mug);
  let triangleCount = 0;
  let mugDrawCalls = 0;
  mug.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    mugDrawCalls += 1;
    const geometry = object.geometry;
    triangleCount += geometry.index ? geometry.index.count / 3 : (geometry.getAttribute("position")?.count ?? 0) / 3;
  });
  (window as Window & { __PICO_MUG_STATS__?: Record<string, number> }).__PICO_MUG_STATS__ = {
    triangles: Math.round(triangleCount),
    mugDrawCalls,
    maxPixelRatio: 2
  };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 96), new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: 0.94 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const lightMode = new URLSearchParams(window.location.search).get("light") ?? "neutral";
  scene.add(new THREE.HemisphereLight(lightMode === "grazing" ? 0xc7d8e8 : 0xffffff, 0x6f665c, lightMode === "grazing" ? 1.15 : 1.9));
  const key = new THREE.DirectionalLight(lightMode === "reference" ? 0xfff3e5 : 0xffffff, lightMode === "grazing" ? 5.6 : 4.5);
  key.position.set(lightMode === "grazing" ? 8 : -5, lightMode === "grazing" ? 2.2 : 9, lightMode === "grazing" ? 1 : 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 7; key.shadow.camera.bottom = -2;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc7dbef, lightMode === "grazing" ? 0.7 : 1.15);
  fill.position.set(5, 4.5, 8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe0bd, 2.4);
  rim.position.set(6, 6, -5);
  scene.add(rim);

  let frame = 0;
  const render = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
  render();
  const onResize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
  window.addEventListener("resize", onResize);
  const runtime = mug.userData.sculptRuntime as { nodes: Record<string, THREE.Object3D> };
  const handle = runtime.nodes.handle;
  const rimNode = runtime.nodes["warm-rim"];
  const innerNode = runtime.nodes["inner-cavity"];
  const brandingNode = runtime.nodes["front-branding"];

  return {
    setAutoRotate: (value) => { controls.autoRotate = value; },
    setExploded: (value) => {
      handle.position.x = value ? 0.64 : 0;
      rimNode.position.y = value ? 4.58 : 4.25;
      innerNode.position.y = value ? 0.16 : 0;
      brandingNode.position.z = value ? 0.22 : 0;
    },
    resetView: () => {
      camera.position.copy(initialCamera);
      controls.target.copy(initialTarget);
      mug.rotation.set(0, -0.08, 0);
      controls.update();
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const textured = material as THREE.Material & { map?: THREE.Texture | null; roughnessMap?: THREE.Texture | null; bumpMap?: THREE.Texture | null };
          textured.map?.dispose();
          textured.roughnessMap?.dispose();
          textured.bumpMap?.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
      delete (window as Window & { __PICO_MUG_STATS__?: Record<string, number> }).__PICO_MUG_STATS__;
    }
  };
}

function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [exploded, setExploded] = useState(false);
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = createScene(mountRef.current);
    sceneRef.current = scene;
    return () => scene.dispose();
  }, []);

  const toggleRotation = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    sceneRef.current?.setAutoRotate(next);
  };
  const toggleExploded = () => {
    const next = !exploded;
    setExploded(next);
    sceneRef.current?.setExploded(next);
  };
  const resetView = () => {
    setAutoRotate(false);
    setExploded(false);
    sceneRef.current?.setAutoRotate(false);
    sceneRef.current?.setExploded(false);
    sceneRef.current?.resetView();
  };

  return (
    <main className="viewer-shell">
      <div className="scene" ref={mountRef} />
      <header className="topbar"><div className="brand-mark" aria-hidden="true"><span /><span /></div><div><p>PICO · OBJECT STUDY 001</p><strong>Industry Design Studio</strong></div></header>
      <section className="copy-panel"><span className="eyebrow">PICO / INDUSTRIAL OBJECT 001</span><h1>Quiet form.<br />Clear intent.</h1><p>一只为日常工作台设计的黑色陶瓷杯。程序化 Three.js 几何，暖色裸陶杯沿，完整保留 PICO Industry Design Studio 标识。</p><div className="material-list"><span>MATTE CERAMIC</span><span>CODE SCULPTED</span><span>REAL-TIME</span></div></section>
      <aside className="object-meta"><span>92 × 106 mm</span><span>4 PROCEDURAL MATERIALS</span><span>60 FPS TARGET</span></aside>
      <nav className="control-dock" aria-label="3D 模型控制">
        <button type="button" className={autoRotate ? "active" : ""} onClick={toggleRotation}>{autoRotate ? <Pause size={16} /> : <Play size={16} />}<span>{autoRotate ? "暂停" : "自动旋转"}</span></button>
        <button type="button" onClick={resetView}><RotateCcw size={16} /><span>复位视角</span></button>
        <button type="button" className={exploded ? "active" : ""} onClick={toggleExploded}><Layers3 size={16} /><span>{exploded ? "合并结构" : "结构分解"}</span></button>
      </nav>
      <div className="stage-chip"><Rotate3D size={15} /> DRAG TO ORBIT</div>
      <div className="measure measure-height"><span>≈ 106 mm</span></div><div className="measure measure-width"><span>≈ 92 mm</span></div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
