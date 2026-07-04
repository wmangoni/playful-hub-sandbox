import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 1.5, 3.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1.25;
controls.maxDistance = 10;

const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});

const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({numStars: 2000});
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

// Group containers to allow global show/hide toggles
const satellitesGroup = new THREE.Group();
scene.add(satellitesGroup);

const orbitsGroup = new THREE.Group();
scene.add(orbitsGroup);

const stationsGroup = new THREE.Group();
earthMesh.add(stationsGroup); // rotates with the earth

const debrisGroup = new THREE.Group();
scene.add(debrisGroup);

// Clickable objects registry for Raycasting
const clickableObjects = [];

// ===================== TASK_002 & TASK_003 =====================

// --- 1. Satélites e órbitas dinâmicas ---
const satellitesData = [
  { radius: 1.6, inclination: 0,             speed: 0.005, angle: 0,   color: 0x00ff88 }, // Equatorial
  { radius: 1.8, inclination: Math.PI / 2,   speed: 0.004, angle: 1.2, color: 0x00ddff }, // Polar
  { radius: 1.5, inclination: Math.PI / 6,   speed: 0.006, angle: 2.5, color: 0xffaa00 }, // Inclinada 30°
  { radius: 1.7, inclination: Math.PI / 4,   speed: 0.003, angle: 3.8, color: 0xff00aa }, // Inclinada 45°
  { radius: 1.9, inclination: -Math.PI / 3,  speed: 0.002, angle: 5.0, color: 0xaa66ff }  // Inclinada -60°
];

function createSatellite(emissiveHex, index) {
  const sat = new THREE.Group();
  sat.name = `Satellite_${index}`;
  sat.userData = { 
    type: 'satellite', 
    index: index, 
    name: `Satélite ${['Equatorial', 'Polar', 'Inclinada 30°', 'Inclinada 45°', 'Inclinada -60°'][index]}` 
  };

  // Corpo central metálico
  const bodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  sat.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Painéis solares (com auto-iluminação para visibilidade no lado noturno - recomendação do PO)
  const panelGeo = new THREE.BoxGeometry(0.18, 0.05, 0.01);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0055ff, metalness: 0.8, roughness: 0.2,
    emissive: emissiveHex, emissiveIntensity: 0.6
  });
  const panelLeft = new THREE.Mesh(panelGeo, panelMat);
  panelLeft.position.x = -0.12;
  sat.add(panelLeft);
  const panelRight = panelLeft.clone();
  panelRight.position.x = 0.12;
  sat.add(panelRight);

  // Antena direcional apontando para o planeta
  const dishGeo = new THREE.ConeGeometry(0.03, 0.05, 8);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 });
  const dishMesh = new THREE.Mesh(dishGeo, dishMat);
  dishMesh.position.y = -0.07;
  dishMesh.rotation.x = Math.PI;
  sat.add(dishMesh);

  // Anel de Alerta de Colisão (vermelho neon piscante) - TASK_003
  const alertRingGeo = new THREE.RingGeometry(0.12, 0.14, 16);
  const alertRingMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  });
  const alertRing = new THREE.Mesh(alertRingGeo, alertRingMat);
  alertRing.name = "alertRing";
  alertRing.rotation.x = Math.PI / 2;
  alertRing.visible = false;
  sat.add(alertRing);

  return sat;
}

function createOrbitLine(orbitRadius, inclination, color) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      orbitRadius * Math.cos(theta),
      orbitRadius * Math.sin(theta) * Math.sin(inclination),
      orbitRadius * Math.sin(theta) * Math.cos(inclination)
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending
  });
  return new THREE.Line(geometry, material);
}

const satellitesMeshes = [];
satellitesData.forEach((sat, index) => {
  const mesh = createSatellite(sat.color, index);
  satellitesGroup.add(mesh);
  satellitesMeshes.push(mesh);
  
  const orbitLine = createOrbitLine(sat.radius, sat.inclination, sat.color);
  orbitsGroup.add(orbitLine);
  
  clickableObjects.push(mesh);
});

