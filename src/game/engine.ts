import { audioEngine } from './audio';
import {
  CEILING_GY,
  GRAVITY,
  JUMP_VEL,
  ORB_CYAN_IMPULSE,
  ORB_YELLOW_VEL,
  PAD_PINK_VEL,
  PAD_YELLOW_VEL,
  PLAYER_SIZE,
} from './constants';
import {
  Checkpoint,
  JellySkin,
  LevelDefinition,
  Particle,
  TrailNode,
  VehicleType,
} from './types';

export interface EngineState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravityDir: 1 | -1;
  speedMult: number;
  vehicle: VehicleType;
  camY: number;
  onGround: boolean;
  dead: boolean;
  deathTimer: number;
  completed: boolean;

  // Soft-body spring dynamics
  scaleX: number;
  scaleY: number;
  scaleVelX: number;
  scaleVelY: number;
  wobblePhase: number;
  wobbleAmp: number;
  rotation: number;
  blinkTimer: number;

  // Screen shake & FX
  shakeTimer: number;
  shakeIntensity: number;
  particles: Particle[];
  trail: TrailNode[];
  trailAccum: number;

  // Input buffering & object state
  orbBufferTimer: number;
  triggeredIds: Set<string>;
  collectedIds: Set<string>;
  dropsCollected: number;
  checkpoints: Checkpoint[];
  autoCheckpointTimer: number;
  time: number;
}

export function getLevelCeiling(level: LevelDefinition): number {
  return level.ceilingGy ?? CEILING_GY;
}

function computeTargetCamY(y: number, level: LevelDefinition): number {
  const ceil = getLevelCeiling(level);
  if (ceil <= CEILING_GY) return 0;
  const maxCamY = Math.max(0, ceil - CEILING_GY - 0.5);
  return Math.max(0, Math.min(maxCamY, y - 3.2));
}

export function createEngineState(level: LevelDefinition, startCheckpoint?: Checkpoint): EngineState {
  const startY = startCheckpoint ? startCheckpoint.y : 0;
  return {
    x: startCheckpoint ? startCheckpoint.x : 0,
    y: startY,
    vx: level.baseSpeed * (startCheckpoint ? startCheckpoint.speedMult : 1),
    vy: startCheckpoint ? startCheckpoint.vy : 0,
    gravityDir: startCheckpoint ? startCheckpoint.gravityDir : 1,
    speedMult: startCheckpoint ? startCheckpoint.speedMult : 1,
    vehicle: startCheckpoint ? startCheckpoint.vehicle : 'cube',
    camY: computeTargetCamY(startY, level),
    onGround: !startCheckpoint,
    dead: false,
    deathTimer: 0,
    completed: false,

    scaleX: 1,
    scaleY: 1,
    scaleVelX: 0,
    scaleVelY: 0,
    wobblePhase: 0,
    wobbleAmp: 0.25,
    rotation: 0,
    blinkTimer: 2.4,

    shakeTimer: 0,
    shakeIntensity: 0,
    particles: [],
    trail: [],
    trailAccum: 0,

    orbBufferTimer: 0,
    triggeredIds: new Set<string>(),
    collectedIds: new Set<string>(),
    dropsCollected: 0,
    checkpoints: [],
    autoCheckpointTimer: 0,
    time: 0,
  };
}

export interface StepCallbacks {
  onCrash: () => void;
  onRespawn: () => void;
  onComplete: () => void;
  onDropCollected: (count: number) => void;
}

export function spawnParticles(
  state: EngineState,
  x: number,
  y: number,
  color: string,
  count: number,
  speedScale = 1,
  bounces = true
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (2.5 + Math.random() * 8.5) * speedScale;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd + (bounces ? 3.5 : 0),
      radius: 3 + Math.random() * 5.5,
      color,
      alpha: 0.95,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.4,
      bounces,
    });
  }
}

export function spawnRing(state: EngineState, x: number, y: number, color: string) {
  state.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 12,
    color,
    alpha: 0.95,
    life: 0,
    maxLife: 0.28,
    ring: true,
  });
}

