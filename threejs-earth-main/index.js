import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
// THREE.ColorManagement.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
// material.map.colorSpace = THREE.SRGBColorSpace;
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
  // alphaTest: 0.3,
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

// ===================== TASK_002 =====================

// --- 1. Satélites e órbitas dinâmicas ---
const satellitesData = [
  { radius: 1.6, inclination: 0,             speed: 0.005, angle: 0,   color: 0x00ff88 }, // Equatorial
  { radius: 1.8, inclination: Math.PI / 2,   speed: 0.004, angle: 1.2, color: 0x00ddff }, // Polar
  { radius: 1.5, inclination: Math.PI / 6,   speed: 0.006, angle: 2.5, color: 0xffaa00 }, // Inclinada 30°
  { radius: 1.7, inclination: Math.PI / 4,   speed: 0.003, angle: 3.8, color: 0xff00aa }, // Inclinada 45°
  { radius: 1.9, inclination: -Math.PI / 3,  speed: 0.002, angle: 5.0, color: 0xaa66ff }  // Inclinada -60°
];

function createSatellite(emissiveHex) {
  const sat = new THREE.Group();

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
satellitesData.forEach(sat => {
  const mesh = createSatellite(sat.color);
  scene.add(mesh);
  satellitesMeshes.push(mesh);
  scene.add(createOrbitLine(sat.radius, sat.inclination, sat.color));
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
  // Orienta o pino ortogonal à superfície (vetor normal saindo do centro)
  const normal = position.clone().normalize();
  pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  // Adicionado ao earthMesh para girar junto com a superfície/textura
  earthMesh.add(pinGroup);
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
});

// Hook de depuração/teste (TASK_002)
window.__earth = {
  satellitesData, satellitesMeshes,
  convertGeoToCartesian,
  getUserLocation,
  getLocationPin: () => locationPin,
  getUserLocationValue: () => userLocation,
  glowMesh, scene, earthMesh
};

function animate() {
  requestAnimationFrame(animate);

  earthMesh.rotation.y += 0.002;
  lightsMesh.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.0023;
  glowMesh.rotation.y += 0.002;
  stars.rotation.y -= 0.0002;

  // --- Translação e orientação dos satélites ---
  satellitesData.forEach((sat, index) => {
    sat.angle += sat.speed;
    const mesh = satellitesMeshes[index];
    mesh.position.x = sat.radius * Math.cos(sat.angle);
    mesh.position.y = sat.radius * Math.sin(sat.angle) * Math.sin(sat.inclination);
    mesh.position.z = sat.radius * Math.sin(sat.angle) * Math.cos(sat.inclination);
    mesh.lookAt(0, 0, 0);     // antena sempre voltada para a Terra
    mesh.rotateX(Math.PI / 2);
  });

  // --- Pulsação do halo do pino de localização ---
  if (locationPin) {
    const scaleFactor = 1.0 + 0.5 * Math.sin(Date.now() * 0.005);
    locationPin.ringMesh.scale.set(scaleFactor, scaleFactor, 1);
    locationPin.ringMesh.material.opacity = Math.max(0, 0.6 - (scaleFactor - 1.0) * 0.6);
  }

  // --- Oscilação do brilho Fresnel da atmosfera ---
  const pulseTime = Date.now() * 0.0015;
  glowMesh.material.uniforms.fresnelScale.value = 0.8 + 0.15 * Math.sin(pulseTime);

  renderer.render(scene, camera);
}

animate();

function handleWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);