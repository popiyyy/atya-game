import { CONFIG, GAME_STATES } from "./config.js";
import { StateMachine, GameSession } from "./game/GameState.js";
import { CoordinateMapper } from "./tracking/coordMapper.js";
import { HandTracker } from "./tracking/handTracker.js";
import { createHud } from "./ui/hud.js";
import { createLeaderboard } from "./ui/leaderboard.js";
import { createScreens } from "./ui/screens.js";
import { drawDrone, drawFeedback, drawHouse, drawMissionRoute, drawMovingObstacle, drawNoFlyZone, drawWorld } from "./utils/canvasHelpers.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const video = document.querySelector("#cameraVideo");
const state = new StateMachine();
const mapper = new CoordinateMapper(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
const screens = createScreens({ idle: byId("idleScreen"), calibration: byId("calibrationScreen"), countdown: byId("countdownScreen"), ended: byId("endedScreen"), calibrationState: byId("calibrationState"), calibrationButton: byId("calibrationButton"), countdownValue: byId("countdownValue"), finalScore: byId("finalScore"), finalSummary: byId("finalSummary"), finalDelivered: byId("finalDelivered"), finalCombo: byId("finalCombo"), playerName: byId("playerName") });
const hud = createHud({ timer: byId("timerValue"), score: byId("scoreValue"), delivered: byId("deliveredValue"), combo: byId("comboValue"), timerBar: byId("timerBar"), target: byId("packageTarget"), swatch: byId("packageSwatch") });
const leaderboard = createLeaderboard({ idle: byId("idleLeaderboard"), ended: byId("endedLeaderboard") });
const tracker = new HandTracker(video, (point) => { latestHandPoint = point; lastDetectedAt = performance.now(); }, (message) => { byId("trackingStatus").textContent = message; });

let session = null;
let latestHandPoint = null;
let pointerPoint = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
let lastDroneTarget = { ...pointerPoint };
let lastDetectedAt = 0;
let calibrationStartedAt = 0;
let calibrationCandidate = null;
let calibrationStableSince = 0;
let calibrationReady = false;
let countdownStartedAt = 0;
let muted = false;
let pointerMode = false;
let audioContext = null;
let lastFrame = performance.now();
let currentPilotName = "ANONYMOUS";

byId("startForm").addEventListener("submit", (event) => { event.preventDefault(); currentPilotName = byId("playerName").value || "ANONYMOUS"; beginCalibration(); });
byId("calibrationButton").addEventListener("click", startCountdown);
byId("skipCalibrationButton").addEventListener("click", () => { pointerMode = true; mapper.calibrate({ x: .5, y: .5 }); startCountdown(); });
byId("playAgainButton").addEventListener("click", beginCalibration);
byId("homeButton").addEventListener("click", () => { state.go(GAME_STATES.IDLE); screens.show("idle"); byId("playerName").value = ""; });
byId("muteButton").addEventListener("click", () => { muted = !muted; byId("muteButton").textContent = `Suara: ${muted ? "OFF" : "ON"}`; });
canvas.addEventListener("pointermove", (event) => { const rect = canvas.getBoundingClientRect(); pointerPoint = { x: (event.clientX - rect.left) / rect.width * CONFIG.CANVAS_WIDTH, y: (event.clientY - rect.top) / rect.height * CONFIG.CANVAS_HEIGHT }; });

leaderboard.renderAll();
hud.reset();
if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
requestAnimationFrame(frame);

async function beginCalibration() {
  if (state.value === GAME_STATES.ENDED) state.go(GAME_STATES.CALIBRATION); else state.go(GAME_STATES.CALIBRATION);
  latestHandPoint = null; lastDetectedAt = 0; calibrationCandidate = null; calibrationStableSince = 0; calibrationReady = false; calibrationStartedAt = performance.now(); pointerMode = false;
  screens.show("calibration"); screens.setCalibration("Menunggu tangan...", false);
  document.querySelector(".camera-panel").classList.add("calibration-mode");
  try { await tracker.start(); } catch { byId("trackingStatus").textContent = "Mode pointer aktif"; screens.setCalibration("Kamera tidak tersedia. Gerakkan mouse/touch di area game, lalu lanjutkan.", true); calibrationReady = true; }
  if (!tracker.active) pointerMode = true;
}

function startCountdown() {
  if (state.value !== GAME_STATES.CALIBRATION) return;
  if (calibrationCandidate) mapper.calibrate(calibrationCandidate); else mapper.calibrate({ x: .5, y: .5 });
  state.go(GAME_STATES.COUNTDOWN); countdownStartedAt = performance.now(); screens.show("countdown"); playTone(440, .08);
  document.querySelector(".camera-panel").classList.remove("calibration-mode");
}

function startPlaying() {
  state.go(GAME_STATES.PLAYING); session = new GameSession(); lastDroneTarget = { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 }; pointerPoint = { ...lastDroneTarget }; hud.update(session); screens.show("playing"); playTone(660, .1);
}

function finishGame() {
  if (!session || state.value !== GAME_STATES.PLAYING) return;
  state.go(GAME_STATES.ENDED); 
  leaderboard.save(currentPilotName, session.score);
  screens.setEnded(session.score, session.delivered, session.bestCombo); screens.show("ended"); leaderboard.renderAll(); playTone(180, .25); tracker.stop();
}

function frame(now) {
  const delta = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  drawWorld(ctx, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, now);
  if (state.value === GAME_STATES.CALIBRATION) updateCalibration(now);
  if (state.value === GAME_STATES.COUNTDOWN && now - countdownStartedAt >= 3000) startPlaying();
  if (state.value === GAME_STATES.COUNTDOWN) screens.setCountdown(Math.max(1, 3 - Math.floor((now - countdownStartedAt) / 1000)));
  if (state.value === GAME_STATES.PLAYING) updatePlaying(delta, now);
  if (session && state.value !== GAME_STATES.IDLE) renderSession(ctx, session, now);
  requestAnimationFrame(frame);
}

function updateCalibration(now) {
  const point = latestHandPoint;
  if (!point) return;
  const elapsed = now - calibrationStartedAt;
  if (!calibrationCandidate) calibrationCandidate = point;
  const stable = Math.hypot(point.x - calibrationCandidate.x, point.y - calibrationCandidate.y) < .035;
  if (!stable) { calibrationCandidate = point; calibrationStableSince = now; screens.setCalibration("Tahan tangan tetap...", false); return; }
  if (!calibrationStableSince) calibrationStableSince = now;
  if (elapsed > 700 && now - calibrationStableSince > 700) {
    calibrationReady = true;
    screens.setCalibration("Posisi netral terkunci. Mulai dalam 3 detik...", false, false);
    startCountdown();
  }
}

function updatePlaying(delta, now) {
  const handIsFresh = latestHandPoint && now - lastDetectedAt < CONFIG.TRACKING_LOST_TIMEOUT_MS;
  if (handIsFresh && !pointerMode) lastDroneTarget = mapper.map(latestHandPoint);
  const target = pointerMode ? pointerPoint : lastDroneTarget;
  if (!handIsFresh && !pointerMode) byId("trackingStatus").textContent = "Tangan tidak terdeteksi, posisi ditahan";
  session.update(delta, target, now);
  hud.update(session);
  if (session.remaining <= 0) finishGame();
}

function renderSession(context, game, now) {
  const targetHouse = game.houses.find((house) => house.id === game.package.targetHouseId);
  drawMissionRoute(context, game.drone, targetHouse, game.package.color, now);
  game.zones.forEach((zone) => drawNoFlyZone(context, zone, now));
  game.obstacles.forEach((obstacle) => drawMovingObstacle(context, obstacle, now));
  game.houses.forEach((house) => drawHouse(context, house));
  drawDrone(context, game.drone, now);
  drawFeedback(context, game.feedback, now, CONFIG.CANVAS_WIDTH);
}

function playTone(frequency, duration) {
  if (muted) return;
  try { audioContext ||= new AudioContext(); const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = frequency; oscillator.type = "sine"; gain.gain.setValueAtTime(.04, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration); } catch { /* Audio is optional. */ }
}

function byId(id) { return document.getElementById(id); }
