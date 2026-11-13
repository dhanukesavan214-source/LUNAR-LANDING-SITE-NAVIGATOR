/* =========================
LUNAR SITE DATA
========================= */

const lunarSites = {
"Mare Tranquillitatis": {
lat: 8.5,
lon: 31.4,
coordinates: "8.5° N, 31.4° E",
terrain: "Relatively flat basaltic plain",
temperature: "Approx. -170°C to +120°C",
suitability: "High",
science: "Apollo 11 landing region; important lunar geology"
},

"Shackleton Crater": {
lat: -89.9,
lon: 0,
coordinates: "89.9° S, 0.0° E",
terrain: "Polar crater with permanently shadowed areas",
temperature: "Extremely cold in shadowed regions",
suitability: "High",
science: "Important target for studying lunar polar resources"
},

"Tycho Crater": {
lat: -43.3,
lon: -11.2,
coordinates: "43.3° S, 11.2° W",
terrain: "Large impact crater with rugged surroundings",
temperature: "Large temperature variation",
suitability: "Medium",
science: "Young impact crater with extensive ray system"
},

"Aristarchus Plateau": {
lat: 23.7,
lon: -47.4,
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

// Moon texture sources.
// If moon.jpg exists in your GitHub repository,
// it will be used first.

const textureSources = [
"moon.jpg",
"https://threejs.org/examples/textures/planets/moon_1024.jpg"
];

const container = document.getElementById("moon-canvas");

const DEG = Math.PI / 180;

let renderer;
let scene;
let camera;
let moon;

const markers = [];

let dragging = false;
let moved = 0;

let last = {
x: 0,
y: 0
};

let target = null;

let autoRotate =
!window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================
LATITUDE / LONGITUDE
========================= */

function latLonToVector(lat, lon, radius) {

const la = lat * DEG;
const lo = lon * DEG;

return new THREE.Vector3(
radius * Math.cos(la) * Math.cos(lo),
radius * Math.sin(la),
-radius * Math.cos(la) * Math.sin(lo)
);
}

/* =========================
ANGLE HELPER
========================= */

function wrapAngle(a) {

const t = Math.PI * 2;

return ((a + Math.PI) % t + t) % t - Math.PI;
}

/* =========================
FALLBACK MOON TEXTURE
========================= */

function makeProceduralTexture() {

const canvas = document.createElement("canvas");

canvas.width = 1024;
canvas.height = 512;

const ctx = canvas.getContext("2d");

// Moon surface
ctx.fillStyle = "#8c8b87";
ctx.fillRect(0, 0, 1024, 512);

// Dark lunar maria
for (let i = 0; i < 16; i++) {

ctx.fillStyle = "rgba(55,55,60,0.35)";

ctx.beginPath();

ctx.ellipse(
  Math.random() * 1024,
  90 + Math.random() * 330,
  30 + Math.random() * 80,
  20 + Math.random() * 55,
  Math.random() * 3,
  0,
  Math.PI * 2
);

ctx.fill();

}

// Craters
for (let i = 0; i < 1000; i++) {

const x = Math.random() * 1024;
const y = Math.random() * 512;

const r =
  1 + Math.pow(Math.random(), 3) * 14;

ctx.beginPath();

ctx.arc(
  x,
  y,
  r,
  0,
  Math.PI * 2
);

ctx.fillStyle = "rgba(255,255,255,0.05)";
ctx.fill();

ctx.strokeStyle = "rgba(25,25,25,0.35)";
ctx.lineWidth = 1;

ctx.stroke();

}

return new THREE.CanvasTexture(canvas);
}

/* =========================
LOAD MOON TEXTURE
========================= */

function loadTexture(index, material) {

if (index >= textureSources.length) {

material.map = makeProceduralTexture();

material.needsUpdate = true;

return;

}

new THREE.TextureLoader().load(

textureSources[index],

(texture) => {

  material.map = texture;

  material.needsUpdate = true;

},

undefined,

() => {

  loadTexture(index + 1, material);

}

);
}

/* =========================
INITIALIZE MOON
========================= */

function initMoon() {

if (!window.THREE) {

container.innerHTML = `
  <p class="map-error">
    The 3D library could not load.
    Check your internet connection and reload the page.
  </p>
`;

return;

}

try {

renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

} catch (error) {

container.innerHTML = `
  <p class="map-error">
    Your browser does not support WebGL,
    so the 3D Moon cannot be shown.
  </p>
`;

return;

}

const width = container.clientWidth;
const height = container.clientHeight;

renderer.setPixelRatio(
Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
width,
height
);

container.appendChild(
renderer.domElement
);

/* =========================
SCENE
========================= */

scene = new THREE.Scene();

/* =========================
CAMERA
========================= */

camera = new THREE.PerspectiveCamera(
40,
width / height,
0.1,
100
);

camera.position.z = 3.6;

/* =========================
LIGHTING
========================= */

const ambientLight =
new THREE.AmbientLight(
0xffffff,
0.35
);

scene.add(ambientLight);

const sun =
new THREE.DirectionalLight(
0xffffff,
1.1
);

sun.position.set(
-3,
2,
4
);

scene.add(sun);

/* =========================
STARS
========================= */

const starPositions = [];

for (let i = 0; i < 500; i++) {

const vector =
  new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  )
  .normalize()
  .multiplyScalar(
    30 + Math.random() * 10
  );

starPositions.push(
  vector.x,
  vector.y,
  vector.z
);

}

const starGeometry =
new THREE.BufferGeometry();

starGeometry.setAttribute(
"position",
new THREE.Float32BufferAttribute(
starPositions,
3
)
);

const starMaterial =
new THREE.PointsMaterial({
color: 0xffffff,
size: 0.08
});

const stars =
new THREE.Points(
starGeometry,
starMaterial
);

scene.add(stars);

/* =========================
MOON
========================= */

const moonMaterial =
new THREE.MeshStandardMaterial({
color: 0xffffff,
roughness: 1,
metalness: 0
});

loadTexture(
0,
moonMaterial
);

moon =
new THREE.Mesh(
new THREE.SphereGeometry(
1,
64,
64
),
moonMaterial
);

scene.add(moon);

/* =========================
SITE MARKERS
========================= */

Object.keys(lunarSites).forEach(
(siteName) => {

  const site =
    lunarSites[siteName];


  const marker =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        0.025,
        16,
        16
      ),

      new THREE.MeshBasicMaterial({
        color: 0xffb454
      })

    );


  marker.position.copy(

    latLonToVector(
      site.lat,
      site.lon,
      1.01
    )

  );


  marker.userData.name =
    siteName;


  moon.add(marker);

  markers.push(marker);

}

);

