const game = document.getElementById('game');
const canvas = document.getElementById('game-canvas');
const hud = document.getElementById('hud');
const ctx = canvas.getContext('2d');

const TAU = Math.PI * 2;
const worldSize = 90;
let width = 0;
let height = 0;
let focalLength = 1;

// Scene setup: define the sky, flat ground, visible grid, and simple cubes used as landmarks.
const colors = {
  skyTop: '#111827',
  skyBottom: '#1e3a5f',
  ground: '#202938',
  grid: 'rgba(96, 165, 250, 0.34)',
  fog: 'rgba(17, 24, 39, 0.35)',
};

const cubes = [
  { x: -8, z: -8, size: 3, height: 3, color: '#60a5fa' },
  { x: 6, z: -14, size: 4, height: 5, color: '#f97316' },
  { x: 14, z: -4, size: 3, height: 3, color: '#38bdf8' },
  { x: -15, z: 7, size: 5, height: 7, color: '#a78bfa' },
  { x: 0, z: 12, size: 4, height: 4, color: '#22c55e' },
  { x: 12, z: 14, size: 3, height: 8, color: '#f59e0b' },
];

// Camera setup: the player's position is the camera position, kept at eye height above the ground.
const player = {
  x: 0,
  y: 1.7,
  z: 18,
  vx: 0,
  vz: 0,
  eyeHeight: 1.7,
  speed: 22,
  maxSpeed: 9,
  friction: 9,
};

let yaw = Math.PI;
let pitch = 0;

function resize() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  focalLength = width / (2 * Math.tan((75 * Math.PI / 180) / 2));
}

window.addEventListener('resize', resize);
resize();

// Pointer lock: clicking the game locks the mouse; pressing Escape unlocks through normal browser behavior.
game.addEventListener('click', () => {
  if (document.pointerLockElement !== game) {
    game.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === game;
  hud.classList.toggle('hidden', locked);
  document.body.classList.toggle('locked', locked);
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== game) return;

  const sensitivity = 0.0024;
  yaw = (yaw - event.movementX * sensitivity) % TAU;
  pitch -= event.movementY * sensitivity;
  pitch = Math.max(-1.25, Math.min(1.25, pitch));
});

// Movement: WASD input accelerates the player relative to camera yaw, then damping smooths stopping.
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = true;
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = false;
});

function updateMovement(delta) {
  const inputRight = Number(keys.d) - Number(keys.a);
  const inputForward = Number(keys.w) - Number(keys.s);
  const inputLength = Math.hypot(inputRight, inputForward);

  if (inputLength > 0) {
    const normalizedRight = inputRight / inputLength;
    const normalizedForward = inputForward / inputLength;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const worldX = normalizedRight * cos + normalizedForward * sin;
    const worldZ = -normalizedRight * sin + normalizedForward * cos;

    player.vx += worldX * player.speed * delta;
    player.vz += worldZ * player.speed * delta;
  }

  const currentSpeed = Math.hypot(player.vx, player.vz);
  if (currentSpeed > player.maxSpeed) {
    const scale = player.maxSpeed / currentSpeed;
    player.vx *= scale;
    player.vz *= scale;
  }

  const damping = Math.exp(-player.friction * delta);
  player.vx *= damping;
  player.vz *= damping;

  player.x += player.vx * delta;
  player.z += player.vz * delta;

  // Ground collision: this prototype has no jumping, so eye height is fixed above the flat plane.
  player.y = player.eyeHeight;

  const boundary = worldSize / 2 - 2;
  player.x = clamp(player.x, -boundary, boundary);
  player.z = clamp(player.z, -boundary, boundary);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shadeColor(hex, percent) {
  const amount = Math.round(255 * percent);
  const number = Number.parseInt(hex.slice(1), 16);
  const red = clamp((number >> 16) + amount, 0, 255);
  const green = clamp(((number >> 8) & 255) + amount, 0, 255);
  const blue = clamp((number & 255) + amount, 0, 255);
  return `rgb(${red}, ${green}, ${blue})`;
}

function projectPoint(point) {
  const dx = point.x - player.x;
  const dy = point.y - player.y;
  const dz = point.z - player.z;
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  const camX = cosYaw * dx - sinYaw * dz;
  const yawZ = sinYaw * dx + cosYaw * dz;
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);
  const camY = cosPitch * dy - sinPitch * yawZ;
  const camZ = sinPitch * dy + cosPitch * yawZ;

  if (camZ <= 0.08) return null;

  return {
    x: width / 2 + (camX / camZ) * focalLength,
    y: height / 2 - (camY / camZ) * focalLength,
    depth: camZ,
  };
}

