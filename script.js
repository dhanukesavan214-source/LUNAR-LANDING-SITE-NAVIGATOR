/* =========================
   LUNAR SITE DATA
========================= */
const lunarSites = {
  "Mare Tranquillitatis": {
    lat: 8.5, lon: 31.4,
    coordinates: "8.5° N, 31.4° E",
    terrain: "Relatively flat basaltic plain",
    temperature: "Approx. -170°C to +120°C",
    suitability: "High",
    science: "Apollo 11 landing region; important lunar geology"
  },
  "Shackleton Crater": {
    lat: -89.9, lon: 0,
    coordinates: "89.9° S, 0.0° E",
    terrain: "Polar crater with permanently shadowed areas",
    temperature: "Extremely cold in shadowed regions",
    suitability: "High",
    science: "Important target for studying lunar polar resources"
  },
  "Tycho Crater": {
    lat: -43.3, lon: -11.2,
    coordinates: "43.3° S, 11.2° W",
    terrain: "Large impact crater with rugged surroundings",
    temperature: "Large temperature variation",
    suitability: "Medium",
    science: "Young impact crater with extensive ray system"
  },
  "Aristarchus Plateau": {
    lat: 23.7, lon: -47.4,
    coordinates: "23.7° N, 47.4° W",
    terrain: "Volcanic plateau with varied terrain",
    temperature: "Large temperature variation",
    suitability: "Medium",
    science: "Geologically diverse and scientifically valuable region"
  }
};

/* =========================
   3D MOON
========================= */
// The Moon texture is tried in this order. If both fail, a generated texture is used.
// For the best result, download a Moon texture and save it next to index.html as moon.jpg
const textureSources = [
  "moon.jpg",
  "https://threejs.org/examples/textures/planets/moon_1024.jpg"
];

const container = document.getElementById("moon-canvas");
const DEG = Math.PI / 180;

let renderer, scene, camera, moon;
const markers = [];
let dragging = false, moved = 0, last = { x: 0, y: 0 };
let target = null;
let autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Latitude/longitude to a point on the sphere (lon 0 sits at the centre of the texture)
function latLonToVector(lat, lon, radius) {
  const la = lat * DEG, lo = lon * DEG;
  return new THREE.Vector3(
    radius * Math.cos(la) * Math.cos(lo),
    radius * Math.sin(la),
    -radius * Math.cos(la) * Math.sin(lo)
  );
}

function wrapAngle(a) {
  const t = Math.PI * 2;
  return ((a + Math.PI) % t + t) % t - Math.PI;
}

function makeProceduralTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#8c8b87";
  g.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 16; i++) {           // dark maria
    g.fillStyle = "rgba(55,55,60,0.35)";
    g.beginPath();
    g.ellipse(Math.random() * 1024, 90 + Math.random() * 330,
              30 + Math.random() * 80, 20 + Math.random() * 55,
              Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 1000; i++) {         // craters
    const x = Math.random() * 1024, y = Math.random() * 512;
    const r = 1 + Math.pow(Math.random(), 3) * 14;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.05)";
    g.fill();
    g.strokeStyle = "rgba(25,25,25,0.35)";
    g.lineWidth = 1;
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function loadTexture(index, material) {
  if (index >= textureSources.length) {
    material.map = makeProceduralTexture();
    material.needsUpdate = true;
    return;
  }
  new THREE.TextureLoader().load(
    textureSources[index],
    (tex) => { material.map = tex; material.needsUpdate = true; },
    undefined,
    () => loadTexture(index + 1, material)
  );
}

function initMoon() {
  if (!window.THREE) {
    container.innerHTML = '<p class="map-error">The 3D library could not load. Check your internet connection and reload the page.</p>';
    return;
  }

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    container.innerHTML = '<p class="map-error">Your browser does not support WebGL, so the 3D Moon cannot be shown.</p>';
    return;
  }

  const w = container.clientWidth, h = container.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.z = 3.6;

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-3, 2, 4);
  scene.add(sun);

  // Stars
  const starPos = [];
  for (let i = 0; i < 500; i++) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize().multiplyScalar(30 + Math.random() * 10);
    starPos.push(v.x, v.y, v.z);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })));

  // Moon
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  loadTexture(0, material);
  moon = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material);
  scene.add(moon);

  // Site markers
  Object.keys(lunarSites).forEach((name) => {
    const s = lunarSites[name];
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffb454 })
    );
    m.position.copy(latLonToVector(s.lat, s.lon, 1.01));
    m.userData.name = name;
    moon.add(m);
    markers.push(m);
  });

  // Start facing the near side
  moon.rotation.y = -Math.PI / 2;

  bindControls();
  new ResizeObserver(onResize).observe(container);
  animate();
}