// Start facing the near side
moon.rotation.y =
-Math.PI / 2;

/* =========================
CONTROLS
========================= */

bindControls();

/* =========================
RESIZE
========================= */

if (window.ResizeObserver) {

new ResizeObserver(
  onResize
).observe(container);

} else {

window.addEventListener(
  "resize",
  onResize
);

}

/* =========================
START ANIMATION
========================= */

animate();
}

/* =========================
RESIZE
========================= */

function onResize() {

const width =
container.clientWidth;

const height =
container.clientHeight;

if (
!renderer ||
!width ||
!height
) {
return;
}

renderer.setSize(
width,
height
);

camera.aspect =
width / height;

camera.updateProjectionMatrix();
}

/* =========================
MOUSE / TOUCH CONTROLS
========================= */

function bindControls() {

const element =
renderer.domElement;

element.addEventListener(
"pointerdown",
(event) => {

  dragging = true;

  moved = 0;

  last = {
    x: event.clientX,
    y: event.clientY
  };


  autoRotate = false;

  target = null;


  element.setPointerCapture(
    event.pointerId
  );

}

);

element.addEventListener(
"pointermove",
(event) => {

  if (!dragging) {
    return;
  }


  const dx =
    event.clientX - last.x;

  const dy =
    event.clientY - last.y;


  last = {
    x: event.clientX,
    y: event.clientY
  };


  moved +=
    Math.abs(dx) +
    Math.abs(dy);


  moon.rotation.y +=
    dx * 0.006;


  moon.rotation.x =
    Math.max(
      -1.57,
      Math.min(
        1.57,
        moon.rotation.x +
        dy * 0.006
      )
    );

}

);

element.addEventListener(
"pointerup",
(event) => {

  dragging = false;


  // If the user only tapped,
  // check whether a marker was selected.
  if (moved < 6) {

    pickMarker(event);

  }

}

);

element.addEventListener(
"pointercancel",
() => {

  dragging = false;

}

);
}

/* =========================
PICK MOON MARKER
========================= */

function pickMarker(event) {

const rect =
renderer.domElement
.getBoundingClientRect();

const mouse =
new THREE.Vector2(

  (
    (event.clientX - rect.left) /
    rect.width
  ) * 2 - 1,

  -(
    (event.clientY - rect.top) /
    rect.height
  ) * 2 + 1

);

const raycaster =
new THREE.Raycaster();

raycaster.setFromCamera(
mouse,
camera
);

// Prevent selecting a marker
// through the Moon surface.

const hits =
raycaster.intersectObjects(
[moon, ...markers],
false
);

if (
hits.length &&
hits[0].object.userData.name
) {

showSite(
  hits[0].object.userData.name
);

}
}

/* =========================
FOCUS ON SITE
========================= */