// --- 2. Geolocalização por IP e pino 3D ---
function convertGeoToCartesian(lat, lon, radius) {
  const phi = lat * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180); // alinha com o mapeamento UV padrão
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta)
  );
}

function createLocationPin(position) {
  const pinGroup = new THREE.Group();
  pinGroup.name = "UserLocationPin";

  const coneGeo = new THREE.ConeGeometry(0.02, 0.08, 8);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.9 });
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.y = 0.04;
  coneMesh.rotation.x = Math.PI;
  pinGroup.add(coneMesh);

  const ringGeo = new THREE.RingGeometry(0.001, 0.04, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3300, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  pinGroup.add(ringMesh);

  pinGroup.position.copy(position);
  const normal = position.clone().normalize();
  pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  earthMesh.add(pinGroup); // Gira junto com a terra
  return { pinGroup, ringMesh };
}

let locationPin = null;
let userLocation = null;
async function getUserLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const d = await res.json();
      const lat = (typeof d.latitude === 'number') ? d.latitude : d.lat;
      const lon = (typeof d.longitude === 'number') ? d.longitude : d.lon;
      if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon };
    }
  } catch (e) {
    console.warn('Falha no geolookup IP. Usando fallback São Paulo/BR:', e);
  }
  return { lat: -23.5505, lon: -46.6333 }; // Fallback robusto: São Paulo
}

getUserLocation().then(loc => {
  userLocation = loc;
  const pos = convertGeoToCartesian(loc.lat, loc.lon, 1.025);
  locationPin = createLocationPin(pos);
  
  locationPin.pinGroup.userData = {
    type: 'user_pin',
    name: 'Sua Localização',
    lat: loc.lat,
    lon: loc.lon
  };
  clickableObjects.push(locationPin.pinGroup);
});

// ===================== TASK_003: IMPLEMENTATION =====================

// --- 1. Estações Terrestres de Observação ---
const stations = [];
const stationsData = [
  { name: "Cabo Canaveral (EUA)", lat: 28.3922, lon: -80.6077 },
  { name: "Baikonur (Cazaquistão)", lat: 45.9650, lon: 63.3050 },
  { name: "Kourou (Guiana Francesa)", lat: 5.1597, lon: -52.6502 }
];