export function stepEngine(
  state: EngineState,
  level: LevelDefinition,
  skin: JellySkin,
  dt: number,
  holdJump: boolean,
  justPressedJump: boolean,
  isDemo: boolean,
  practiceMode: boolean,
  callbacks: StepCallbacks
) {
  state.time += dt;

  // Update blink animation
  state.blinkTimer -= dt;
  if (state.blinkTimer <= 0) {
    state.blinkTimer = 2.2 + Math.random() * 2.5;
  }

  // Update particles even while dead
  updateParticles(state, dt);

  // Update screen shake
  if (state.shakeTimer > 0) {
    state.shakeTimer = Math.max(0, state.shakeTimer - dt);
  }

  // Handle death cooldown -> instant respawn
  if (state.dead) {
    state.deathTimer -= dt;
    if (state.deathTimer <= 0) {
      callbacks.onRespawn();
    }
    return;
  }

  if (state.completed) {
    return;
  }

  // Buffer jump presses for crisp orb timing
  if (justPressedJump) {
    state.orbBufferTimer = 0.13;
  } else {
    state.orbBufferTimer = Math.max(0, state.orbBufferTimer - dt);
  }

  // Demo autopilot decision
  let effectiveHold = holdJump;
  if (isDemo) {
    const ai = decideDemoJump(state, level);
    effectiveHold = ai.hold;
    if (ai.tapOrb) {
      state.orbBufferTimer = 0.1;
    }
  }

  // Practice auto-checkpoint every ~4.5 seconds on safe ground
  if (practiceMode && !isDemo && state.onGround) {
    state.autoCheckpointTimer += dt;
    if (state.autoCheckpointTimer >= 4.2) {
      state.autoCheckpointTimer = 0;
      placeCheckpoint(state, true);
    }
  }

  // Sub-step physics for rock-solid collision precision
  const substeps = 2;
  const subDt = dt / substeps;
  const levelCeiling = getLevelCeiling(level);
  let ufoTapConsumed = false;

  for (let s = 0; s < substeps; s++) {
    if (state.dead || state.completed) break;

    const wasOnGround = state.onGround;
    const prevY = state.y;
    const prevVy = state.vy;

    state.vx = level.baseSpeed * state.speedMult;
    state.x += state.vx * subDt;

    if (state.vehicle === 'cube') {
      // Jump if grounded and holding jump
      if (state.onGround && effectiveHold) {
        state.vy = JUMP_VEL * state.gravityDir;
        state.onGround = false;
        state.scaleX = 0.72;
        state.scaleY = 1.34;
        state.scaleVelX = 0;
        state.scaleVelY = 0;
        state.wobbleAmp = 0.95;
        if (!isDemo) {
          audioEngine.playJump();
        }
        spawnParticles(
          state,
          state.x + 0.5,
          state.gravityDir === 1 ? state.y + 0.1 : state.y + 0.9,
          skin.innerColor,
          5,
          0.55,
          false
        );
      }

      // Gravity integration
      state.vy -= GRAVITY * state.gravityDir * subDt;
      state.vy = Math.max(-34, Math.min(34, state.vy));
      state.y += state.vy * subDt;
    } else if (state.vehicle === 'ship') {
      // SHIP MODE: smooth jetpack/ship thrust against lighter gravity
      const shipAccel = effectiveHold ? 33 * state.gravityDir : -27 * state.gravityDir;
      state.vy += shipAccel * subDt;
      state.vy = Math.max(-10.5, Math.min(10.5, state.vy));
      state.y += state.vy * subDt;

      if (effectiveHold && Math.random() < 0.35) {
        spawnParticles(
          state,
          state.x + 0.15,
          state.y + 0.35,
          skin.innerColor,
          1,
          0.35,
          false
        );
      }
    } else if (state.vehicle === 'ufo') {
      // UFO MODE: Flappy mid-air hop on each fresh tap/press!
      const ufoHopPressed = justPressedJump && !ufoTapConsumed;
      if (ufoHopPressed) {
        ufoTapConsumed = true;
        state.vy = 13.8 * state.gravityDir;
        state.onGround = false;
        state.scaleX = 1.24;
        state.scaleY = 0.78;
        state.wobbleAmp = 0.85;
        if (!isDemo) {
          audioEngine.playJump();
        }
        spawnParticles(
          state,
          state.x + 0.5,
          state.gravityDir === 1 ? state.y - 0.05 : state.y + 1.05,
          skin.highlightColor,
          6,
          0.6,
          false
        );
      }
      state.vy -= GRAVITY * 0.62 * state.gravityDir * subDt;
      state.vy = Math.max(-14.5, Math.min(15.5, state.vy));
      state.y += state.vy * subDt;
    } else {
      // WAVE MODE: Zero-inertia crisp diagonal zigzag (hold = up, release = down)
      const waveSlope = 0.92;
      state.vy = (effectiveHold ? 1 : -1) * state.vx * waveSlope * state.gravityDir;
      state.y += state.vy * subDt;
      if (Math.random() < 0.4) {
        spawnParticles(state, state.x + 0.1, state.y + 0.5, skin.innerColor, 1, 0.25, false);
      }
    }

    state.onGround = false;

    // Floor & Ceiling bounds
    if (state.gravityDir === 1) {
      if (state.y <= 0) {
        state.y = 0;
        state.vy = 0;
        state.onGround = true;
      } else if (state.y + PLAYER_SIZE >= levelCeiling) {
        state.y = levelCeiling - PLAYER_SIZE;
        if (state.vy > 0) state.vy = state.vehicle === 'ship' ? 0 : -1.5;
      }
    } else {
      if (state.y + PLAYER_SIZE >= levelCeiling) {
        state.y = levelCeiling - PLAYER_SIZE;
        state.vy = 0;
        state.onGround = true;
      } else if (state.y <= 0) {
        state.y = 0;
        if (state.vy < 0) state.vy = state.vehicle === 'ship' ? 0 : 1.5;
      }
    }

    // Check level objects near player
    for (const obj of level.objects) {
      const w = obj.w ?? 1;
      const h = obj.h ?? 1;
      if (obj.gx + w < state.x - 1.5 || obj.gx > state.x + 2.5) continue;

      if (obj.type === 'block') {
        const overlapX = state.x + 0.92 > obj.gx && state.x + 0.08 < obj.gx + w;
        const overlapY = state.y + 1.001 >= obj.gy && state.y - 0.001 <= obj.gy + h;
        if (overlapX && overlapY) {
          if (state.gravityDir === 1 && prevY >= obj.gy + h - 0.36 && state.vy <= 0) {
            state.y = obj.gy + h;
            state.vy = 0;
            state.onGround = true;
          } else if (
            state.gravityDir === -1 &&
            prevY + PLAYER_SIZE <= obj.gy + 0.36 &&
            state.vy >= 0
          ) {
            state.y = obj.gy - PLAYER_SIZE;
            state.vy = 0;
            state.onGround = true;
          } else if (state.gravityDir === 1 && prevY + PLAYER_SIZE <= obj.gy + 0.28 && state.vy > 0) {
            state.y = obj.gy - PLAYER_SIZE;
            state.vy = -1.5;
            state.scaleX = 1.25;
            state.scaleY = 0.78;
          } else if (state.gravityDir === -1 && prevY >= obj.gy + h - 0.28 && state.vy < 0) {
            state.y = obj.gy + h;
            state.vy = 1.5;
            state.scaleX = 1.25;
            state.scaleY = 0.78;
          } else if (state.y + 0.92 > obj.gy && state.y + 0.08 < obj.gy + h) {
            triggerCrash(state, skin, isDemo, callbacks);
            break;
          }
        }
      } else if (obj.type === 'spike' || obj.type === 'spike_down') {
        const isDown = obj.type === 'spike_down';
        const tipInset = Math.min(0.26, h * 0.35);
        const sx1 = obj.gx + 0.27;
        const sx2 = obj.gx + w - 0.27;
        const sy1 = isDown ? obj.gy + tipInset : obj.gy;
        const sy2 = isDown ? obj.gy + h : obj.gy + h - tipInset;
        if (
          state.x + 0.88 > sx1 &&
          state.x + 0.12 < sx2 &&
          state.y + 0.92 > sy1 &&
          state.y + 0.08 < sy2
        ) {
          triggerCrash(state, skin, isDemo, callbacks);
          break;
        }
      } else if (obj.type === 'pad_yellow' || obj.type === 'pad_pink') {
        if (
          !state.triggeredIds.has(obj.id) &&
          state.x + 0.95 > obj.gx &&
          state.x + 0.05 < obj.gx + w &&
          state.y + 0.9 > obj.gy &&
          state.y < obj.gy + 0.55
        ) {
          state.triggeredIds.add(obj.id);
          const vel = obj.type === 'pad_yellow' ? PAD_YELLOW_VEL : PAD_PINK_VEL;
          state.vy = vel * state.gravityDir;
          state.onGround = false;
          state.scaleX = 0.65;
          state.scaleY = 1.44;
          state.wobbleAmp = 1.2;
          if (!isDemo) audioEngine.playPadBounce();
          spawnParticles(
            state,
            obj.gx + 0.5,
            obj.gy + 0.3,
            obj.type === 'pad_yellow' ? '#FACC15' : '#F472B6',
            10,
            0.9,
            true
          );
        }
      } else if (obj.type === 'orb_yellow' || obj.type === 'orb_cyan') {
        const dx = state.x + 0.5 - (obj.gx + 0.5);
        const dy = state.y + 0.5 - (obj.gy + 0.5);
        if (
          !state.triggeredIds.has(obj.id) &&
          state.orbBufferTimer > 0 &&
          dx * dx + dy * dy <= 1.2 * 1.2
        ) {
          state.triggeredIds.add(obj.id);
          state.orbBufferTimer = 0;
          if (obj.type === 'orb_yellow') {
            state.vy = ORB_YELLOW_VEL * state.gravityDir;
            if (!isDemo) audioEngine.playOrb();
            spawnRing(state, obj.gx + 0.5, obj.gy + 0.5, '#FACC15');
          } else {
            state.gravityDir = state.gravityDir === 1 ? -1 : 1;
            state.vy = ORB_CYAN_IMPULSE * state.gravityDir;
            if (!isDemo) audioEngine.playFlip();
            spawnRing(state, obj.gx + 0.5, obj.gy + 0.5, '#22D3EE');
          }
          state.onGround = false;
          state.scaleX = 0.7;
          state.scaleY = 1.36;
          state.wobbleAmp = 1.0;
        }
      } else if (
        obj.type === 'portal_gravity_flip' ||
        obj.type === 'portal_gravity_normal' ||
        obj.type === 'portal_speed_fast' ||
        obj.type === 'portal_speed_normal' ||
        obj.type === 'portal_ship' ||
        obj.type === 'portal_cube' ||
        obj.type === 'portal_ufo' ||
        obj.type === 'portal_wave'
      ) {
        if (
          !state.triggeredIds.has(obj.id) &&
          state.x + 0.85 > obj.gx &&
          state.x + 0.15 < obj.gx + w &&
          state.y + 0.9 > obj.gy &&
          state.y + 0.1 < obj.gy + h
        ) {
          state.triggeredIds.add(obj.id);
          if (obj.type === 'portal_gravity_flip' && state.gravityDir !== -1) {
            state.gravityDir = -1;
            state.vy *= 0.35;
            state.onGround = false;
            state.scaleX = 0.78;
            state.scaleY = 1.28;
            if (!isDemo) audioEngine.playFlip();
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#22D3EE', 12, 0.8, false);
          } else if (obj.type === 'portal_gravity_normal' && state.gravityDir !== 1) {
            state.gravityDir = 1;
            state.vy *= 0.35;
            state.onGround = false;
            state.scaleX = 0.78;
            state.scaleY = 1.28;
            if (!isDemo) audioEngine.playFlip();
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#A78BFA', 12, 0.8, false);
          } else if (obj.type === 'portal_speed_fast') {
            state.speedMult = 1.3;
            state.scaleX = 1.28;
            state.scaleY = 0.76;
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#F59E0B', 10, 0.9, false);
          } else if (obj.type === 'portal_speed_normal') {
            state.speedMult = 1.0;
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#34D399', 10, 0.7, false);
          } else if (obj.type === 'portal_ship' && state.vehicle !== 'ship') {
            state.vehicle = 'ship';
            state.vy *= 0.35;
            state.onGround = false;
            state.scaleX = 1.22;
            state.scaleY = 0.82;
            if (!isDemo) audioEngine.playFlip();
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#F472B6', 14, 0.9, false);
          } else if (obj.type === 'portal_cube' && state.vehicle !== 'cube') {
            state.vehicle = 'cube';
            state.vy *= 0.5;
            state.scaleX = 0.82;
            state.scaleY = 1.22;
            if (!isDemo) audioEngine.playFlip();
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#34D399', 14, 0.9, false);
          } else if (obj.type === 'portal_ufo' && state.vehicle !== 'ufo') {
            state.vehicle = 'ufo';
            state.vy *= 0.35;
            state.onGround = false;
            state.scaleX = 1.2;
            state.scaleY = 0.82;
            if (!isDemo) audioEngine.playFlip();
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#FB923C', 14, 0.9, false);
          } else if (obj.type === 'portal_wave' && state.vehicle !== 'wave') {
            state.vehicle = 'wave';
            state.vy = 0;
            state.onGround = false;
            state.scaleX = 1.25;
            state.scaleY = 0.78;
            if (!isDemo) audioEngine.playFlip();
            spawnParticles(state, state.x + 0.5, state.y + 0.5, '#06B6D4', 14, 0.9, false);
          }
        }
      } else if (obj.type === 'drop') {
        const dx = state.x + 0.5 - (obj.gx + 0.5);
        const dy = state.y + 0.5 - (obj.gy + 0.5);
        if (!state.collectedIds.has(obj.id) && dx * dx + dy * dy <= 0.95 * 0.95) {
          state.collectedIds.add(obj.id);
          state.dropsCollected += 1;
          if (!isDemo) {
            audioEngine.playDrop();
            callbacks.onDropCollected(state.dropsCollected);
          }
          spawnParticles(state, obj.gx + 0.5, obj.gy + 0.5, '#FDE047', 8, 0.6, false);
        }
      }
    }

    // Landing squash trigger!
    if (!wasOnGround && state.onGround) {
      const impact = Math.min(1, Math.abs(prevVy) / 22);
      if (impact > 0.15) {
        state.scaleX = 1 + 0.42 * impact;
        state.scaleY = 1 - 0.35 * impact;
        state.wobbleAmp = 0.7 + 0.5 * impact;
        if (!isDemo) {
          audioEngine.playLand(impact);
        }
        spawnParticles(
          state,
          state.x + 0.5,
          state.gravityDir === 1 ? state.y + 0.05 : state.y + 0.95,
          skin.innerColor,
          Math.round(4 + impact * 6),
          0.5 + impact * 0.4,
          true
        );
      }
    }

    // Check level finish
    if (state.x >= level.lengthUnits) {
      if (isDemo) {
        // Loop demo seamlessly
        state.x = 0;
        state.y = 0;
        state.vy = 0;
        state.gravityDir = 1;
        state.speedMult = 1;
        state.vehicle = 'cube';
        state.camY = 0;
        state.triggeredIds.clear();
        state.collectedIds.clear();
      } else {
        state.completed = true;
        audioEngine.playComplete();
        spawnParticles(state, state.x + 0.5, state.y + 0.5, skin.highlightColor, 32, 1.3, true);
        callbacks.onComplete();
      }
    }
  }

  // Vertical camera tracking for taller levels (e.g. Stereo Madness)
  const targetCamY = computeTargetCamY(state.y, level);
  state.camY += (targetCamY - state.camY) * Math.min(1, dt * 6.5);

  // Soft-body spring-damper update
  const stiffness = 155;
  const damping = 12.5;
  state.scaleVelX += ((1 - state.scaleX) * stiffness - state.scaleVelX * damping) * dt;
  state.scaleVelY += ((1 - state.scaleY) * stiffness - state.scaleVelY * damping) * dt;
  state.scaleX = Math.max(0.55, Math.min(1.6, state.scaleX + state.scaleVelX * dt));
  state.scaleY = Math.max(0.55, Math.min(1.6, state.scaleY + state.scaleVelY * dt));

  state.wobblePhase += dt * 16;
  state.wobbleAmp = Math.max(0.12, state.wobbleAmp - dt * 1.4);

  // Subtle velocity tilt (expressive in Ship & Wave modes)
  const targetRot =
    state.vehicle === 'wave'
      ? Math.atan2(-state.vy, Math.max(1, state.vx))
      : state.vehicle === 'ship'
      ? Math.max(-0.42, Math.min(0.42, -state.vy * 0.036 * state.gravityDir))
      : state.vehicle === 'ufo'
      ? Math.max(-0.22, Math.min(0.22, -state.vy * 0.015 * state.gravityDir))
      : state.onGround
      ? 0
      : Math.max(-0.26, Math.min(0.26, -state.vy * 0.016 * state.gravityDir));
  state.rotation += (targetRot - state.rotation) * Math.min(1, dt * 16);

  // Trail update
  state.trailAccum += dt;
  if (state.trailAccum >= 0.025) {
    state.trailAccum = 0;
    state.trail.push({
      x: state.x,
      y: state.y,
      scaleX: state.scaleX * 0.88,
      scaleY: state.scaleY * 0.88,
      alpha: 0.7,
      color: skin.trailColor,
    });
    if (state.trail.length > 14) {
      state.trail.shift();
    }
  }
  for (let i = state.trail.length - 1; i >= 0; i--) {
    state.trail[i].alpha -= dt * 2.5;
    if (state.trail[i].alpha <= 0) {
      state.trail.splice(i, 1);
    }
  }
}

