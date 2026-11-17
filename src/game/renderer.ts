import {
  CEILING_GY,
  GROUND_Y,
  PLAYER_SCREEN_X,
  PLAYER_SIZE,
  UNIT,
  WORLD_HEIGHT,
} from './constants';
import {
  Checkpoint,
  CubeIconId,
  JellySkin,
  LevelDefinition,
  LevelObject,
  Particle,
  ShipIconId,
  TrailNode,
  UfoIconId,
  VehicleType,
  WaveIconId,
} from './types';

export interface RenderPlayerState {
  x: number; // grid units
  y: number; // grid units (bottom of player)
  vx: number;
  vy: number;
  gravityDir: 1 | -1;
  vehicle: VehicleType;
  camY: number;
  onGround: boolean;
  scaleX: number;
  scaleY: number;
  wobblePhase: number;
  wobbleAmp: number;
  rotation: number; // subtle tilt in radians
  dead: boolean;
  blinkTimer: number;
}

export interface RenderParams {
  ctx: CanvasRenderingContext2D;
  width: number; // logical canvas width
  level: LevelDefinition;
  skin: JellySkin;
  cubeIcon?: CubeIconId;
  shipIcon?: ShipIconId;
  ufoIcon?: UfoIconId;
  waveIcon?: WaveIconId;
  player: RenderPlayerState;
  time: number;
  beatPulse: number;
  shakeX: number;
  shakeY: number;
  particles: Particle[];
  trail: TrailNode[];
  checkpoints: Checkpoint[];
  triggeredIds: Set<string>;
  collectedIds: Set<string>;
  staticStage?: boolean;
}

export function gyToPx(gy: number, camY = 0): number {
  return GROUND_Y - (gy - camY) * UNIT;
}