function drawBackground() {
  const horizon = clamp(height / 2 + Math.tan(pitch) * focalLength, -height, height * 2);
  const skyGradient = ctx.createLinearGradient(0, 0, 0, Math.max(horizon, 1));
  skyGradient.addColorStop(0, colors.skyTop);
  skyGradient.addColorStop(1, colors.skyBottom);

  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, Math.max(horizon, 0));
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, Math.max(horizon, 0), width, height);
}

function drawGroundGrid() {
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.grid;

  for (let i = -worldSize / 2; i <= worldSize / 2; i += 5) {
    drawWorldLine({ x: i, y: 0, z: -worldSize / 2 }, { x: i, y: 0, z: worldSize / 2 });
    drawWorldLine({ x: -worldSize / 2, y: 0, z: i }, { x: worldSize / 2, y: 0, z: i });
  }
}

function drawWorldLine(start, end) {
  const a = projectPoint(start);
  const b = projectPoint(end);
  if (!a || !b) return;

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function buildCubeFaces(cube) {
  const half = cube.size / 2;
  const bottom = 0;
  const top = cube.height;
  const vertices = [
    { x: cube.x - half, y: bottom, z: cube.z - half },
    { x: cube.x + half, y: bottom, z: cube.z - half },
    { x: cube.x + half, y: bottom, z: cube.z + half },
    { x: cube.x - half, y: bottom, z: cube.z + half },
    { x: cube.x - half, y: top, z: cube.z - half },
    { x: cube.x + half, y: top, z: cube.z - half },
    { x: cube.x + half, y: top, z: cube.z + half },
    { x: cube.x - half, y: top, z: cube.z + half },
  ];

  const faceDefinitions = [
    { indexes: [0, 1, 5, 4], shade: -0.08 },
    { indexes: [1, 2, 6, 5], shade: 0.04 },
    { indexes: [2, 3, 7, 6], shade: -0.16 },
    { indexes: [3, 0, 4, 7], shade: 0.1 },
    { indexes: [4, 5, 6, 7], shade: 0.2 },
  ];

  return faceDefinitions.map((face) => {
    const points = face.indexes.map((index) => vertices[index]);
    const projected = points.map(projectPoint);
    if (projected.some((point) => point === null)) return null;

    return {
      points: projected,
      depth: projected.reduce((sum, point) => sum + point.depth, 0) / projected.length,
      color: shadeColor(cube.color, face.shade),
    };
  }).filter(Boolean);
}

function drawCubes() {
  const faces = cubes.flatMap(buildCubeFaces).sort((a, b) => b.depth - a.depth);

  faces.forEach((face) => {
    ctx.beginPath();
    ctx.moveTo(face.points[0].x, face.points[0].y);
    face.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fillStyle = face.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();
  });
}

function drawFog() {
  ctx.fillStyle = colors.fog;
  ctx.fillRect(0, 0, width, height);
}

// Animation loop: advance movement, draw the ground and objects, and request the next frame.
let lastTime = performance.now();

function animate(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updateMovement(delta);
  drawBackground();
  drawGroundGrid();
  drawCubes();
  drawFog();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