export function placeCheckpoint(state: EngineState, silent = false): boolean {
  if (state.dead || state.completed) return false;
  const last = state.checkpoints[state.checkpoints.length - 1];
  if (last && Math.abs(last.x - state.x) < 1.2) return false;

  state.checkpoints.push({
    x: state.x,
    y: state.y,
    vy: state.vy,
    gravityDir: state.gravityDir,
    speedMult: state.speedMult,
    vehicle: state.vehicle,
  });
  if (!silent) {
    audioEngine.playCheckpoint();
    spawnRing(state, state.x + 0.5, state.y + 0.5, '#10B981');
  }
  return true;
}

export function removeLastCheckpoint(state: EngineState): boolean {
  if (state.checkpoints.length === 0) return false;
  state.checkpoints.pop();
  return true;
}

function triggerCrash(
  state: EngineState,
  skin: JellySkin,
  isDemo: boolean,
  callbacks: StepCallbacks
) {
  if (isDemo) {
    state.x = 0;
    state.y = 0;
    state.vy = 0;
    state.gravityDir = 1;
    state.speedMult = 1;
    state.vehicle = 'cube';
    state.camY = 0;
    state.triggeredIds.clear();
    state.collectedIds.clear();
    return;
  }

  state.dead = true;
  state.deathTimer = 0.52;
  state.shakeTimer = 0.24;
  state.shakeIntensity = 9;
  audioEngine.playCrash();
  spawnParticles(state, state.x + 0.5, state.y + 0.5, skin.bodyColor, 24, 1.35, true);
  spawnParticles(state, state.x + 0.5, state.y + 0.5, skin.highlightColor, 10, 1.1, true);
  callbacks.onCrash();
}