function focusSite(name) {

const site =
lunarSites[name];

if (!site || !moon) {
return;
}

autoRotate = false;

target = {

y:
  -Math.PI / 2 -
  site.lon * DEG,

x:
  site.lat * DEG

};

markers.forEach(
(marker) => {

  const active =
    marker.userData.name === name;


  marker.scale.setScalar(
    active ? 1.8 : 1
  );


  marker.material.color.set(
    active
      ? 0xffffff
      : 0xffb454
  );

}

);
}

/* =========================
ANIMATION
========================= */

function animate() {

requestAnimationFrame(
animate
);

if (target) {

const dy =
  wrapAngle(
    target.y -
    moon.rotation.y
  );


const dx =
  target.x -
  moon.rotation.x;


moon.rotation.y +=
  dy * 0.08;


moon.rotation.x +=
  dx * 0.08;


if (
  Math.abs(dy) < 0.001 &&
  Math.abs(dx) < 0.001
) {

  target = null;

}

}

else if (
autoRotate &&
!dragging
) {

moon.rotation.y +=
  0.0015;

}

renderer.render(
scene,
camera
);
}

/* =========================
SHOW SITE INFORMATION
========================= */

function showSite(siteName) {

const site =
lunarSites[siteName];

if (!site) {
return;
}

// Rotate Moon to selected location
focusSite(siteName);

const panel =
document.getElementById(
"site-info"
);

panel.innerHTML = `

<div class="site-info-header">

  <span class="tag">
    ${site.suitability} Suitability
  </span>

  <h2>${siteName}</h2>

</div>


<div class="site-details">

  <div>
    <strong>Coordinates</strong>
    <span>
      ${site.coordinates}
    </span>
  </div>


  <div>
    <strong>Terrain</strong>
    <span>
      ${site.terrain}
    </span>
  </div>


  <div>
    <strong>Temperature</strong>
    <span>
      ${site.temperature}
    </span>
  </div>


  <div>
    <strong>Landing suitability</strong>
    <span>
      ${site.suitability}
    </span>
  </div>

</div>


<div class="scientific-value">

  <strong>
    Scientific value
  </strong>

  <p>
    ${site.science}
  </p>

</div>

`;

// Show the information panel
panel.style.display =
"block";

// Move smoothly to the map section
document
.getElementById("map")
.scrollIntoView({
behavior: "smooth",
block: "start"
});
}

/* =========================
SEARCH
========================= */

function searchSite() {

const searchBox =
document.getElementById(
"site-search"
);

const text =
searchBox.value
.trim()
.toLowerCase();

if (text === "") {

const panel =
  document.getElementById(
    "site-info"
  );


panel.innerHTML = `
  <h3>Search for a lunar site</h3>
  <p>
    Choose a site from the suggestions
    or type a lunar site name.
  </p>
`;


panel.style.display =
  "block";


return;

}

const siteName =
Object.keys(lunarSites).find(
(name) =>
name.toLowerCase()
.includes(text)
);

if (siteName) {

showSite(siteName);

}

else {

const panel =
  document.getElementById(
    "site-info"
  );


panel.innerHTML = `

  <h3>
    Site not found
  </h3>

  <p>
    No matching lunar landing site
    was found.
  </p>

  <p>
    Try:
    <strong>
      Mare Tranquillitatis
    </strong>,
    <strong>
      Shackleton Crater
    </strong>,
    <strong>
      Tycho Crater
    </strong>,
    or
    <strong>
      Aristarchus Plateau
    </strong>.
  </p>

`;


panel.style.display =
  "block";

}
}

/* =========================
START WEBSITE
========================= */

document.addEventListener(
"DOMContentLoaded",
() => {

/* Initialize 3D Moon */
initMoon();


/* Search button */

document
  .getElementById("search-btn")
  .addEventListener(
    "click",
    searchSite
  );


/* Press Enter to search */

document
  .getElementById("site-search")
  .addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {

        searchSite();

      }

    }
  );


/* Select a site from search suggestions */

document
  .getElementById("site-search")
  .addEventListener(
    "change",
    () => {

      const selectedSite =
        document
          .getElementById(
            "site-search"
          )
          .value
          .trim();


      const siteName =
        Object.keys(lunarSites).find(
          (name) =>
            name.toLowerCase() ===
            selectedSite.toLowerCase()
        );


      if (siteName) {

        showSite(siteName);

      }

    }
  );


/* Candidate site cards */

document
  .querySelectorAll(".site-card")
  .forEach(
    (card) => {

      card.addEventListener(
        "click",
        () => {

          const siteName =
            card.dataset.site;


          // Put selected site
          // into search box

          document
            .getElementById(
              "site-search"
            )
            .value =
            siteName;


          showSite(
            siteName
          );

        }
      );

    }
  );

}
);