stationsData.forEach(st => {
  const pos = convertGeoToCartesian(st.lat, st.lon, 1.008);
  const markerGroup = new THREE.Group();
  markerGroup.name = st.name;
  markerGroup.userData = {
    type: 'station',
    name: st.name,
    lat: st.lat,
    lon: st.lon
  };

  // Anel ciano neon na superfície
  const ringGeo = new THREE.RingGeometry(0.015, 0.025, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  markerGroup.add(ringMesh);

  // Pequeno ponto central
  const dotGeo = new THREE.SphereGeometry(0.008, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const dotMesh = new THREE.Mesh(dotGeo, dotMat);
  markerGroup.add(dotMesh);

  markerGroup.position.copy(pos);
  const normal = pos.clone().normalize();
  markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  stationsGroup.add(markerGroup);
  stations.push({ markerGroup, ringMesh });
  clickableObjects.push(markerGroup);
});

// --- 2. Vento Solar, Auroras Polares e Tempestades Geomagnéticas ---

// A. Auroras Polares (Norte e Sul)
function createAuroraRing(yOffset, isNorth) {
  const auroraGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 64);
  const auroraMat = new THREE.MeshBasicMaterial({
    color: isNorth ? 0x00ff66 : 0x00aaff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
  auroraMesh.position.y = yOffset;
  auroraMesh.rotation.x = Math.PI / 2;
  auroraMesh.scale.set(1.0, 1.0, 0.2); // Fita achatada verticalmente
  earthMesh.add(auroraMesh); // Rotaciona junto com a terra
  return auroraMesh;
}

const auroraNorth = createAuroraRing(0.94, true);
const auroraSouth = createAuroraRing(-0.94, false);

// B. Partículas de Vento Solar (LineSegments para efeito de alongamento neon)
const solarWindCount = 60;
const solarWindPositions = new Float32Array(solarWindCount * 6); // 2 pontos por linha, 3 coords
const solarWindLifes = new Float32Array(solarWindCount);
const solarWindSpeeds = new Float32Array(solarWindCount);

// Direção do vento: do Sol para a Terra
const sunPos = new THREE.Vector3(-2, 0.5, 1.5);
const windDir = sunPos.clone().negate().normalize();
const uVector = new THREE.Vector3(0, 1, 0).cross(windDir).normalize();
const vVector = windDir.clone().cross(uVector).normalize();

function resetWindLine(i) {
  const diskCenter = sunPos.clone().normalize().multiplyScalar(4.0); // Spawna distante
  const radius = 0.2 + Math.random() * 1.6;
  const angle = Math.random() * Math.PI * 2;
  
  const pos = diskCenter.clone()
    .addScaledVector(uVector, Math.cos(angle) * radius)
    .addScaledVector(vVector, Math.sin(angle) * radius);
      
  const idx = i * 6;
  solarWindPositions[idx] = pos.x;
  solarWindPositions[idx + 1] = pos.y;
  solarWindPositions[idx + 2] = pos.z;
  
  const end = pos.clone().addScaledVector(windDir, 0.12);
  solarWindPositions[idx + 3] = end.x;
  solarWindPositions[idx + 4] = end.y;
  solarWindPositions[idx + 5] = end.z;
  
  solarWindLifes[i] = 0.0;
  solarWindSpeeds[i] = 0.02 + Math.random() * 0.03;
}

for (let i = 0; i < solarWindCount; i++) {
  resetWindLine(i);
  solarWindLifes[i] = Math.random(); // Stagger inicial
}

const solarWindGeometry = new THREE.BufferGeometry();
solarWindGeometry.setAttribute('position', new THREE.BufferAttribute(solarWindPositions, 3));

const solarWindMaterial = new THREE.LineBasicMaterial({
  color: 0x00ffcc,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending
});

const solarWindLines = new THREE.LineSegments(solarWindGeometry, solarWindMaterial);
scene.add(solarWindLines);

// --- 3. Lixo Espacial (Space Debris) ---
const debrisCount = 40;
const debrisData = [];

function createSpaceDebris() {
  for (let i = 0; i < debrisCount; i++) {
    const size = 0.01 + Math.random() * 0.014;
    // Tetrahedron para forma caótica irregular
    const debrisGeo = new THREE.TetrahedronGeometry(size);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
      emissive: 0x333333,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(debrisGeo, debrisMat);
    
    // Parâmetros orbitais caóticos
    const radius = 1.35 + Math.random() * 0.65;
    const inclination = (Math.random() - 0.5) * Math.PI;
    const speed = (0.002 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1);
    const angle = Math.random() * Math.PI * 2;
    
    debrisGroup.add(mesh);
    
    debrisData.push({
      mesh,
      radius,
      inclination,
      speed,
      angle
    });
  }
}

createSpaceDebris();

// --- 4. Interatividade e Raycasting de Cliques ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentTarget = null;
let lastTargetPos = null;

function onPointerDown(event) {
  // Ignorar cliques na interface HUD
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || event.target.closest('.hud-panel')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects, true);

  if (intersects.length > 0) {
    let hitObj = intersects[0].object;
    let matched = null;
    
    // Procura na cadeia de pais se algum é o topo da lista de clicáveis
    while (hitObj && hitObj !== scene) {
      if (clickableObjects.includes(hitObj)) {
        matched = hitObj;
        break;
      }
      hitObj = hitObj.parent;
    }
    
    if (matched) {
      selectTarget(matched);
    }
  }
}

function selectTarget(target) {
  currentTarget = target;
  lastTargetPos = null;
  document.getElementById('telemetrySidebar').style.display = 'flex';
  playBeep(587.33, 0.08); // som sutil de feedback
}

window.addEventListener('pointerdown', onPointerDown);

// Botão Liberar Foco
document.getElementById('releaseFocusBtn').addEventListener('click', () => {
  currentTarget = null;
  lastTargetPos = null;
  document.getElementById('telemetrySidebar').style.display = 'none';
  playBeep(392.00, 0.1);
});

// --- 5. Síntese de Áudio com Web Audio API ---
let audioCtx = null;
let alarmInterval = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Inicializar áudio no primeiro clique do usuário
window.addEventListener('click', initAudio);
window.addEventListener('touchstart', initAudio);

function playBeep(freq, duration) {
  initAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Erro no som simples:", e);
  }
}

function playCollisionAlarm() {
  initAudio();
  if (!audioCtx) return;
  if (alarmInterval) return; // Alarme já em reprodução

  alarmInterval = setInterval(() => {
    // Verificar se o alarme está mutado no painel HTML
    const alarmCheckbox = document.getElementById('alarmToggle');
    if (alarmCheckbox && !alarmCheckbox.checked) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Som tático agudo
      osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.15); // Rampa de descida
      
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error("Erro no sintetizador de alarme:", e);
    }
  }, 250);
}

function stopCollisionAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// --- 6. Toggles e Sliders do HTML ---
const satellitesToggle = document.getElementById('satellitesToggle');
const solarWindToggle = document.getElementById('solarWindToggle');
const aurorasToggle = document.getElementById('aurorasToggle');
const debrisToggle = document.getElementById('debrisToggle');
const solarStormSlider = document.getElementById('solarStormSlider');
const solarStormVal = document.getElementById('solarStormVal');
const scanlines = document.getElementById('scanlines');
const controlPanel = document.getElementById('controlPanel');
const telemetrySidebar = document.getElementById('telemetrySidebar');

solarStormSlider.addEventListener('input', () => {
  const val = parseInt(solarStormSlider.value);
  solarStormVal.textContent = val + '%';
  
  if (val >= 80) {
    scanlines.classList.add('active');
    controlPanel.classList.add('glitch');
    telemetrySidebar.classList.add('glitch');
    document.querySelectorAll('h1, h2').forEach(el => el.classList.add('glitch'));
  } else {
    scanlines.classList.remove('active');
    controlPanel.classList.remove('glitch');
    telemetrySidebar.classList.remove('glitch');
    document.querySelectorAll('h1, h2').forEach(el => el.classList.remove('glitch'));
  }
});

satellitesToggle.addEventListener('change', () => {
  const show = satellitesToggle.checked;
  satellitesGroup.visible = show;
  orbitsGroup.visible = show;
  
  // Liberar foco se o satélite atual focado for ocultado
  if (!show && currentTarget && currentTarget.userData.type === 'satellite') {
    currentTarget = null;
    lastTargetPos = null;
    document.getElementById('telemetrySidebar').style.display = 'none';
  }
});

solarWindToggle.addEventListener('change', () => {
  solarWindLines.visible = solarWindToggle.checked;
});

aurorasToggle.addEventListener('change', () => {
  auroraNorth.visible = aurorasToggle.checked;
  auroraSouth.visible = aurorasToggle.checked;
});

debrisToggle.addEventListener('change', () => {
  debrisGroup.visible = debrisToggle.checked;
});

// Hook de depuração/teste (TASK_002 & TASK_003)
window.__earth = {
  satellitesData, satellitesMeshes,
  convertGeoToCartesian,
  getUserLocation,
  getLocationPin: () => locationPin,
  getUserLocationValue: () => userLocation,
  glowMesh, scene, earthMesh,
  stations, clickableObjects,
  auroras: { north: auroraNorth, south: auroraSouth },
  solarWind: solarWindLines,
  debris: debrisData,
  getCurrentTarget: () => currentTarget
};

// ===================== RENDER LOOP =====================