function onResize() {
  const w = container.clientWidth, h = container.clientHeight;
  if (!renderer || !w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function bindControls() {
  const el = renderer.domElement;

  el.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = 0;
    last = { x: e.clientX, y: e.clientY };
    autoRotate = false;
    target = null;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    moved += Math.abs(dx) + Math.abs(dy);
    moon.rotation.y += dx * 0.006;
    moon.rotation.x = Math.max(-1.57, Math.min(1.57, moon.rotation.x + dy * 0.006));
  });

  el.addEventListener("pointerup", (e) => {
    dragging = false;
    if (moved < 6) pickMarker(e);
  });
  el.addEventListener("pointercancel", () => { dragging = false; });
}

function pickMarker(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  // The Moon is included so markers on the far side cannot be picked through it
  const hits = ray.intersectObjects([moon, ...markers], false);
  if (hits.length && hits[0].object.userData.name) {
    showSite(hits[0].object.userData.name);
  }
}

function focusSite(name) {
  const s = lunarSites[name];
  if (!s || !moon) return;
  autoRotate = false;
  target = { y: -Math.PI / 2 - s.lon * DEG, x: s.lat * DEG };
  markers.forEach((m) => {
    const active = m.userData.name === name;
    m.scale.setScalar(active ? 1.8 : 1);
    m.material.color.set(active ? 0xffffff : 0xffb454);
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (target) {
    const dy = wrapAngle(target.y - moon.rotation.y);
    const dx = target.x - moon.rotation.x;
    moon.rotation.y += dy * 0.08;
    moon.rotation.x += dx * 0.08;
    if (Math.abs(dy) < 0.001 && Math.abs(dx) < 0.001) target = null;
  } else if (autoRotate && !dragging) {
    moon.rotation.y += 0.0015;
  }
  renderer.render(scene, camera);
}

/* =========================
   SHOW SITE INFORMATION
========================= */
function showSite(siteName) {
  const site = lunarSites[siteName];
  if (!site) return;

  focusSite(siteName);

  const panel = document.getElementById("site-info");
  panel.innerHTML = `
    <h2>${siteName}</h2>
    <p><strong>Coordinates:</strong> ${site.coordinates}</p>
    <p><strong>Terrain:</strong> ${site.terrain}</p>
    <p><strong>Temperature:</strong> ${site.temperature}</p>
    <p><strong>Landing suitability:</strong> ${site.suitability}</p>
    <p><strong>Scientific value:</strong> ${site.science}</p>
  `;
  panel.style.display = "block";
  document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================
   SEARCH
========================= */
function searchSite() {
  const box = document.getElementById("site-search");
  const text = box.value.trim().toLowerCase();

  if (text === "") {
    alert("Please enter a lunar site name.");
    return;
  }

  const siteName = Object.keys(lunarSites).find((name) =>
    name.toLowerCase().includes(text)
  );

  if (siteName) {
    showSite(siteName);
  } else {
    alert(
      "No matching lunar site found.\n\nTry:\n" +
      Object.keys(lunarSites).map((n) => "• " + n).join("\n")
    );
  }
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", () => {
  initMoon();

  document.getElementById("search-btn").addEventListener("click", searchSite);
  document.getElementById("site-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchSite();
  });

  document.querySelectorAll(".site-card").forEach((card) => {
    card.addEventListener("click", () => showSite(card.dataset.site));
  });
});