export function renderGame(params: RenderParams) {
  const {
    ctx,
    width,
    level,
    skin,
    cubeIcon = 'classic',
    shipIcon = 'dart',
    ufoIcon = 'classic_saucer',
    waveIcon = 'razor_dart',
    player,
    time,
    beatPulse,
    shakeX,
    shakeY,
    particles,
    trail,
    checkpoints,
    triggeredIds,
    collectedIds,
    staticStage = false,
  } = params;

  const camX = staticStage ? 0 : player.x * UNIT - PLAYER_SCREEN_X;
  const camY = staticStage ? 0 : player.camY;
  const levelCeiling = staticStage ? CEILING_GY : level.ceilingGy ?? CEILING_GY;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 1. Sky Background Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  skyGrad.addColorStop(0, level.bgTop);
  skyGrad.addColorStop(1, level.bgBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-20, -20, width + 40, WORLD_HEIGHT + 40);

  // 2. Parallax Soft Background Shapes
  drawParallaxShapes(ctx, width, camX, level, beatPulse);

  // 3. Subtle Architectural Grid
  drawGrid(ctx, width, camX, camY, levelCeiling, level.gridColor, beatPulse);

  if (!staticStage) {
    // 4. Finish Line Gate
    const finishScreenX = level.lengthUnits * UNIT - camX;
    if (finishScreenX > -120 && finishScreenX < width + 120) {
      drawFinishGate(ctx, finishScreenX, camY, levelCeiling, time, level.accentColor);
    }

    // 5. Level Objects (cull offscreen)
    const minGx = (camX - 120) / UNIT;
    const maxGx = (camX + width + 120) / UNIT;

    for (const obj of level.objects) {
      const w = obj.w ?? 1;
      if (obj.gx + w < minGx || obj.gx > maxGx) continue;
      if (obj.type === 'drop' && collectedIds.has(obj.id)) continue;

      drawObject(ctx, obj, camX, camY, time, beatPulse, triggeredIds.has(obj.id), level.accentColor);
    }

    // 6. Practice Checkpoints
    for (const cp of checkpoints) {
      const cx = cp.x * UNIT - camX;
      if (cx < -40 || cx > width + 40) continue;
      const cy = gyToPx(cp.y + 0.5, camY);
      drawCheckpoint(ctx, cx, cy, camY, levelCeiling, time);
    }
  }

  // 7. Ground & Ceiling Surfaces
  drawSurfaces(ctx, width, camX, camY, levelCeiling, level, beatPulse);

  // 8. Jelly Trail (zigzag neon ribbon in Wave mode, soft jelly squares otherwise)
  if (player.vehicle === 'wave' && trail.length > 1) {
    ctx.save();
    ctx.strokeStyle = skin.innerColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const tx = trail[i].x * UNIT - camX + (PLAYER_SIZE * UNIT) / 2;
      const ty = gyToPx(trail[i].y + PLAYER_SIZE / 2, camY);
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.lineTo(player.x * UNIT - camX + (PLAYER_SIZE * UNIT) / 2, gyToPx(player.y + PLAYER_SIZE / 2, camY));
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.restore();
  } else {
    for (const node of trail) {
      const tx = node.x * UNIT - camX + (PLAYER_SIZE * UNIT) / 2;
      const ty = gyToPx(node.y + PLAYER_SIZE / 2, camY);
      ctx.save();
      ctx.globalAlpha = node.alpha * 0.45;
      ctx.fillStyle = skin.bodyColor;
      ctx.translate(tx, ty);
      ctx.scale(node.scaleX, node.scaleY);
      drawSquishyRoundedRect(ctx, -18, -18, 36, 36, 11);
      ctx.fill();
      ctx.restore();
    }
  }

  // 9. Jelly Player Cube / Ship / UFO / Wave
  if (!player.dead) {
    drawJellyPlayer(ctx, player, camX, camY, skin, cubeIcon, shipIcon, ufoIcon, waveIcon, time);
  }

  // 10. Particles
  for (const p of particles) {
    const px = p.x * UNIT - camX;
    const py = gyToPx(p.y, camY);
    if (px < -50 || px > width + 50) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
      if (p.radius > 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(px - p.radius * 0.3, py - p.radius * 0.3, p.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

export interface EditorRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  level: LevelDefinition;
  camX: number;
  camY: number;
  time: number;
  hoverCell?: { gx: number; gy: number } | null;
}

export function renderEditorScene(params: EditorRenderParams) {
  const { ctx, width, level, camX, camY, time, hoverCell } = params;
  const levelCeiling = level.ceilingGy ?? CEILING_GY;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  skyGrad.addColorStop(0, level.bgTop);
  skyGrad.addColorStop(1, level.bgBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, WORLD_HEIGHT);

  drawParallaxShapes(ctx, width, camX, level, 0);
  drawGrid(ctx, width, camX, camY, levelCeiling, 'rgba(255,255,255,0.12)', 0);

  // Subtle column numbers every 5 grid units
  const firstGx = Math.max(0, Math.floor(camX / UNIT / 5) * 5);
  const lastGx = Math.ceil((camX + width) / UNIT);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  const floorPx = gyToPx(0, camY);
  for (let gx = firstGx; gx <= lastGx; gx += 5) {
    const sx = gx * UNIT - camX;
    ctx.fillText(String(gx), sx + 4, Math.min(WORLD_HEIGHT - 10, floorPx + 18));
  }
  ctx.restore();

  // Finish Gate
  const finishScreenX = level.lengthUnits * UNIT - camX;
  if (finishScreenX > -120 && finishScreenX < width + 120) {
    drawFinishGate(ctx, finishScreenX, camY, levelCeiling, time, level.accentColor);
  }

  // Objects
  const minGx = (camX - 120) / UNIT;
  const maxGx = (camX + width + 120) / UNIT;
  for (const obj of level.objects) {
    const w = obj.w ?? 1;
    if (obj.gx + w < minGx || obj.gx > maxGx) continue;
    drawObject(ctx, obj, camX, camY, time, 0, false, level.accentColor);
  }

  drawSurfaces(ctx, width, camX, camY, levelCeiling, level, 0);

  // Hover cell highlight
  if (hoverCell && hoverCell.gx >= 0 && hoverCell.gy >= 0) {
    const hx = hoverCell.gx * UNIT - camX;
    const hy = gyToPx(hoverCell.gy + 1, camY);
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(hx + 1, hy + 1, UNIT - 2, UNIT - 2);
    ctx.restore();
  }
}

function drawParallaxShapes(
  ctx: CanvasRenderingContext2D,
  width: number,
  camX: number,
  level: LevelDefinition,
  beatPulse: number
) {
  ctx.save();
  const parallaxX = -(camX * 0.18) % 360;
  ctx.fillStyle = level.accentColor;
  ctx.globalAlpha = 0.045 + beatPulse * 0.025;

  for (let x = parallaxX - 360; x < width + 360; x += 360) {
    drawSquishyRoundedRect(ctx, x + 40, 130, 110, 340, 28);
    ctx.fill();
    drawSquishyRoundedRect(ctx, x + 190, 200, 90, 270, 24);
    ctx.fill();
  }
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  camX: number,
  camY: number,
  levelCeiling: number,
  gridColor: string,
  beatPulse: number
) {
  ctx.save();
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8 + beatPulse * 0.4;

  const floorPx = gyToPx(0, camY);
  const ceilPx = gyToPx(levelCeiling, camY);
  const topDraw = Math.max(0, ceilPx);
  const botDraw = Math.min(WORLD_HEIGHT, floorPx);

  const startX = -(camX % UNIT);
  ctx.beginPath();
  for (let x = startX; x < width; x += UNIT) {
    ctx.moveTo(x, topDraw);
    ctx.lineTo(x, botDraw);
  }
  for (let gy = 0; gy <= levelCeiling; gy += 1) {
    const y = gyToPx(gy, camY);
    if (y < -2 || y > WORLD_HEIGHT + 2) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSurfaces(
  ctx: CanvasRenderingContext2D,
  width: number,
  camX: number,
  camY: number,
  levelCeiling: number,
  level: LevelDefinition,
  beatPulse: number
) {
  const floorPx = gyToPx(0, camY);
  if (floorPx < WORLD_HEIGHT + 20) {
    const floorGrad = ctx.createLinearGradient(0, floorPx, 0, WORLD_HEIGHT);
    floorGrad.addColorStop(0, level.groundColor);
    floorGrad.addColorStop(1, '#070B14');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-10, floorPx, width + 20, WORLD_HEIGHT - floorPx + 30);

    // Glossy Floor Top Strip
    ctx.fillStyle = level.accentColor;
    ctx.globalAlpha = 0.65 + beatPulse * 0.25;
    ctx.fillRect(-10, floorPx, width + 20, 4);
    ctx.globalAlpha = 1;

    // Floor Ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    const tickOffset = -(camX % (UNIT * 2));
    ctx.beginPath();
    for (let x = tickOffset; x < width + UNIT * 2; x += UNIT * 2) {
      ctx.moveTo(x, floorPx + 12);
      ctx.lineTo(x + 28, floorPx + 12);
      ctx.moveTo(x + 48, floorPx + 28);
      ctx.lineTo(x + 82, floorPx + 28);
    }
    ctx.stroke();
  }

  const ceilPx = gyToPx(levelCeiling, camY);
  if (ceilPx > -20) {
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, Math.max(4, ceilPx));
    ceilGrad.addColorStop(0, '#070B14');
    ceilGrad.addColorStop(1, level.groundColor);
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(-10, -20, width + 20, ceilPx + 20);

    ctx.fillStyle = level.accentColor;
    ctx.globalAlpha = 0.55 + beatPulse * 0.2;
    ctx.fillRect(-10, ceilPx - 3, width + 20, 3);
    ctx.globalAlpha = 1;
  }
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: LevelObject,
  camX: number,
  camY: number,
  time: number,
  beatPulse: number,
  triggered: boolean,
  accentColor: string
) {
  const w = (obj.w ?? 1) * UNIT;
  const h = (obj.h ?? 1) * UNIT;
  const x = obj.gx * UNIT - camX;
  const bottomY = gyToPx(obj.gy, camY);
  const topY = bottomY - h;

  switch (obj.type) {
    case 'block': {
      ctx.save();
      const grad = ctx.createLinearGradient(x, topY, x, bottomY);
      grad.addColorStop(0, '#334155');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      drawSquishyRoundedRect(ctx, x + 1, topY + 1, w - 2, h - 2, 7);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.5;
      drawSquishyRoundedRect(ctx, x + 2, topY + 2, w - 4, h - 4, 6);
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.7;
      drawSquishyRoundedRect(ctx, x + 4, topY + 3, w - 8, 5, 2.5);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'spike':
    case 'spike_down': {
      const isDown = obj.type === 'spike_down';
      ctx.save();
      const tipX = x + w / 2;
      const tipY = isDown ? bottomY - 3 : topY + 3;
      const baseL = x + 4;
      const baseR = x + w - 4;
      const baseY = isDown ? topY : bottomY;

      const grad = ctx.createLinearGradient(x, topY, x, bottomY);
      grad.addColorStop(0, isDown ? '#FB7185' : '#FFF1F2');
      grad.addColorStop(0.35, '#F43F5E');
      grad.addColorStop(1, isDown ? '#FFF1F2' : '#9F1239');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(baseL, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseR, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(tipX - 6, baseY + (isDown ? 2 : -2));
      ctx.lineTo(tipX, tipY + (isDown ? -11 : 11));
      ctx.lineTo(tipX + 6, baseY + (isDown ? 2 : -2));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(baseL, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseR, baseY);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'pad_yellow':
    case 'pad_pink': {
      const isYellow = obj.type === 'pad_yellow';
      const mainColor = isYellow ? '#FACC15' : '#F472B6';
      const glowColor = isYellow ? 'rgba(250, 204, 21, 0.35)' : 'rgba(244, 114, 182, 0.35)';
      const squash = triggered ? 0.55 : 1 + beatPulse * 0.14;
      const padH = Math.max(8, 16 * squash);

      ctx.save();
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, bottomY - 4, w * 0.48, padH * 0.9, 0, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, bottomY, w * 0.42, padH, 0, Math.PI, 0);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, bottomY - 2, w * 0.25, padH * 0.55, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'orb_yellow':
    case 'orb_cyan': {
      const isCyan = obj.type === 'orb_cyan';
      const color = isCyan ? '#22D3EE' : '#FACC15';
      const cx = x + w / 2;
      const cy = bottomY - h / 2;
      const pulse = 1 + beatPulse * 0.12 + (triggered ? 0.22 : 0);
      const r = 17 * pulse;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = triggered ? 0.35 : 0.9;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 2.4);
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = color;
      ctx.globalAlpha = triggered ? 0.4 : 0.85;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.95;
      if (isCyan) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 6, cy + 2);
        ctx.lineTo(cx - 6, cy + 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'portal_gravity_flip':
    case 'portal_gravity_normal':
    case 'portal_speed_fast':
    case 'portal_speed_normal':
    case 'portal_ship':
    case 'portal_cube':
    case 'portal_ufo':
    case 'portal_wave': {
      const isGravFlip = obj.type === 'portal_gravity_flip';
      const isGravNorm = obj.type === 'portal_gravity_normal';
      const isSpeedFast = obj.type === 'portal_speed_fast';
      const isShip = obj.type === 'portal_ship';
      const isCube = obj.type === 'portal_cube';
      const isUfo = obj.type === 'portal_ufo';
      const isWave = obj.type === 'portal_wave';
      const color = isGravFlip
        ? '#22D3EE'
        : isGravNorm
        ? '#A78BFA'
        : isSpeedFast
        ? '#F59E0B'
        : isShip
        ? '#F472B6'
        : isCube
        ? '#4ADE80'
        : isUfo
        ? '#FB923C'
        : isWave
        ? '#06B6D4'
        : '#34D399';

      ctx.save();
      const gateW = 24;
      const gateX = x + (w - gateW) / 2;

      const grad = ctx.createLinearGradient(gateX, topY, gateX + gateW, topY);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35 + Math.sin(time * 5) * 0.08;
      ctx.fillRect(gateX - 10, topY, gateW + 20, h);

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, topY + 6);
      ctx.lineTo(x + w / 2, bottomY - 6);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const count = 4;
      for (let i = 0; i < count; i++) {
        const frac = ((i / count + time * (isGravFlip ? -0.35 : 0.35)) % 1 + 1) % 1;
        const cy = topY + 36 + frac * Math.max(40, h - 72);
        const cx = x + w / 2;
        ctx.beginPath();
        if (isGravFlip) {
          ctx.moveTo(cx - 8, cy + 5);
          ctx.lineTo(cx, cy - 5);
          ctx.lineTo(cx + 8, cy + 5);
        } else if (isGravNorm) {
          ctx.moveTo(cx - 8, cy - 5);
          ctx.lineTo(cx, cy + 5);
          ctx.lineTo(cx + 8, cy - 5);
        } else if (isShip) {
          ctx.moveTo(cx - 8, cy + 3);
          ctx.lineTo(cx + 8, cy);
          ctx.lineTo(cx - 5, cy - 6);
          ctx.closePath();
        } else if (isCube) {
          ctx.rect(cx - 6, cy - 6, 12, 12);
        } else if (isUfo) {
          ctx.ellipse(cx, cy + 2, 9, 4, 0, 0, Math.PI * 2);
          ctx.moveTo(cx - 5, cy);
          ctx.arc(cx, cy, 5, Math.PI, 0);
        } else if (isWave) {
          ctx.moveTo(cx - 8, cy + 5);
          ctx.lineTo(cx, cy - 5);
          ctx.lineTo(cx + 8, cy + 5);
        } else if (isSpeedFast) {
          ctx.moveTo(cx - 6, cy - 7);
          ctx.lineTo(cx + 3, cy);
          ctx.lineTo(cx - 6, cy + 7);
          ctx.moveTo(cx + 1, cy - 7);
          ctx.lineTo(cx + 10, cy);
          ctx.lineTo(cx + 1, cy + 7);
        } else {
          ctx.moveTo(cx - 4, cy - 6);
          ctx.lineTo(cx + 5, cy);
          ctx.lineTo(cx - 4, cy + 6);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'drop': {
      const cx = x + w / 2;
      const bob = Math.sin(time * 4 + obj.gx) * 4;
      const cy = bottomY - h / 2 + bob;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#FDE047';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.quadraticCurveTo(10, 0, 8, 6);
      ctx.quadraticCurveTo(0, 13, -8, 6);
      ctx.quadraticCurveTo(-10, 0, 0, -11);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(-2.5, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  camY: number,
  levelCeiling: number,
  time: number
) {
  ctx.save();
  const bob = Math.sin(time * 4) * 3;
  const topPx = gyToPx(levelCeiling, camY);
  const botPx = gyToPx(0, camY);

  ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, topPx);
  ctx.lineTo(cx, botPx);
  ctx.stroke();

  ctx.translate(cx, cy + bob);
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(11, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(-11, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#D1FAE5';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFinishGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  camY: number,
  levelCeiling: number,
  time: number,
  accentColor: string
) {
  ctx.save();
  const topPx = gyToPx(levelCeiling, camY);
  const botPx = gyToPx(0, camY);
  const gateH = botPx - topPx;

  const grad = ctx.createLinearGradient(x - 16, 0, x + 28, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.5, accentColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.32 + Math.sin(time * 4) * 0.08;
  ctx.fillRect(x - 16, topPx, 44, gateH);

  ctx.globalAlpha = 0.9;
  const sq = 16;
  const rows = Math.floor(gateH / sq);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#0F172A';
      ctx.fillRect(x + c * sq, topPx + r * sq, sq, sq);
    }
  }
  ctx.restore();
}

function drawShipHull(
  ctx: CanvasRenderingContext2D,
  shipIcon: ShipIconId,
  skin: JellySkin,
  time: number
) {
  ctx.save();
  // Thruster exhaust flame
  ctx.fillStyle = skin.innerColor;
  ctx.globalAlpha = 0.78 + Math.sin(time * 28) * 0.2;
  ctx.beginPath();
  ctx.moveTo(-26, 2);
  ctx.lineTo(-42 - Math.sin(time * 32) * 5, 7);
  ctx.lineTo(-26, 13);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.96;
  ctx.strokeStyle = skin.highlightColor;
  ctx.lineWidth = 2;

  if (shipIcon === 'shark') {
    // Shark fin hull with jagged nose
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-26, 16);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-14, -10);
    ctx.lineTo(-8, 2);
    ctx.lineTo(18, 2);
    ctx.lineTo(31, 9);
    ctx.lineTo(20, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Teeth accent
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(18, 12);
    ctx.lineTo(21, 16);
    ctx.lineTo(24, 12);
    ctx.fill();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-18, 8, 30, 5, 2.5);
    ctx.fill();
  } else if (shipIcon === 'rocket') {
    // Sleek twin-fin rocket
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(-28, 17);
    ctx.lineTo(-32, -2);
    ctx.lineTo(-16, 4);
    ctx.lineTo(14, 1);
    ctx.lineTo(33, 10);
    ctx.lineTo(22, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.moveTo(22, 5);
    ctx.lineTo(33, 10);
    ctx.lineTo(22, 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-20, 9, 34, 5, 2.5);
    ctx.fill();
  } else if (shipIcon === 'dragon') {
    // Angular winged dragon vessel
    ctx.fillStyle = '#1E1B3A';
    ctx.beginPath();
    ctx.moveTo(-28, 15);
    ctx.lineTo(-22, -6);
    ctx.lineTo(-10, 4);
    ctx.lineTo(12, 0);
    ctx.lineTo(24, -7);
    ctx.lineTo(30, 9);
    ctx.lineTo(20, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-14, 9);
    ctx.lineTo(18, 9);
    ctx.lineTo(14, 14);
    ctx.lineTo(-18, 14);
    ctx.closePath();
    ctx.fill();
  } else if (shipIcon === 'jet') {
    // Sleek twin-wing fighter jet hull
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-28, 16);
    ctx.lineTo(-22, -6);
    ctx.lineTo(-4, 2);
    ctx.lineTo(18, 2);
    ctx.lineTo(34, 10);
    ctx.lineTo(22, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-14, 10);
    ctx.lineTo(20, 10);
    ctx.lineTo(12, 15);
    ctx.lineTo(-18, 15);
    ctx.closePath();
    ctx.fill();
  } else {
    // Classic sleek dart hull
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(-26, 2);
    ctx.quadraticCurveTo(-8, -4, 18, 2);
    ctx.quadraticCurveTo(32, 8, 24, 18);
    ctx.lineTo(-22, 18);
    ctx.quadraticCurveTo(-30, 12, -26, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-16, 9, 32, 5, 2.5);
    ctx.fill();
  }

  ctx.restore();
}

function drawUfoHull(
  ctx: CanvasRenderingContext2D,
  ufoIcon: UfoIconId,
  skin: JellySkin,
  time: number
) {
  ctx.save();
  // Soft pulsing hover beam underneath saucer
  const beamAlpha = 0.22 + Math.sin(time * 12) * 0.08;
  ctx.fillStyle = skin.innerColor;
  ctx.globalAlpha = beamAlpha;
  ctx.beginPath();
  ctx.moveTo(-14, 16);
  ctx.lineTo(14, 16);
  ctx.lineTo(20, 26);
  ctx.lineTo(-20, 26);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.96;
  ctx.strokeStyle = skin.highlightColor;
  ctx.lineWidth = 2;

  if (ufoIcon === 'cyber_pod') {
    // Glass dome + angular cyber ring
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(0, 3, 19, Math.PI, 0);
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-30, 11);
    ctx.lineTo(-18, 4);
    ctx.lineTo(18, 4);
    ctx.lineTo(30, 11);
    ctx.lineTo(22, 18);
    ctx.lineTo(-22, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.bodyColor;
    ctx.fillRect(-16, 10, 32, 4);
  } else if (ufoIcon === 'jelly_dome') {
    // Bubble dome + translucent gel base
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(0, 4, 21, Math.PI, 0);
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 12, 27, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Classic Saucer
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(0, 3, 21, Math.PI, 0);
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(0, 12, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.arc(-14, 12, 2.6, 0, Math.PI * 2);
    ctx.arc(0, 12, 2.6, 0, Math.PI * 2);
    ctx.arc(14, 12, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWaveCraft(
  ctx: CanvasRenderingContext2D,
  waveIcon: WaveIconId,
  skin: JellySkin
) {
  ctx.save();
  ctx.strokeStyle = skin.highlightColor;
  ctx.lineWidth = 2.2;
  const grad = ctx.createLinearGradient(-18, -14, 20, 14);
  grad.addColorStop(0, skin.innerColor);
  grad.addColorStop(1, skin.bodyColor);
  ctx.fillStyle = grad;

  if (waveIcon === 'crystal_arrow') {
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-4, -14);
    ctx.lineTo(-20, -6);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-20, 6);
    ctx.lineTo(-4, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (waveIcon === 'jelly_bolt') {
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(0, -15);
    ctx.lineTo(-18, -11);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-18, 11);
    ctx.lineTo(0, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Classic razor dart
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-17, -14);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-17, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Glowing core dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(3, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawJellyFace(
  ctx: CanvasRenderingContext2D,
  cubeIcon: CubeIconId,
  player: RenderPlayerState,
  skin: JellySkin
) {
  ctx.globalAlpha = 1;
  const eyeY = player.gravityDir === 1 ? -3 : 3;
  const isBlinking = player.blinkTimer > 0 && player.blinkTimer < 0.11;
  const lookY = Math.max(-2.5, Math.min(2.5, -player.vy * 0.14));

  if (cubeIcon === 'cyclops') {
    if (isBlinking) {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3, eyeY);
      ctx.lineTo(13, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(5, eyeY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(7, eyeY + lookY * 0.8, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(8.5, eyeY + lookY * 0.8 - 1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (cubeIcon === 'visor') {
    ctx.fillStyle = '#0F172A';
    drawSquishyRoundedRect(ctx, -6, eyeY - 6, 26, 11, 4);
    ctx.fill();
    ctx.fillStyle = skin.highlightColor;
    drawSquishyRoundedRect(ctx, -2, eyeY - 3 + lookY * 0.4, 18, 4.5, 2);
    ctx.fill();
    return;
  }

  if (cubeIcon === 'ninja') {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-23, -15, 46, 7);
    ctx.fillStyle = skin.highlightColor;
    ctx.beginPath();
    ctx.moveTo(-23, -12);
    ctx.lineTo(-30, -16);
    ctx.lineTo(-27, -9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-1, eyeY - 2, 8, 5);
    ctx.fillRect(10, eyeY - 2, 7, 5);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(3, eyeY - 1, 3.2, 3.2);
    ctx.fillRect(13, eyeY - 1, 3.2, 3.2);
    return;
  }

  if (cubeIcon === 'star') {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? 15 : 6.5;
      const sx = -4 + Math.cos(ang) * rad;
      const sy = 5 + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (cubeIcon === 'crown') {
    ctx.save();
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#FEF9C3';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-11, -22);
    ctx.lineTo(-13, -32);
    ctx.lineTo(-5, -26);
    ctx.lineTo(0, -34);
    ctx.lineTo(5, -26);
    ctx.lineTo(13, -32);
    ctx.lineTo(11, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (isBlinking) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, eyeY);
    ctx.lineTo(5, eyeY);
    ctx.moveTo(9, eyeY);
    ctx.lineTo(15, eyeY);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(2, eyeY, 5, 5.8, 0, 0, Math.PI * 2);
    ctx.ellipse(13, eyeY, 4.4, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(3.6, eyeY + lookY, 2.5, 0, Math.PI * 2);
    ctx.arc(14.4, eyeY + lookY, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(4.4, eyeY + lookY - 1, 0.9, 0, Math.PI * 2);
    ctx.arc(15.2, eyeY + lookY - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawJellyPlayer(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  camX: number,
  camY: number,
  skin: JellySkin,
  cubeIcon: CubeIconId,
  shipIcon: ShipIconId,
  ufoIcon: UfoIconId,
  waveIcon: WaveIconId,
  time: number
) {
  const sizePx = PLAYER_SIZE * UNIT;
  const cx = player.x * UNIT - camX + sizePx / 2;
  const cy = gyToPx(player.y + PLAYER_SIZE / 2, camY);

  const anchorOffsetY = player.onGround
    ? player.gravityDir * (sizePx / 2) * (1 - player.scaleY)
    : 0;

  ctx.save();
  ctx.translate(cx, cy + anchorOffsetY);
  ctx.rotate(player.rotation);

  if (player.vehicle === 'wave') {
    drawWaveCraft(ctx, waveIcon, skin);
    ctx.restore();
    return;
  }

  if (player.vehicle === 'ship') {
    drawShipHull(ctx, shipIcon, skin, time);
    ctx.translate(0, -7);
    ctx.scale(player.scaleX * 0.68, player.scaleY * 0.68);
  } else if (player.vehicle === 'ufo') {
    drawUfoHull(ctx, ufoIcon, skin, time);
    ctx.translate(0, -6);
    ctx.scale(player.scaleX * 0.62, player.scaleY * 0.62);
  } else {
    ctx.scale(player.scaleX, player.scaleY);
  }

  const half = sizePx / 2;
  const wobble = Math.sin(player.wobblePhase) * player.wobbleAmp * 6;

  ctx.beginPath();
  const r = 11;
  ctx.moveTo(-half + r, -half);
  ctx.quadraticCurveTo(0, -half - wobble, half - r, -half);
  ctx.quadraticCurveTo(half, -half, half, -half + r);
  ctx.quadraticCurveTo(half + wobble * 0.7, 0, half, half - r);
  ctx.quadraticCurveTo(half, half, half - r, half);
  ctx.quadraticCurveTo(0, half + wobble * 0.5, -half + r, half);
  ctx.quadraticCurveTo(-half, half, -half, half - r);
  ctx.quadraticCurveTo(-half - wobble * 0.7, 0, -half, -half + r);
  ctx.quadraticCurveTo(-half, -half, -half + r, -half);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(-half, -half, half, half);
  bodyGrad.addColorStop(0, skin.innerColor);
  bodyGrad.addColorStop(0.55, skin.bodyColor);
  bodyGrad.addColorStop(1, skin.bodyColor);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = skin.highlightColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.globalAlpha = 0.38;
  ctx.fillStyle = skin.innerColor;
  drawSquishyRoundedRect(ctx, -half + 8, -half + 8, sizePx - 16, sizePx - 16, 7);
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = skin.highlightColor;
  const b1Y = Math.sin(time * 4.5) * 2;
  ctx.beginPath();
  ctx.arc(-11, 9 + b1Y, 2.8, 0, Math.PI * 2);
  ctx.arc(10, 12 - b1Y, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-10, -13, 7, 3, -0.35, 0, Math.PI * 2);
  ctx.fill();

  drawJellyFace(ctx, cubeIcon, player, skin);

  ctx.restore();
}

function drawSquishyRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
