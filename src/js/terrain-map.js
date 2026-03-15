// 3D Terrain Map — converts click density into an interactive 3D landscape
import { invoke, getTimeRange, showToast, currentTimeRange } from './utils.js';

let scene, camera, renderer, controls, terrainMesh;
let animationId = null;

export async function loadTerrain() {
  const container = document.getElementById('terrain-container');
  if (!container || container.offsetHeight === 0) return;

  if (!renderer) {
    initThree(container);
  } else {
    // Resize on re-open
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  await fetchAndBuild();
  startAnimation();
}

function initThree(container) {
  const rect = container.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.003);

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
  camera.position.set(0, 120, 200);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 50;
  controls.maxDistance = 500;

  // Ambient light
  scene.add(new THREE.AmbientLight(0x404060, 0.6));

  // Directional light
  const dirLight = new THREE.DirectionalLight(0xF7B801, 0.8);
  dirLight.position.set(100, 200, 100);
  scene.add(dirLight);

  // Hemisphere
  scene.add(new THREE.HemisphereLight(0x5B8CFF, 0x1a1a4e, 0.4));
}

async function fetchAndBuild() {
  const { start, end } = getTimeRange(currentTimeRange);
  try {
    const data = await invoke('get_terrain_data', { startMs: start, endMs: end });
    buildTerrain(data);
  } catch (e) {
    console.error('Failed to load terrain data:', e);
  }
}

function buildTerrain(data) {
  // Remove old terrain
  if (terrainMesh) {
    scene.remove(terrainMesh);
    terrainMesh.geometry.dispose();
    terrainMesh.material.dispose();
  }

  if (data.length === 0) return;

  // Build a heightfield grid from the data
  // Map screen coords (0-1920, 0-1080) to grid (0-96, 0-54)
  const gridW = 96;
  const gridH = 54;
  const heights = new Float32Array(gridW * gridH);
  const moveDensity = new Float32Array(gridW * gridH);
  let maxHeight = 0;

  for (const p of data) {
    const gx = Math.min(gridW - 1, Math.max(0, Math.floor(p.x / 20)));
    const gy = Math.min(gridH - 1, Math.max(0, Math.floor(p.y / 20)));
    const idx = gy * gridW + gx;
    heights[idx] += p.clicks;
    moveDensity[idx] += p.moves;
    if (heights[idx] > maxHeight) maxHeight = heights[idx];
  }

  // Smooth the heightmap with a simple box blur
  const smoothed = new Float32Array(gridW * gridH);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      let sum = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
            sum += heights[ny * gridW + nx];
            count++;
          }
        }
      }
      smoothed[y * gridW + x] = sum / count;
    }
  }

  // Create PlaneGeometry
  const geometry = new THREE.PlaneGeometry(300, 170, gridW - 1, gridH - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const heightScale = maxHeight > 0 ? 60 / maxHeight : 1;

  for (let i = 0; i < positions.count; i++) {
    const gx = i % gridW;
    const gy = Math.floor(i / gridW);
    const idx = gy * gridW + gx;

    const h = smoothed[idx] * heightScale;
    positions.setY(i, h);

    // Color by height — gradient similar to heatmap
    const t = maxHeight > 0 ? smoothed[idx] / maxHeight : 0;
    const moveT = moveDensity[idx] / (Math.max(...moveDensity) || 1);
    const color = heightColor(t, moveT);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  terrainMesh = new THREE.Mesh(geometry, material);
  scene.add(terrainMesh);

  // Add wireframe for "rivers" (high mouse movement areas)
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x5B8CFF,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
  });
  const wireMesh = new THREE.Mesh(geometry.clone(), wireMat);
  terrainMesh.add(wireMesh);

  // Reset camera target
  controls.target.set(0, 10, 0);
  controls.update();
}

function heightColor(t, moveT) {
  // Blend between click mountains and mouse trail "rivers"
  // Low click = dark blue/purple, high click = gold/red
  // High movement = blue tint (rivers)
  const r = lerp(0.10, 1.0, Math.pow(t, 0.7));
  const g = lerp(0.10, lerp(0.73, 0.20, t), t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2);
  const b = lerp(0.30, 0.05, t);

  // Blue river overlay
  const riverR = r * (1 - moveT * 0.3);
  const riverG = g * (1 - moveT * 0.1);
  const riverB = Math.min(1, b + moveT * 0.4);

  return { r: riverR, g: riverG, b: riverB };
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function startAnimation() {
  if (animationId) cancelAnimationFrame(animationId);
  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

export function stopTerrainAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Reset camera
document.getElementById('terrainResetBtn')?.addEventListener('click', () => {
  if (!camera || !controls) return;
  camera.position.set(0, 120, 200);
  controls.target.set(0, 10, 0);
  controls.update();
});

// Export
document.getElementById('exportTerrainBtn')?.addEventListener('click', async () => {
  if (!renderer) return;
  try {
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const ts = new Date().toISOString().slice(0, 10);
    const path = await invoke('save_png_base64', {
      base64Data: base64,
      filename: `clickglow-terrain-${ts}.png`,
    });
    showToast('Saved to ' + path);
  } catch (e) {
    console.error('Export failed:', e);
    showToast('Export failed: ' + e, true);
  }
});
