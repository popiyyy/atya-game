import { CONFIG } from "../config.js";

const OBSTACLE_COLORS = ["#ff7b68", "#f5b84b", "#8c78e8", "#55b8c9"];

export function createMovingObstacles(houses) {
  return Array.from({ length: CONFIG.MOVING_OBSTACLE_COUNT }, (_, index) => {
    const start = randomWaypoint(houses);
    const obstacle = {
      id: index,
      x: start.x,
      y: start.y,
      targetX: start.x,
      targetY: start.y,
      radius: CONFIG.MOVING_OBSTACLE_RADIUS,
      speed: 145 + Math.random() * 75,
      followBias: [.45, .35, .50, .40][index % 4],
      followOffset: { x: (index - 1) * 85, y: index % 2 ? 70 : -55 },
      phase: Math.random() * Math.PI * 2,
      color: OBSTACLE_COLORS[index % OBSTACLE_COLORS.length],
      label: "KORLAP",
      hitUntil: 0,
      nextTurnAt: 0
    };
    chooseWaypoint(obstacle, houses, 0);
    return obstacle;
  });
}

export function updateMovingObstacles(obstacles, now, deltaSeconds, difficulty, houses, player) {
  obstacles.forEach((obstacle) => {
    const distance = Math.hypot(obstacle.targetX - obstacle.x, obstacle.targetY - obstacle.y);
    if (distance < 14 || now >= obstacle.nextTurnAt) chooseWaypoint(obstacle, houses, now);
    const followTarget = getFollowTarget(obstacle, player);
    const desiredX = obstacle.targetX * (1 - obstacle.followBias) + followTarget.x * obstacle.followBias;
    const desiredY = obstacle.targetY * (1 - obstacle.followBias) + followTarget.y * obstacle.followBias;
    const separation = getSeparation(obstacle, obstacles);
    const dx = desiredX - obstacle.x + separation.x;
    const dy = desiredY - obstacle.y + separation.y;
    const length = Math.hypot(dx, dy) || 1;
    const step = obstacle.speed * difficulty * deltaSeconds;
    obstacle.x += dx / length * Math.min(step, length);
    obstacle.y += dy / length * Math.min(step, length);
    obstacle.x = Math.max(45, Math.min(CONFIG.CANVAS_WIDTH - 45, obstacle.x));
    obstacle.y = Math.max(105, Math.min(CONFIG.CANVAS_HEIGHT - 55, obstacle.y));
  });
}

function getFollowTarget(obstacle, player) {
  if (!player) return { x: obstacle.targetX, y: obstacle.targetY };
  return { x: player.x + obstacle.followOffset.x, y: player.y + obstacle.followOffset.y };
}

function getSeparation(obstacle, obstacles) {
  let x = 0;
  let y = 0;
  obstacles.forEach((other) => {
    if (other === obstacle) return;
    const dx = obstacle.x - other.x;
    const dy = obstacle.y - other.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0 && distance < 150) {
      const strength = (150 - distance) / 150;
      x += dx / distance * strength * 95;
      y += dy / distance * strength * 95;
    }
  });
  return { x, y };
}

function chooseWaypoint(obstacle, houses, now) {
  const waypoint = randomWaypoint(houses, { x: obstacle.x, y: obstacle.y });
  obstacle.targetX = waypoint.x;
  obstacle.targetY = waypoint.y;
  obstacle.nextTurnAt = now + 1500 + Math.random() * 2500;
}

function randomWaypoint(houses, current = null) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const point = { x: 70 + Math.random() * (CONFIG.CANVAS_WIDTH - 140), y: 115 + Math.random() * (CONFIG.CANVAS_HEIGHT - 175) };
    const farEnoughFromCurrent = !current || Math.hypot(point.x - current.x, point.y - current.y) > 150;
    const clearOfHouse = houses.every((house) => Math.hypot(point.x - house.x, point.y - house.y) > 105);
    if (farEnoughFromCurrent && clearOfHouse) return point;
  }
  return { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
}
