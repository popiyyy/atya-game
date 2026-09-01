const imgDrone = new Image(); imgDrone.src = "public/assets/Hexacopter.svg";
const imgEnemy = new Image(); imgEnemy.src = "public/assets/Quadcopter.svg";
const imgPad = new Image(); imgPad.src = "public/assets/Helipad.svg";
const imgBg = new Image(); imgBg.src = "public/assets/Background.svg";

export function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.closePath();
}

export function drawWorld(ctx, width, height, time) {
  if (imgBg.complete && imgBg.naturalWidth > 0) {
    ctx.drawImage(imgBg, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#8780A9";
    ctx.fillRect(0, 0, width, height);
  }
}

export function drawHouse(ctx, house) {
  if (imgPad.complete && imgPad.naturalWidth > 0) {
    const size = 100;
    ctx.drawImage(imgPad, house.x - size/2, house.y - size/2, size, size);
  }
  
  ctx.fillStyle = "#0A0614";
  ctx.fillRect(house.x - 28, house.y + 41, 56, 18);
  ctx.fillStyle = "#FDFDFB"; ctx.font = "900 11px system-ui"; ctx.textAlign = "center"; 
  ctx.fillText(house.name.toUpperCase(), house.x, house.y + 54);
}

export function drawNoFlyZone(ctx, zone, time) {
  ctx.save(); ctx.fillStyle = "#BE2C5D"; ctx.strokeStyle = "#0A0614"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.rect(zone.x, zone.y, zone.width, zone.height); ctx.fill(); ctx.stroke();
  
  ctx.save(); ctx.clip(); ctx.strokeStyle = "#1A0935"; ctx.lineWidth = 6;
  for (let x = zone.x - zone.height; x < zone.x + zone.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, zone.y + zone.height); ctx.lineTo(x + zone.height, zone.y); ctx.stroke(); }
  ctx.restore();
  
  ctx.fillStyle = "#0A0614"; ctx.fillRect(zone.x + zone.width/2 - 35, zone.y + zone.height/2 - 15, 70, 30);
  ctx.fillStyle = "#FDFDFB"; ctx.font = "900 10px system-ui"; ctx.textAlign = "center"; ctx.fillText("NO-FLY", zone.x + zone.width / 2, zone.y + zone.height / 2 + 0);
  ctx.fillStyle = "#1CB3C4"; ctx.font = "800 8px system-ui"; ctx.fillText("KEEP CLEAR", zone.x + zone.width / 2, zone.y + zone.height / 2 + 10);
  ctx.restore();
}

export function drawMissionRoute(ctx, drone, targetHouse, color, time) {
  if (!targetHouse) return;
  ctx.save(); ctx.strokeStyle = "#1A0935"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(drone.x, drone.y); ctx.lineTo(targetHouse.x, targetHouse.y); ctx.stroke(); 
  ctx.strokeStyle = "#1CB3C4"; ctx.lineWidth = 4; ctx.setLineDash([12, 12]); ctx.lineDashOffset = -(time * .05);
  ctx.beginPath(); ctx.moveTo(drone.x, drone.y); ctx.lineTo(targetHouse.x, targetHouse.y); ctx.stroke(); 
  ctx.setLineDash([]); ctx.strokeStyle = "#0A0614"; ctx.lineWidth = 4; 
  const size = 50 + Math.sin(time * .01) * 8;
  ctx.strokeRect(targetHouse.x - size, targetHouse.y - size, size*2, size*2); 
  ctx.strokeStyle = "#1CB3C4"; ctx.lineWidth = 2; ctx.strokeRect(targetHouse.x - size, targetHouse.y - size, size*2, size*2); 
  ctx.restore();
}

export function drawMovingObstacle(ctx, obstacle, time) {
  const bob = Math.sin(time * .01 + obstacle.phase) * 5;
  if (imgEnemy.complete && imgEnemy.naturalWidth > 0) {
    const size = 80;
    ctx.drawImage(imgEnemy, obstacle.x - size/2, obstacle.y + bob - size/2, size, size);
  }
  
  ctx.fillStyle = "#0A0614";
  ctx.fillRect(obstacle.x - 22, obstacle.y + 35 + bob, 44, 16);
  ctx.fillStyle = "#FDFDFB"; ctx.font = "900 10px system-ui"; ctx.textAlign = "center"; 
  ctx.fillText(obstacle.label || "DANGER", obstacle.x, obstacle.y + 46 + bob);
}

export function drawDrone(ctx, drone, time) {
  ctx.save(); ctx.translate(drone.x, drone.y); ctx.rotate(drone.angle);
  
  if (imgDrone.complete && imgDrone.naturalWidth > 0) {
    const size = 90;
    ctx.drawImage(imgDrone, -size/2, -size/2, size, size);
  }
  ctx.restore();
}

export function drawFeedback(ctx, feedback, now, width) {
  if (!feedback || feedback.expires <= now) return;
  const progress = 1 - (feedback.expires - now) / 1100;
  ctx.save(); ctx.globalAlpha = Math.min(1, (feedback.expires - now) / 220); 
  ctx.fillStyle = "#0A0614"; ctx.textAlign = "center"; ctx.fillRect(width / 2 - 150, 85 - progress * 18, 300, 50);
  ctx.fillStyle = feedback.color === "var(--coral)" ? "#BE2C5D" : (feedback.color === "var(--mint)" ? "#1CB3C4" : "#FDFDFB");
  ctx.font = "900 22px system-ui"; ctx.fillText(feedback.text, width / 2, 107 - progress * 18);
  ctx.fillStyle = "#FDFDFB"; ctx.font = "800 10px system-ui"; ctx.fillText(feedback.detail, width / 2, 125 - progress * 18);
  if (feedback.x && feedback.y) { ctx.globalAlpha *= .45; ctx.strokeStyle = "#1A0935"; ctx.lineWidth = 6; const size = 40 + progress * 56; ctx.strokeRect(feedback.x - size, feedback.y - size, size*2, size*2); }
  ctx.restore();
}