function animate() {
  requestAnimationFrame(animate);

  earthMesh.rotation.y += 0.002;
  lightsMesh.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.0023;
  glowMesh.rotation.y += 0.002;
  stars.rotation.y -= 0.0002;

  const stormSlider = document.getElementById('solarStormSlider');
  const stormIntensity = parseFloat(stormSlider.value) / 100 || 0.0;
  const speedMult = 1.0 + stormIntensity * 3.0;

  // --- Translação e orientação dos satélites ---
  satellitesData.forEach((sat, index) => {
    sat.angle += sat.speed;
    const mesh = satellitesMeshes[index];
    mesh.position.x = sat.radius * Math.cos(sat.angle);
    mesh.position.y = sat.radius * Math.sin(sat.angle) * Math.sin(sat.inclination);
    mesh.position.z = sat.radius * Math.sin(sat.angle) * Math.cos(sat.inclination);
    mesh.lookAt(0, 0, 0);     // Antena voltada ao centro
    mesh.rotateX(Math.PI / 2);
  });

  // --- Pulsação do pino de geolocalização do usuário ---
  if (locationPin) {
    const scaleFactor = 1.0 + 0.5 * Math.sin(Date.now() * 0.005);
    locationPin.ringMesh.scale.set(scaleFactor, scaleFactor, 1);
    locationPin.ringMesh.material.opacity = Math.max(0, 0.6 - (scaleFactor - 1.0) * 0.6);
  }

  // --- Oscilação do brilho Fresnel da atmosfera ---
  const pulseTime = Date.now() * 0.0015;
  glowMesh.material.uniforms.fresnelScale.value = (0.8 + 0.15 * Math.sin(pulseTime)) * (1.0 - stormIntensity * 0.15); // sutilmente enfraquece no solstício

  // --- Pulsação das estações terrestres (Ciano) ---
  stations.forEach(st => {
    const scaleFactor = 1.0 + 0.4 * Math.sin(Date.now() * 0.008);
    st.ringMesh.scale.set(scaleFactor, scaleFactor, 1);
    st.ringMesh.material.opacity = Math.max(0, 0.8 - (scaleFactor - 1.0) * 2.0);
  });

  // --- Animação e Oscilação Orgânica das Auroras ---
  if (auroraNorth.visible) {
    const time = Date.now() * 0.001;
    auroraNorth.rotation.z = time * 0.06;
    auroraSouth.rotation.z = -time * 0.05;

    const scaleN = 1.0 + 0.05 * Math.sin(time * 2.5);
    const scaleS = 1.0 + 0.04 * Math.sin(time * 2.1 + 1.0);
    auroraNorth.scale.set(scaleN, scaleN, 0.2 + stormIntensity * 0.4);
    auroraSouth.scale.set(scaleS, scaleS, 0.2 + stormIntensity * 0.4);

    auroraNorth.position.y = 0.94 + 0.015 * Math.sin(time * 1.8);
    auroraSouth.position.y = -0.94 - 0.015 * Math.sin(time * 1.8 + 0.5);

    auroraNorth.material.opacity = (0.22 + 0.12 * Math.sin(time * 3.0)) * (1.0 + stormIntensity * 2.0);
    auroraSouth.material.opacity = (0.22 + 0.12 * Math.sin(time * 2.7)) * (1.0 + stormIntensity * 2.0);

    // Ajuste de HSL com a tempestade
    if (stormIntensity > 0.8) {
      auroraNorth.material.color.setHex(0x00ff33);
      auroraSouth.material.color.setHex(0x00ffff);
    } else {
      auroraNorth.material.color.setHex(0x00ff66);
      auroraSouth.material.color.setHex(0x00aaff);
    }
  }

  // --- Animação do Vento Solar ---
  if (solarWindLines.visible) {
    const posAttr = solarWindGeometry.attributes.position;
    for (let i = 0; i < solarWindCount; i++) {
      solarWindLifes[i] += 0.004 * speedMult;
      if (solarWindLifes[i] >= 1.0) {
        resetWindLine(i);
        continue;
      }

      const idx = i * 6;
      let px = posAttr.getX(i * 2);
      let py = posAttr.getY(i * 2);
      let pz = posAttr.getZ(i * 2);
      
      let pos = new THREE.Vector3(px, py, pz);
      const step = solarWindSpeeds[i] * speedMult;
      pos.addScaledVector(windDir, step);

      // Deflexão ao redor do campo magnético terrestre
      const distToCenter = pos.length();
      if (distToCenter < 1.4) {
        const radial = pos.clone().normalize();
        pos.addScaledVector(radial, (1.4 - distToCenter) * 0.45);
      }

      posAttr.setXYZ(i * 2, pos.x, pos.y, pos.z);
      const end = pos.clone().addScaledVector(windDir, 0.12 + stormIntensity * 0.08);
      posAttr.setXYZ(i * 2 + 1, end.x, end.y, end.z);
    }
    posAttr.needsUpdate = true;
    
    // Cor e brilho dependentes da intensidade da tempestade
    solarWindMaterial.color.setHSL(0.48 - stormIntensity * 0.15, 1.0, 0.5 + stormIntensity * 0.2);
    solarWindMaterial.opacity = 0.2 + stormIntensity * 0.55;
  }

  // --- Movimentação do Lixo Espacial e Detecção de Colisão ---
  let collisionDetected = false;
  let threatenedSatIndex = -1;
  let collisionDebrisId = -1;

  // Oculta anéis de alerta por padrão
  satellitesMeshes.forEach(mesh => {
    const ring = mesh.getObjectByName("alertRing");
    if (ring) ring.visible = false;
  });

  debrisData.forEach((debris, dIdx) => {
    debris.angle += debris.speed;
    debris.mesh.position.x = debris.radius * Math.cos(debris.angle);
    debris.mesh.position.y = debris.radius * Math.sin(debris.angle) * Math.sin(debris.inclination);
    debris.mesh.position.z = debris.radius * Math.sin(debris.angle) * Math.cos(debris.inclination);
    debris.mesh.rotation.x += 0.01;
    debris.mesh.rotation.y += 0.02;
  });

  // Só checa colisão se detritos e satélites estão visíveis
  if (debrisGroup.visible && satellitesGroup.visible) {
    satellitesMeshes.forEach((satMesh, sIdx) => {
      const satPos = new THREE.Vector3();
      satMesh.getWorldPosition(satPos);

      debrisData.forEach((debris, dIdx) => {
        const debPos = new THREE.Vector3();
        debris.mesh.getWorldPosition(debPos);

        const dist = satPos.distanceTo(debPos);
        if (dist < 0.15) {
          collisionDetected = true;
          threatenedSatIndex = sIdx;
          collisionDebrisId = dIdx;

          // Habilitar e piscar anel de aviso no satélite sob risco
          const ring = satMesh.getObjectByName("alertRing");
          if (ring) {
            ring.visible = true;
            ring.material.opacity = (Math.floor(Date.now() / 150) % 2 === 0) ? 0.9 : 0.15;
            const sc = 1.0 + 0.15 * Math.sin(Date.now() * 0.025);
            ring.scale.set(sc, sc, 1);
          }
        }
      });
    });
  }

  // Ativação da UI e Alarme de Colisão
  const warningBanner = document.getElementById('warningBanner');
  const warningMessage = document.getElementById('warningMessage');

  if (collisionDetected) {
    const satName = ['Equatorial', 'Polar', 'Inclinado 30°', 'Inclinado 45°', 'Inclinado -60°'][threatenedSatIndex];
    warningMessage.textContent = `COLLISION WARNING: DEBRIS OBJ-[${collisionDebrisId}] CLOSE TO SAT-[${satName.toUpperCase()}]`;
    warningBanner.style.display = 'flex';
    playCollisionAlarm();
  } else {
    warningBanner.style.display = 'none';
    stopCollisionAlarm();
  }

  // --- Câmera e Foco Orbitais Suaves (LERP & Active Follow) ---
  if (currentTarget) {
    const targetPos = new THREE.Vector3();
    currentTarget.getWorldPosition(targetPos);
    
    // LERP do ponto de foco dos OrbitControls
    controls.target.lerp(targetPos, 0.05);

    // Ajusta a câmera aplicando o deslocamento delta do satélite para mantê-lo centrado sem travar rotações
    if (!lastTargetPos) {
      lastTargetPos = targetPos.clone();
    }
    const moveDelta = new THREE.Vector3().subVectors(targetPos, lastTargetPos);
    camera.position.add(moveDelta);
    lastTargetPos.copy(targetPos);

    // Atualiza a barra de telemetria
    const data = currentTarget.userData;
    let name = data.name || "Desconhecido";
    let category = "Objeto Espacial";
    let statusText = "OPERACIONAL";
    let statusColor = "#00ffaa";
    let detailsHtml = "";

    if (data.type === 'satellite') {
      category = "Satélite Artificial";
      const satIdx = data.index;
      const satInfo = satellitesData[satIdx];
      const alt = (satInfo.radius - 1.0) * 6371;
      const speed = satInfo.speed * 6371 * 60;
      const battery = Math.min(100, Math.max(5, Math.floor(95 + 5 * Math.sin(Date.now() * 0.001))));
      const temp = (15 + 2 * Math.sin(Date.now() * 0.0005)).toFixed(1);
      const signal = Math.max(10, Math.floor(85 + 15 * Math.sin(Date.now() * 0.002) + (Math.random() - 0.5) * 5));

      detailsHtml = `
        <div class="tel-row"><span>Órbita:</span> <span>${['Equatorial', 'Polar', 'Inclinada 30°', 'Inclinada 45°', 'Inclinada -60°'][satIdx]}</span></div>
        <div class="tel-row"><span>Altitude:</span> <span>${alt.toFixed(0)} km</span></div>
        <div class="tel-row"><span>Velocidade:</span> <span>${speed.toFixed(0)} km/h</span></div>
        <div class="tel-row"><span>Força Sinal:</span> <span>${signal}%</span></div>
        <div class="tel-row"><span>Bateria:</span> <span>${battery}%</span></div>
        <div class="tel-row"><span>Temp. Painel:</span> <span>${temp} °C</span></div>
      `;

      if (threatenedSatIndex === satIdx) {
        statusText = "AVISO DE COLISÃO";
        statusColor = "#ff0055";
      }
    } else if (data.type === 'station') {
      category = "Estação Terrestre";
      const signal = Math.max(10, Math.floor(90 + 10 * Math.sin(Date.now() * 0.001) + (Math.random() - 0.5) * 3));
      const activeUsers = Math.floor(8 + 4 * Math.sin(Date.now() * 0.0001));

      detailsHtml = `
        <div class="tel-row"><span>Latitude:</span> <span>${data.lat.toFixed(4)}°</span></div>
        <div class="tel-row"><span>Longitude:</span> <span>${data.lon.toFixed(4)}°</span></div>
        <div class="tel-row"><span>Sinal Uplink:</span> <span>${signal}%</span></div>
        <div class="tel-row"><span>Operadores:</span> <span>${activeUsers}</span></div>
      `;
    } else if (data.type === 'user_pin') {
      category = "Sua Geolocalização";
      detailsHtml = `
        <div class="tel-row"><span>Latitude:</span> <span>${data.lat.toFixed(4)}°</span></div>
        <div class="tel-row"><span>Longitude:</span> <span>${data.lon.toFixed(4)}°</span></div>
        <div class="tel-row"><span>Status GPS:</span> <span>CONECTADO</span></div>
        <div class="tel-row"><span>Precisão:</span> <span>Aproximada por IP</span></div>
      `;
    }

    document.getElementById('telName').textContent = name;
    document.getElementById('telCategory').textContent = category;
    document.getElementById('telStatus').textContent = statusText;
    document.getElementById('telStatus').style.color = statusColor;
    document.getElementById('telDetails').innerHTML = detailsHtml;

  } else {
    // Retorna foco ao centro da Terra
    controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
    lastTargetPos = null;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

function handleWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);