function updateParticles(state: EngineState, dt: number) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      state.particles.splice(i, 1);
      continue;
    }

    if (p.ring) {
      p.radius += dt * 130;
      p.alpha = 1 - p.life / p.maxLife;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.bounces) {
        p.vy -= 38 * dt;
        if (p.y < 0.08) {
          p.y = 0.08;
          p.vy = Math.abs(p.vy) * 0.45;
          p.vx *= 0.78;
        }
      }
      p.alpha = 1 - p.life / p.maxLife;
    }
  }
}

function decideDemoJump(state: EngineState, level: LevelDefinition): { hold: boolean; tapOrb: boolean } {
  let hold = false;
  let tapOrb = false;

  if (state.vehicle === 'ship' || state.vehicle === 'wave' || state.vehicle === 'ufo') {
    let targetY = 4.2;
    for (const obj of level.objects) {
      const w = obj.w ?? 1;
      const h = obj.h ?? 1;
      if (obj.gx + w < state.x || obj.gx > state.x + 6.5) continue;
      if (obj.type === 'drop') {
        targetY = obj.gy + 0.5;
        break;
      }
      if (obj.type === 'block' || obj.type === 'spike' || obj.type === 'spike_down') {
        if (obj.gy <= 2.5) {
          targetY = Math.max(targetY, obj.gy + h + 1.8);
        } else if (obj.gy >= 5.5) {
          targetY = Math.min(targetY, obj.gy - 2.2);
        }
      }
    }
    if (state.vehicle === 'ufo') {
      return { hold: state.y < targetY && state.vy < 1.5, tapOrb: false };
    }
    const desiredVy = (targetY - state.y) * 2.5;
    return { hold: state.vy < desiredVy, tapOrb: false };
  }

  for (const obj of level.objects) {
    const dist = obj.gx - state.x;
    if (dist < -0.5 || dist > 3.6) continue;

    if (obj.type === 'orb_yellow' || obj.type === 'orb_cyan') {
      const dx = state.x + 0.5 - (obj.gx + 0.5);
      const dy = state.y + 0.5 - (obj.gy + 0.5);
      if (dx * dx + dy * dy < 1.1 * 1.1) {
        tapOrb = true;
      }
    }

    if (state.onGround && dist > 0.5 && dist < 2.6) {
      if (
        (state.gravityDir === 1 && obj.type === 'spike' && Math.abs(obj.gy - state.y) < 0.75) ||
        (state.gravityDir === -1 && obj.type === 'spike_down' && Math.abs(obj.gy - state.y) < 1.2) ||
        (obj.type === 'block' && obj.gy <= state.y + 0.5 && obj.gy + (obj.h ?? 1) > state.y + 0.15)
      ) {
        hold = true;
      }
    }
  }

  return { hold, tapOrb };
}
