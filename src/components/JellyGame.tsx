import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  Flag,
  Hammer,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import {
  deletePublishedLevelFromFirestore,
  publishLevelToFirestore,
  signInWithGoogle,
  signOutAccount,
  subscribeAuthState,
  subscribePublishedLevels,
} from '../firebase';
import { audioEngine } from '../game/audio';
import { COMMUNITY_LEVELS, createBlankCustomLevel } from '../game/communityLevels';
import { GRAVITY, GROUND_Y, JUMP_VEL, UNIT, WORLD_HEIGHT } from '../game/constants';
import {
  createEngineState,
  EngineState,
  placeCheckpoint,
  removeLastCheckpoint,
  spawnParticles,
  spawnRing,
  stepEngine,
} from '../game/engine';
import { getLevelById, LEVELS } from '../game/levels';
import { renderGame } from '../game/renderer';
import {
  getCubeIconById,
  getShipIconById,
  getSkinById,
  getUfoIconById,
  getWaveIconById,
} from '../game/skins';
import { customToLevelDefinition, loadSavedData, saveGameData } from '../game/storage';
import {
  AppScreen,
  Checkpoint,
  CubeIconId,
  CustomLevelData,
  GameMode,
  LevelDefinition,
  SavedData,
  ShipIconId,
  UfoIconId,
  VehicleType,
  WaveIconId,
} from '../game/types';
import {
  CreatorHubScreen,
  GoogleSignInButton,
  IconKitScreen,
  LevelDetailScreen,
  MyLevelsScreen,
  SavedLevelsScreen,
  SearchLevelsScreen,
} from './CreatorScreens';
import { JellyPreviewIcon } from './JellyPreviewIcon';
import { LevelEditor } from './LevelEditor';

interface MenuRunnerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vehicle: VehicleType;
  onGround: boolean;
  dead: boolean;
  deathTimer: number;
  scaleX: number;
  scaleY: number;
  scaleVelX: number;
  scaleVelY: number;
  wobblePhase: number;
  wobbleAmp: number;
  rotation: number;
  blinkTimer: number;
  nextJumpTimer: number;
  shipTargetY: number;
  shipTargetTimer: number;
  waveDir: 1 | -1;
  shakeTimer: number;
  shakeIntensity: number;
  trailAccum: number;
  time: number;
}

function nextMenuVehicle(current: VehicleType): VehicleType {
  if (current === 'cube') return 'ship';
  if (current === 'ship') return 'ufo';
  if (current === 'ufo') return 'wave';
  return 'cube';
}

function createMenuRunner(vehicle: VehicleType = 'cube'): MenuRunnerState {
  const airborne = vehicle !== 'cube';
  return {
    x: 2.5,
    y: airborne ? 3.5 : 0,
    vx: 5.4,
    vy: 0,
    vehicle,
    onGround: vehicle === 'cube',
    dead: false,
    deathTimer: 0,
    scaleX: 1,
    scaleY: 1,
    scaleVelX: 0,
    scaleVelY: 0,
    wobblePhase: 0,
    wobbleAmp: 0.25,
    rotation: 0,
    blinkTimer: 2.0,
    nextJumpTimer: 0.55 + Math.random() * 0.7,
    shipTargetY: 3.5,
    shipTargetTimer: 0.9,
    waveDir: 1,
    shakeTimer: 0,
    shakeIntensity: 0,
    trailAccum: 0,
    time: 0,
  };
}

export function JellyGame() {
  const [saved, setSaved] = useState<SavedData>(() => loadSavedData());
  const [screen, setScreen] = useState<AppScreen>('MAIN_MENU');
  const [returnScreen, setReturnScreen] = useState<AppScreen>('LEVEL_SELECT');
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);
  const [playingCustomLevel, setPlayingCustomLevel] = useState<CustomLevelData | null>(null);

  const [mode, setMode] = useState<GameMode>('normal');
  const [attempt, setAttempt] = useState<number>(1);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [checkpointCount, setCheckpointCount] = useState<number>(0);
  const [dropsCount, setDropsCount] = useState<number>(0);
  const [runBestPct, setRunBestPct] = useState<number>(0);

  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [onlineLevels, setOnlineLevels] = useState<CustomLevelData[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const logicalSizeRef = useRef<{ width: number; height: number }>({ width: 1000, height: WORLD_HEIGHT });

  const officialLevel = getLevelById(saved.selectedLevelId);
  const currentLevel: LevelDefinition = useMemo(() => {
    if (playingCustomLevel) {
      return customToLevelDefinition(playingCustomLevel);
    }
    return officialLevel;
  }, [officialLevel, playingCustomLevel]);

  const currentSkin = getSkinById(saved.selectedSkinId);
  const currentCubeIcon = getCubeIconById(saved.selectedCubeIcon);
  const currentShipIcon = getShipIconById(saved.selectedShipIcon);
  const currentUfoIcon = getUfoIconById(saved.selectedUfoIcon);
  const currentWaveIcon = getWaveIconById(saved.selectedWaveIcon);

  const engineRef = useRef<EngineState>(createEngineState(currentLevel));
  const menuRunnerRef = useRef<MenuRunnerState>(createMenuRunner('cube'));
  const menuFxRef = useRef<EngineState>(createEngineState(officialLevel));

  const screenRef = useRef<AppScreen>(screen);
  const modeRef = useRef<GameMode>(mode);
  const levelRef = useRef(currentLevel);
  const skinRef = useRef(currentSkin);
  const cubeIconRef = useRef(currentCubeIcon);
  const shipIconRef = useRef(currentShipIcon);
  const ufoIconRef = useRef(currentUfoIcon);
  const waveIconRef = useRef(currentWaveIcon);
  const savedRef = useRef(saved);
  const attemptRef = useRef(attempt);

  const holdJumpRef = useRef(false);
  const justPressedJumpRef = useRef(false);
  const lastPctRef = useRef(-1);
  const checkpointCountRef = useRef(checkpointCount);

  useEffect(() => {
    const unsubAuth = subscribeAuthState((nextUser) => {
      setUser(nextUser);
    });
    const unsubLevels = subscribePublishedLevels(
      (levels) => {
        setOnlineLevels(levels);
      },
      (err) => {
        console.warn('Published levels listener warning:', err);
      }
    );
    return () => {
      unsubAuth();
      unsubLevels();
    };
  }, []);

  useEffect(() => {
    checkpointCountRef.current = checkpointCount;
  }, [checkpointCount]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    levelRef.current = currentLevel;
  }, [currentLevel]);

  useEffect(() => {
    skinRef.current = currentSkin;
  }, [currentSkin]);

  useEffect(() => {
    cubeIconRef.current = currentCubeIcon;
  }, [currentCubeIcon]);

  useEffect(() => {
    shipIconRef.current = currentShipIcon;
  }, [currentShipIcon]);

  useEffect(() => {
    ufoIconRef.current = currentUfoIcon;
  }, [currentUfoIcon]);

  useEffect(() => {
    waveIconRef.current = currentWaveIcon;
  }, [currentWaveIcon]);

  useEffect(() => {
    savedRef.current = saved;
    audioEngine.setMuted(saved.muted);
    saveGameData(saved);
  }, [saved]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  const recordAttemptAndBest = useCallback((pct: number, completed: boolean, runMode: GameMode) => {
    const lvlId = levelRef.current.id;
    setSaved((prev) => {
      const existing = prev.progress[lvlId] ?? {
        bestNormal: 0,
        bestPractice: 0,
        attempts: 0,
        completed: false,
      };
      return {
        ...prev,
        progress: {
          ...prev.progress,
          [lvlId]: {
            bestNormal: runMode === 'normal' ? Math.max(existing.bestNormal, pct) : existing.bestNormal,
            bestPractice:
              runMode === 'practice' ? Math.max(existing.bestPractice, pct) : existing.bestPractice,
            attempts: existing.attempts + 1,
            completed: existing.completed || (completed && runMode === 'normal'),
          },
        },
      };
    });
  }, []);

  const launchLevel = useCallback(
    (lvlDef: LevelDefinition, chosenMode: GameMode, backTo: AppScreen, customObj: CustomLevelData | null) => {
      audioEngine.unlock();
      audioEngine.resetMusic();
      setPlayingCustomLevel(customObj);
      setReturnScreen(backTo);
      levelRef.current = lvlDef;
      engineRef.current = createEngineState(lvlDef);
      holdJumpRef.current = false;
      justPressedJumpRef.current = false;
      lastPctRef.current = 0;

      if (!customObj) {
        setSaved((prev) => ({ ...prev, selectedLevelId: lvlDef.id }));
      }
      setMode(chosenMode);
      modeRef.current = chosenMode;
      setAttempt(1);
      attemptRef.current = 1;
      setProgressPct(0);
      setCheckpointCount(0);
      setDropsCount(0);
      setRunBestPct(0);
      setScreen('PLAYING');
      screenRef.current = 'PLAYING';
    },
    []
  );

  const startOfficialLevel = useCallback(
    (levelId: string, chosenMode: GameMode) => {
      const lvl = getLevelById(levelId);
      launchLevel(lvl, chosenMode, 'LEVEL_SELECT', null);
    },
    [launchLevel]
  );

  const startCustomLevel = useCallback(
    (custom: CustomLevelData, chosenMode: GameMode, backTo: AppScreen) => {
      launchLevel(customToLevelDefinition(custom), chosenMode, backTo, custom);
    },
    [launchLevel]
  );

  const restartLevel = useCallback(() => {
    audioEngine.unlock();
    audioEngine.resetMusic();
    const lvl = levelRef.current;
    engineRef.current = createEngineState(lvl);
    holdJumpRef.current = false;
    justPressedJumpRef.current = false;
    lastPctRef.current = 0;

    setAttempt((a) => a + 1);
    setProgressPct(0);
    setCheckpointCount(0);
    setDropsCount(0);
    setScreen('PLAYING');
    screenRef.current = 'PLAYING';
  }, []);

  const respawnFromCrash = useCallback(() => {
    const lvl = levelRef.current;
    const prevEngine = engineRef.current;
    const isPractice = modeRef.current === 'practice';
    const lastCp: Checkpoint | undefined =
      isPractice && prevEngine.checkpoints.length > 0
        ? prevEngine.checkpoints[prevEngine.checkpoints.length - 1]
        : undefined;

    const fresh = createEngineState(lvl, lastCp);
    if (isPractice) {
      fresh.checkpoints = [...prevEngine.checkpoints];
      fresh.triggeredIds = new Set(
        lvl.objects
          .filter((o) => o.gx + (o.w ?? 1) < fresh.x)
          .map((o) => o.id)
      );
    }
    if (!lastCp) {
      audioEngine.resetMusic();
    }
    engineRef.current = fresh;
    holdJumpRef.current = false;
    justPressedJumpRef.current = false;
    setAttempt((a) => a + 1);
    setDropsCount(fresh.dropsCollected);
  }, []);

  const handleToggleMute = useCallback(() => {
    audioEngine.unlock();
    setSaved((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const handleAddCheckpoint = useCallback(() => {
    if (screenRef.current !== 'PLAYING' || modeRef.current !== 'practice') return;
    if (placeCheckpoint(engineRef.current)) {
      setCheckpointCount(engineRef.current.checkpoints.length);
    }
  }, []);

  const handleRemoveCheckpoint = useCallback(() => {
    if (screenRef.current !== 'PLAYING' || modeRef.current !== 'practice') return;
    if (removeLastCheckpoint(engineRef.current)) {
      setCheckpointCount(engineRef.current.checkpoints.length);
    }
  }, []);

  const handleExitPlay = useCallback(() => {
    holdJumpRef.current = false;
    justPressedJumpRef.current = false;
    setPlayingCustomLevel(null);
    setScreen(returnScreen);
    screenRef.current = returnScreen;
  }, [returnScreen]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (screenRef.current === 'PLAYING') {
          e.preventDefault();
          audioEngine.unlock();
          if (!e.repeat) {
            justPressedJumpRef.current = true;
          }
          holdJumpRef.current = true;
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screenRef.current === 'PLAYING') {
          e.preventDefault();
          holdJumpRef.current = false;
          setScreen('PAUSED');
        } else if (screenRef.current === 'PAUSED') {
          e.preventDefault();
          setScreen('PLAYING');
        }
      } else if (e.code === 'KeyR') {
        if (
          screenRef.current === 'PLAYING' ||
          screenRef.current === 'PAUSED' ||
          screenRef.current === 'LEVEL_COMPLETE'
        ) {
          e.preventDefault();
          restartLevel();
        }
      } else if (e.code === 'KeyC') {
        handleAddCheckpoint();
      } else if (e.code === 'KeyX') {
        handleRemoveCheckpoint();
      } else if (e.code === 'KeyM') {
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        ) {
          return;
        }
        handleToggleMute();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        holdJumpRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleAddCheckpoint, handleRemoveCheckpoint, handleToggleMute, restartLevel]);

  // Main Animation & Physics Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.033);

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = container.getBoundingClientRect();
        const aspect = rect.width / Math.max(1, rect.height);
        const logicalWidth = Math.max(640, Math.round(WORLD_HEIGHT * aspect));
        logicalSizeRef.current = { width: logicalWidth, height: WORLD_HEIGHT };

        const targetW = Math.round(logicalWidth * dpr);
        const targetH = Math.round(WORLD_HEIGHT * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const activeScreen = screenRef.current;
          const lvl = levelRef.current;
          const skin = skinRef.current;
          const cubeIcon = cubeIconRef.current;
          const shipIcon = shipIconRef.current;
          const ufoIcon = ufoIconRef.current;
          const waveIcon = waveIconRef.current;

          if (activeScreen === 'PLAYING' || activeScreen === 'PAUSED' || activeScreen === 'LEVEL_COMPLETE') {
            const state = engineRef.current;
            let beatPulse = 0;

            if (activeScreen === 'PLAYING') {
              beatPulse = audioEngine.updateMusic(
                dt,
                lvl.bpm,
                lvl.musicKey,
                !state.dead && !state.completed
              );

              stepEngine(
                state,
                lvl,
                skin,
                dt,
                holdJumpRef.current,
                justPressedJumpRef.current,
                false,
                modeRef.current === 'practice',
                {
                  onCrash: () => {
                    const pct = Math.min(100, Math.floor((state.x / lvl.lengthUnits) * 100));
                    setRunBestPct((prev) => Math.max(prev, pct));
                    recordAttemptAndBest(pct, false, modeRef.current);
                  },
                  onRespawn: () => {
                    respawnFromCrash();
                  },
                  onComplete: () => {
                    setProgressPct(100);
                    setRunBestPct(100);
                    recordAttemptAndBest(100, true, modeRef.current);
                    setScreen('LEVEL_COMPLETE');
                    screenRef.current = 'LEVEL_COMPLETE';
                  },
                  onDropCollected: (count) => {
                    setDropsCount(count);
                  },
                }
              );
              justPressedJumpRef.current = false;

              if (!state.dead) {
                const pct = Math.min(100, Math.max(0, Math.floor((state.x / lvl.lengthUnits) * 100)));
                if (pct !== lastPctRef.current) {
                  lastPctRef.current = pct;
                  setProgressPct(pct);
                  setRunBestPct((prev) => Math.max(prev, pct));
                }
                if (
                  modeRef.current === 'practice' &&
                  state.checkpoints.length !== checkpointCountRef.current
                ) {
                  checkpointCountRef.current = state.checkpoints.length;
                  setCheckpointCount(state.checkpoints.length);
                }
              }
            }

            const shakeX =
              state.shakeTimer > 0
                ? (Math.random() - 0.5) * 2 * state.shakeIntensity * (state.shakeTimer / 0.24)
                : 0;
            const shakeY =
              state.shakeTimer > 0
                ? (Math.random() - 0.5) * 2 * state.shakeIntensity * (state.shakeTimer / 0.24)
                : 0;

            ctx.save();
            ctx.scale(dpr, dpr);
            renderGame({
              ctx,
              width: logicalWidth,
              level: lvl,
              skin,
              cubeIcon,
              shipIcon,
              ufoIcon,
              waveIcon,
              player: state,
              time: state.time,
              beatPulse,
              shakeX,
              shakeY,
              particles: state.particles,
              trail: state.trail,
              checkpoints: state.checkpoints,
              triggeredIds: state.triggeredIds,
              collectedIds: state.collectedIds,
            });
            ctx.restore();
          } else {
            // MAIN MENU / HUBS: Static floor & background with interactive Cube / Ship / UFO / Wave runner!
            const runner = menuRunnerRef.current;
            const fx = menuFxRef.current;
            const stageUnits = logicalWidth / UNIT;

            runner.time += dt;
            runner.blinkTimer -= dt;
            if (runner.blinkTimer <= 0) {
              runner.blinkTimer = 2.0 + Math.random() * 2.5;
            }
            if (runner.shakeTimer > 0) {
              runner.shakeTimer = Math.max(0, runner.shakeTimer - dt);
            }

            // Update splash particles
            for (let i = fx.particles.length - 1; i >= 0; i--) {
              const p = fx.particles[i];
              p.life += dt;
              if (p.life >= p.maxLife) {
                fx.particles.splice(i, 1);
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

            if (runner.dead) {
              runner.deathTimer -= dt;
              if (runner.deathTimer <= 0) {
                const nextVeh = nextMenuVehicle(runner.vehicle);
                const fresh = createMenuRunner(nextVeh);
                fresh.x = -1.2;
                menuRunnerRef.current = fresh;
              }
            } else {
              runner.x += runner.vx * dt;

              if (runner.vehicle === 'cube') {
                if (runner.onGround) {
                  runner.nextJumpTimer -= dt;
                  if (runner.nextJumpTimer <= 0) {
                    runner.vy = JUMP_VEL * (0.88 + Math.random() * 0.22);
                    runner.onGround = false;
                    runner.scaleX = 0.72;
                    runner.scaleY = 1.34;
                    runner.wobbleAmp = 0.9;
                    runner.nextJumpTimer = 0.55 + Math.random() * 1.15;
                  }
                }
                runner.vy -= GRAVITY * dt;
                runner.y += runner.vy * dt;
                if (runner.y <= 0) {
                  if (!runner.onGround && runner.vy < -3) {
                    runner.scaleX = 1.3;
                    runner.scaleY = 0.74;
                    runner.wobbleAmp = 0.85;
                  }
                  runner.y = 0;
                  runner.vy = 0;
                  runner.onGround = true;
                }
              } else if (runner.vehicle === 'ufo') {
                // UFO mid-air hops ("приход в воздух")
                runner.nextJumpTimer -= dt;
                if (runner.nextJumpTimer <= 0 || runner.y < 1.1) {
                  runner.vy = 13.0;
                  runner.scaleX = 1.24;
                  runner.scaleY = 0.78;
                  runner.wobbleAmp = 0.7;
                  runner.nextJumpTimer = 0.42 + Math.random() * 0.48;
                  spawnRing(fx, runner.x + 0.5, runner.y + 0.1, skin.highlightColor);
                }
                runner.vy -= GRAVITY * 0.62 * dt;
                runner.y = Math.max(0.2, Math.min(7.0, runner.y + runner.vy * dt));
                runner.onGround = false;
              } else if (runner.vehicle === 'wave') {
                // Crisp diagonal zigzag wave motion
                runner.nextJumpTimer -= dt;
                if (runner.nextJumpTimer <= 0) {
                  runner.waveDir = runner.waveDir === 1 ? -1 : 1;
                  runner.nextJumpTimer = 0.28 + Math.random() * 0.34;
                }
                if (runner.y >= 6.4) runner.waveDir = -1;
                if (runner.y <= 0.7) runner.waveDir = 1;
                runner.vy = runner.vx * 0.92 * runner.waveDir;
                runner.y = Math.max(0.2, Math.min(7.2, runner.y + runner.vy * dt));
                runner.onGround = false;
              } else {
                // Ship mode flying in gentle random waves
                runner.shipTargetTimer -= dt;
                if (runner.shipTargetTimer <= 0) {
                  runner.shipTargetY = 1.3 + Math.random() * 4.2;
                  runner.shipTargetTimer = 0.6 + Math.random() * 0.9;
                }
                const desiredVy = (runner.shipTargetY - runner.y) * 2.8;
                const thrust = runner.vy < desiredVy;
                runner.vy += (thrust ? 26 : -22) * dt;
                runner.vy = Math.max(-7.5, Math.min(7.5, runner.vy));
                runner.y = Math.max(0.4, Math.min(7.2, runner.y + runner.vy * dt));
                runner.onGround = false;
                if (thrust && Math.random() < 0.35) {
                  spawnParticles(fx, runner.x + 0.1, runner.y + 0.35, skin.innerColor, 1, 0.3, false);
                }
              }

              // Wrap back to left when reaching right edge, cycling Cube -> Ship -> UFO -> Wave
              if (runner.x > stageUnits + 1.4) {
                runner.vehicle = nextMenuVehicle(runner.vehicle);
                runner.x = -1.4;
                runner.y = runner.vehicle === 'cube' ? 0 : 3.2;
                runner.vy = 0;
                runner.onGround = runner.vehicle === 'cube';
                fx.trail = [];
              }

              // Soft-body spring update
              runner.scaleVelX += ((1 - runner.scaleX) * 155 - runner.scaleVelX * 12.5) * dt;
              runner.scaleVelY += ((1 - runner.scaleY) * 155 - runner.scaleVelY * 12.5) * dt;
              runner.scaleX = Math.max(0.55, Math.min(1.6, runner.scaleX + runner.scaleVelX * dt));
              runner.scaleY = Math.max(0.55, Math.min(1.6, runner.scaleY + runner.scaleVelY * dt));
              runner.wobblePhase += dt * 15;
              runner.wobbleAmp = Math.max(0.12, runner.wobbleAmp - dt * 1.4);

              const targetRot =
                runner.vehicle === 'wave'
                  ? runner.waveDir * -0.68
                  : runner.vehicle === 'ship' || runner.vehicle === 'ufo'
                  ? Math.max(-0.4, Math.min(0.4, -runner.vy * 0.04))
                  : runner.onGround
                  ? 0
                  : Math.max(-0.25, Math.min(0.25, -runner.vy * 0.016));
              runner.rotation += (targetRot - runner.rotation) * Math.min(1, dt * 16);

              runner.trailAccum += dt;
              const trailInterval = runner.vehicle === 'wave' ? 0.016 : 0.035;
              if (runner.trailAccum >= trailInterval) {
                runner.trailAccum = 0;
                fx.trail.push({
                  x: runner.x,
                  y: runner.y,
                  scaleX: runner.scaleX * 0.85,
                  scaleY: runner.scaleY * 0.85,
                  alpha: runner.vehicle === 'wave' ? 0.85 : 0.55,
                  color: skin.trailColor,
                });
                const maxTrail = runner.vehicle === 'wave' ? 28 : 10;
                if (fx.trail.length > maxTrail) fx.trail.shift();
              }
            }

            for (let i = fx.trail.length - 1; i >= 0; i--) {
              fx.trail[i].alpha -= dt * (runner.vehicle === 'wave' ? 1.4 : 2.5);
              if (fx.trail[i].alpha <= 0) fx.trail.splice(i, 1);
            }

            const shakeX =
              runner.shakeTimer > 0
                ? (Math.random() - 0.5) * 2 * runner.shakeIntensity * (runner.shakeTimer / 0.22)
                : 0;
            const shakeY =
              runner.shakeTimer > 0
                ? (Math.random() - 0.5) * 2 * runner.shakeIntensity * (runner.shakeTimer / 0.22)
                : 0;

            ctx.save();
            ctx.scale(dpr, dpr);
            renderGame({
              ctx,
              width: logicalWidth,
              level: officialLevel,
              skin,
              cubeIcon,
              shipIcon,
              ufoIcon,
              waveIcon,
              player: {
                x: runner.x,
                y: runner.y,
                vx: runner.vx,
                vy: runner.vy,
                gravityDir: 1,
                vehicle: runner.vehicle,
                camY: 0,
                onGround: runner.onGround,
                scaleX: runner.scaleX,
                scaleY: runner.scaleY,
                wobblePhase: runner.wobblePhase,
                wobbleAmp: runner.wobbleAmp,
                rotation: runner.rotation,
                dead: runner.dead,
                blinkTimer: runner.blinkTimer,
              },
              time: runner.time,
              beatPulse: 0,
              shakeX,
              shakeY,
              particles: fx.particles,
              trail: fx.trail,
              checkpoints: [],
              triggeredIds: new Set(),
              collectedIds: new Set(),
              staticStage: true,
            });
            ctx.restore();
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [officialLevel, recordAttemptAndBest, respawnFromCrash]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (screenRef.current === 'MAIN_MENU') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { width } = logicalSizeRef.current;
      const lx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * width;
      const ly = ((e.clientY - rect.top) / Math.max(1, rect.height)) * WORLD_HEIGHT;
      const clickGx = lx / UNIT;
      const clickGy = (GROUND_Y - ly) / UNIT;

      const runner = menuRunnerRef.current;
      if (!runner.dead) {
        const dx = clickGx - (runner.x + 0.5);
        const dy = clickGy - (runner.y + 0.5);
        if (dx * dx + dy * dy <= 1.5 * 1.5) {
          audioEngine.unlock();
          audioEngine.playCrash();
          const fx = menuFxRef.current;
          const skin = skinRef.current;
          runner.dead = true;
          runner.deathTimer = 0.65;
          runner.shakeTimer = 0.22;
          runner.shakeIntensity = 7;
          fx.trail = [];
          spawnParticles(fx, runner.x + 0.5, runner.y + 0.5, skin.bodyColor, 24, 1.3, true);
          spawnParticles(fx, runner.x + 0.5, runner.y + 0.5, skin.highlightColor, 10, 1.0, true);
          spawnRing(fx, runner.x + 0.5, runner.y + 0.5, skin.highlightColor);
        }
      }
      return;
    }

    if (screenRef.current !== 'PLAYING') return;
    e.preventDefault();
    audioEngine.unlock();
    justPressedJumpRef.current = true;
    holdJumpRef.current = true;
  };

  const handleCanvasPointerUp = () => {
    holdJumpRef.current = false;
  };

  // Custom level helpers & Firebase Auth / Publish actions
  const allSearchableLevels = useMemo(() => {
    const map = new Map<string, CustomLevelData>();
    for (const lvl of onlineLevels) {
      map.set(lvl.id, lvl);
    }
    for (const lvl of saved.publishedLevels) {
      if (!map.has(lvl.id)) map.set(lvl.id, lvl);
    }
    for (const lvl of COMMUNITY_LEVELS) {
      if (!map.has(lvl.id)) map.set(lvl.id, lvl);
    }
    return Array.from(map.values());
  }, [onlineLevels, saved.publishedLevels]);

  const savedIdSet = useMemo(() => new Set(saved.savedLevels.map((l) => l.id)), [saved.savedLevels]);

  const activeCustomLevel = useMemo(
    () => saved.myLevels.find((l) => l.id === activeCustomId) ?? null,
    [saved.myLevels, activeCustomId]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось войти через Google';
      setAuthError(
        msg.includes('popup-closed-by-user')
          ? 'Окно входа было закрыто.'
          : 'Не удалось выполнить вход через Google. Попробуйте ещё раз.'
      );
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOutAccount();
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleCreateBlankLevel = () => {
    const fresh = createBlankCustomLevel(`Уровень ${saved.myLevels.length + 1}`);
    setSaved((prev) => ({ ...prev, myLevels: [fresh, ...prev.myLevels] }));
    setActiveCustomId(fresh.id);
    setPublishError(null);
    setScreen('LEVEL_DETAIL');
  };

  const handleImportGDLevel = (imported: CustomLevelData) => {
    setSaved((prev) => ({ ...prev, myLevels: [imported, ...prev.myLevels] }));
    setActiveCustomId(imported.id);
    setPublishError(null);
    setScreen('LEVEL_DETAIL');
  };

  const handleUpdateCustomLevel = (updated: CustomLevelData) => {
    setSaved((prev) => ({
      ...prev,
      myLevels: prev.myLevels.map((l) => (l.id === updated.id ? updated : l)),
      publishedLevels: prev.publishedLevels.map((l) =>
        l.id === updated.id ? { ...updated, published: true } : l
      ),
    }));
  };

  const handlePublishCustomLevel = async (lvl: CustomLevelData) => {
    if (!user) return;
    setPublishBusy(true);
    setPublishError(null);
    try {
      const publishedCopy = await publishLevelToFirestore(lvl, user);
      setSaved((prev) => {
        const existsInPublished = prev.publishedLevels.some((p) => p.id === lvl.id);
        return {
          ...prev,
          myLevels: prev.myLevels.map((m) => (m.id === lvl.id ? publishedCopy : m)),
          publishedLevels: existsInPublished
            ? prev.publishedLevels.map((p) => (p.id === lvl.id ? publishedCopy : p))
            : [publishedCopy, ...prev.publishedLevels],
        };
      });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Ошибка публикации уровня.');
    } finally {
      setPublishBusy(false);
    }
  };

  const handleUnpublishCustomLevel = async (lvl: CustomLevelData) => {
    if (!user) return;
    setPublishBusy(true);
    setPublishError(null);
    try {
      await deletePublishedLevelFromFirestore(lvl.id);
      setSaved((prev) => ({
        ...prev,
        myLevels: prev.myLevels.map((m) => (m.id === lvl.id ? { ...m, published: false } : m)),
        publishedLevels: prev.publishedLevels.filter((p) => p.id !== lvl.id),
      }));
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Не удалось снять уровень с публикации.');
    } finally {
      setPublishBusy(false);
    }
  };

  const handleDeleteCustomLevel = (id: string) => {
    const target = saved.myLevels.find((l) => l.id === id);
    if (target?.published && user) {
      void deletePublishedLevelFromFirestore(id).catch(() => {});
    }
    setSaved((prev) => ({
      ...prev,
      myLevels: prev.myLevels.filter((l) => l.id !== id),
      publishedLevels: prev.publishedLevels.filter((l) => l.id !== id),
    }));
    setActiveCustomId(null);
    setScreen('MY_LEVELS');
  };

  const handleSaveCommunityLevel = (lvl: CustomLevelData) => {
    setSaved((prev) => {
      if (prev.savedLevels.some((s) => s.id === lvl.id)) return prev;
      return { ...prev, savedLevels: [lvl, ...prev.savedLevels] };
    });
  };

  const handleCloneToMyLevels = (lvl: CustomLevelData) => {
    const now = Date.now();
    const copy: CustomLevelData = {
      ...lvl,
      id: `clone_${now}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${lvl.title} (Копия)`,
      author: user?.displayName || 'Вы',
      authorUid: undefined,
      published: false,
      createdAt: now,
      updatedAt: now,
      objects: lvl.objects.map((o, idx) => ({ ...o, id: `c_${idx}_${now}` })),
    };
    setSaved((prev) => ({ ...prev, myLevels: [copy, ...prev.myLevels] }));
    setActiveCustomId(copy.id);
    setPublishError(null);
    setScreen('LEVEL_DETAIL');
  };

  const isPlayingOfficial = !playingCustomLevel && LEVELS.some((l) => l.id === currentLevel.id);
  const nextLevel = isPlayingOfficial ? LEVELS.find((l) => l.order === currentLevel.order + 1) : undefined;
  const activeLevelStats = saved.progress[officialLevel.id] ?? {
    bestNormal: 0,
    bestPractice: 0,
    attempts: 0,
    completed: false,
  };

  const inGameplay = screen === 'PLAYING' || screen === 'PAUSED' || screen === 'LEVEL_COMPLETE';

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-[#0B1120] select-none"
    >
      {/* Full-viewport Game Canvas (interactive Cube/Ship runner on MAIN_MENU!) */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
        className="block w-full h-full cursor-pointer touch-none"
      />

      {/* ====================================================================
          IN-GAME MINIMAL HUD
         ==================================================================== */}
      {inGameplay && (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-5 py-3">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-950/75 px-3.5 py-2 backdrop-blur-md border border-white/10">
            <span className="font-display text-sm font-bold text-white whitespace-nowrap">
              {currentLevel.title}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="font-mono-tabular text-xs font-medium text-slate-300 whitespace-nowrap">
              Попытка {attempt}
            </span>
            <span className="sm:hidden font-mono-tabular text-xs font-bold text-white whitespace-nowrap">
              · {progressPct}%
            </span>
            {mode === 'practice' && (
              <>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">
                  Практика
                </span>
              </>
            )}
            {dropsCount > 0 && (
              <>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono-tabular text-xs font-medium text-amber-300 whitespace-nowrap">
                  Капли: {dropsCount}
                </span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-3 w-64 md:w-80 rounded-xl bg-slate-950/75 px-3.5 py-2 backdrop-blur-md border border-white/10">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: mode === 'practice' ? '#10B981' : currentLevel.accentColor,
                }}
              />
            </div>
            <span className="font-mono-tabular w-10 text-right text-xs font-bold text-white">
              {progressPct}%
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {mode === 'practice' && (
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/75 p-1 backdrop-blur-md border border-white/10">
                <button
                  type="button"
                  onClick={handleAddCheckpoint}
                  title="Поставить чекпоинт (C)"
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Чекпоинт</span>
                  <span className="font-mono-tabular text-emerald-200">{checkpointCount}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCheckpoint}
                  disabled={checkpointCount === 0}
                  title="Удалить последний чекпоинт (X)"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 disabled:opacity-35 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={saved.muted ? 'Включить звук' : 'Выключить звук'}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/75 text-slate-200 hover:bg-slate-900 border border-white/10 backdrop-blur-md transition-colors shrink-0 cursor-pointer"
            >
              {saved.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                holdJumpRef.current = false;
                setScreen((s) => (s === 'PAUSED' ? 'PLAYING' : 'PAUSED'));
              }}
              aria-label="Пауза"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/75 text-slate-200 hover:bg-slate-900 border border-white/10 backdrop-blur-md transition-colors shrink-0 cursor-pointer"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>
        </header>
      )}

      {/* ====================================================================
          MAIN MENU (Geometry Dash Hub: Left Icons · Center Play · Right Creator)
          Background & floor stay static; Cube/Ship runs and jumps/flies below!
         ==================================================================== */}
      {screen === 'MAIN_MENU' && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-8">
          {/* Top Bar: Account Registration / Profile + Sound Button */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              {user ? (
                <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-slate-900/85 border border-white/12 px-3 py-1.5 backdrop-blur-md">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Профиль'}
                      className="h-7 w-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                    {user.displayName || user.email?.split('@')[0] || 'Игрок'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    title="Выйти из аккаунта"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <GoogleSignInButton
                  onClick={() => void handleGoogleSignIn()}
                  loading={authBusy}
                  label="Войти через Google"
                  compact
                />
              )}
              {authError && (
                <div className="pointer-events-auto rounded-lg bg-rose-950/85 border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 max-w-xs">
                  {authError}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleMute}
              className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 px-3.5 text-sm font-medium text-slate-200 border border-white/12 backdrop-blur-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {saved.muted ? (
                <>
                  <VolumeX className="h-4 w-4 text-rose-400" />
                  <span>Без звука</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                  <span>Звук вкл</span>
                </>
              )}
            </button>
          </div>

          {/* Upper-Center Brand & 3-Button Hub (leaving floor open to click the runner!) */}
          <div className="flex flex-col items-center gap-7 mb-24 sm:mb-28">
            <div className="text-center">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)]">
                Jelly Dash
              </h1>
              <p className="text-sm text-slate-300 mt-1.5 drop-shadow">
                Ритм-платформер с мягкой физикой желе
              </p>
            </div>

            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {/* LEFT: ICONS (Cube + Ship + UFO + Wave + Flavors) */}
              <button
                type="button"
                onClick={() => setScreen('ICON_KIT')}
                className="pointer-events-auto group flex flex-col items-center justify-center gap-1.5 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-900/85 hover:bg-slate-800/95 border border-white/15 backdrop-blur-md shadow-xl transition-transform active:scale-95 cursor-pointer"
              >
                <div className="grid grid-cols-2 gap-1 items-center justify-items-center">
                  <JellyPreviewIcon skin={currentSkin} cubeIcon={currentCubeIcon} size={26} />
                  <JellyPreviewIcon skin={currentSkin} shipIcon={currentShipIcon} mode="ship" size={28} />
                  <JellyPreviewIcon skin={currentSkin} ufoIcon={currentUfoIcon} mode="ufo" size={28} />
                  <JellyPreviewIcon skin={currentSkin} waveIcon={currentWaveIcon} mode="wave" size={28} />
                </div>
                <span className="font-display text-sm font-bold text-slate-100 whitespace-nowrap">
                  Иконки
                </span>
              </button>

              {/* CENTER: BIG PLAY BUTTON */}
              <button
                type="button"
                onClick={() => setScreen('LEVEL_SELECT')}
                className="pointer-events-auto group flex flex-col items-center justify-center gap-2 w-36 h-36 sm:w-40 sm:h-40 rounded-3xl text-white shadow-2xl border-2 border-white/25 transition-transform hover:scale-[1.03] active:scale-95 cursor-pointer"
                style={{ backgroundColor: officialLevel.accentColor }}
              >
                <Play className="h-12 w-12 fill-current translate-x-0.5" />
                <span className="font-display text-lg font-extrabold tracking-wide whitespace-nowrap">
                  Играть
                </span>
              </button>

              {/* RIGHT: CREATOR (Hammer + Wrench) */}
              <button
                type="button"
                onClick={() => setScreen('CREATOR_HUB')}
                className="pointer-events-auto group flex flex-col items-center justify-center gap-2 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-900/85 hover:bg-slate-800/95 border border-white/15 backdrop-blur-md shadow-xl transition-transform active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Hammer className="h-7 w-7" />
                  <Wrench className="h-7 w-7" />
                </div>
                <span className="font-display text-sm font-bold text-slate-100 whitespace-nowrap">
                  Создать
                </span>
              </button>
            </div>
          </div>

          {/* Quiet hint at bottom edge (pointer-events-none so canvas remains clickable) */}
          <div className="text-center text-xs text-slate-300/85 drop-shadow">
            Нажми на бегущего героя внизу экрана (Куб · Корабль · НЛО · Волна)
          </div>
        </div>
      )}

      {/* ====================================================================
          OFFICIAL LEVEL SELECT
         ==================================================================== */}
      {screen === 'LEVEL_SELECT' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 md:p-8">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setScreen('MAIN_MENU')}
                  className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Меню</span>
                </button>
                <div>
                  <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white">
                    Выбор уровня
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Официальные уровни Jelly Dash и классика Stereo Madness
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleMute}
                className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-3.5 text-sm font-medium text-slate-200 hover:bg-slate-700 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {saved.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
                <span>{saved.muted ? 'Без звука' : 'Звук вкл'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {LEVELS.map((lvl) => {
                const isSelected = lvl.id === officialLevel.id;
                const stats = saved.progress[lvl.id] ?? {
                  bestNormal: 0,
                  bestPractice: 0,
                  attempts: 0,
                  completed: false,
                };
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      levelRef.current = lvl;
                      setSaved((prev) => ({ ...prev, selectedLevelId: lvl.id }));
                    }}
                    className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'bg-slate-800/95 border-white/30 shadow-lg ring-1 ring-white/20'
                        : 'bg-slate-950/55 border-white/10 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tracking-wide" style={{ color: lvl.accentColor }}>
                          Уровень {lvl.order} · {lvl.difficulty}
                        </span>
                        {stats.completed && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                            Пройден
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-lg font-bold text-white mt-1.5">{lvl.title}</h2>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lvl.subtitle}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                        <span>{lvl.bpm} BPM</span>
                        <span>Рекорд: {stats.bestNormal}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${stats.bestNormal}%`, backgroundColor: lvl.accentColor }}
                        />
                      </div>
                      {stats.bestPractice > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-400/90 font-mono-tabular">
                          <span>Практика</span>
                          <span>{stats.bestPractice}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
              <div className="text-xs text-slate-400 font-mono-tabular">
                Выбран: <span className="text-white font-semibold">{officialLevel.title}</span> · Попыток: {activeLevelStats.attempts}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => startOfficialLevel(officialLevel.id, 'practice')}
                  className="h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-white/10 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Flag className="h-4 w-4 text-emerald-400" />
                  <span>Практика</span>
                </button>

                <button
                  type="button"
                  onClick={() => startOfficialLevel(officialLevel.id, 'normal')}
                  className="h-11 px-7 rounded-xl text-white text-sm font-bold flex items-center gap-2.5 shadow-lg transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                  style={{ backgroundColor: officialLevel.accentColor }}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Играть</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ICON KIT, CREATOR HUB, MY LEVELS, LEVEL DETAIL, SAVED, SEARCH, EDITOR
         ==================================================================== */}
      {screen === 'ICON_KIT' && (
        <IconKitScreen
          skin={currentSkin}
          cubeIcon={currentCubeIcon}
          shipIcon={currentShipIcon}
          ufoIcon={currentUfoIcon}
          waveIcon={currentWaveIcon}
          onSelectSkin={(id) => {
            audioEngine.unlock();
            setSaved((prev) => ({ ...prev, selectedSkinId: id }));
          }}
          onSelectCube={(id: CubeIconId) => {
            audioEngine.unlock();
            setSaved((prev) => ({ ...prev, selectedCubeIcon: id }));
          }}
          onSelectShip={(id: ShipIconId) => {
            audioEngine.unlock();
            setSaved((prev) => ({ ...prev, selectedShipIcon: id }));
          }}
          onSelectUfo={(id: UfoIconId) => {
            audioEngine.unlock();
            setSaved((prev) => ({ ...prev, selectedUfoIcon: id }));
          }}
          onSelectWave={(id: WaveIconId) => {
            audioEngine.unlock();
            setSaved((prev) => ({ ...prev, selectedWaveIcon: id }));
          }}
          onBack={() => setScreen('MAIN_MENU')}
        />
      )}

      {screen === 'CREATOR_HUB' && (
        <CreatorHubScreen
          myCount={saved.myLevels.length}
          savedCount={saved.savedLevels.length}
          searchCount={allSearchableLevels.length}
          user={user}
          authBusy={authBusy}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onOpenMyLevels={() => setScreen('MY_LEVELS')}
          onOpenSavedLevels={() => setScreen('SAVED_LEVELS')}
          onOpenSearchLevels={() => setScreen('SEARCH_LEVELS')}
          onBack={() => setScreen('MAIN_MENU')}
        />
      )}

      {screen === 'MY_LEVELS' && (
        <MyLevelsScreen
          levels={saved.myLevels}
          progress={saved.progress}
          onCreateNew={handleCreateBlankLevel}
          onImportGD={handleImportGDLevel}
          onOpenLevelMenu={(id) => {
            setActiveCustomId(id);
            setPublishError(null);
            setScreen('LEVEL_DETAIL');
          }}
          onBack={() => setScreen('CREATOR_HUB')}
        />
      )}

      {screen === 'LEVEL_DETAIL' && activeCustomLevel && (
        <LevelDetailScreen
          level={activeCustomLevel}
          progress={saved.progress[activeCustomLevel.id]}
          user={user}
          authBusy={authBusy}
          authError={authError}
          publishBusy={publishBusy}
          publishError={publishError}
          onSignIn={handleGoogleSignIn}
          onPlay={(m) => startCustomLevel(activeCustomLevel, m, 'LEVEL_DETAIL')}
          onPublish={() => handlePublishCustomLevel(activeCustomLevel)}
          onUnpublish={() => handleUnpublishCustomLevel(activeCustomLevel)}
          onEdit={() => setScreen('LEVEL_EDITOR')}
          onDelete={() => handleDeleteCustomLevel(activeCustomLevel.id)}
          onBack={() => setScreen('MY_LEVELS')}
        />
      )}

      {screen === 'LEVEL_EDITOR' && activeCustomLevel && (
        <LevelEditor
          level={activeCustomLevel}
          onSave={handleUpdateCustomLevel}
          onBack={(updated) => {
            handleUpdateCustomLevel(updated);
            setScreen('LEVEL_DETAIL');
          }}
          onTestPlay={(updated) => {
            handleUpdateCustomLevel(updated);
            startCustomLevel(updated, 'normal', 'LEVEL_EDITOR');
          }}
        />
      )}

      {screen === 'SAVED_LEVELS' && (
        <SavedLevelsScreen
          levels={saved.savedLevels}
          progress={saved.progress}
          onPlay={(lvl, m) => startCustomLevel(lvl, m, 'SAVED_LEVELS')}
          onCloneToMy={handleCloneToMyLevels}
          onRemoveSaved={(id) =>
            setSaved((prev) => ({
              ...prev,
              savedLevels: prev.savedLevels.filter((s) => s.id !== id),
            }))
          }
          onBack={() => setScreen('CREATOR_HUB')}
        />
      )}

      {screen === 'SEARCH_LEVELS' && (
        <SearchLevelsScreen
          allLevels={allSearchableLevels}
          savedIds={savedIdSet}
          progress={saved.progress}
          onPlay={(lvl, m) => startCustomLevel(lvl, m, 'SEARCH_LEVELS')}
          onSaveLevel={handleSaveCommunityLevel}
          onCloneToMy={handleCloneToMyLevels}
          onBack={() => setScreen('CREATOR_HUB')}
        />
      )}

      {/* ====================================================================
          PAUSE MODAL
         ==================================================================== */}
      {screen === 'PAUSED' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/12 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Пауза</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentLevel.title} · Прогресс {progressPct}%
                </p>
              </div>
              <JellyPreviewIcon skin={currentSkin} cubeIcon={currentCubeIcon} size={42} />
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setScreen('PLAYING')}
                className="h-11 w-full rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-95 whitespace-nowrap cursor-pointer"
                style={{ backgroundColor: currentLevel.accentColor }}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Продолжить</span>
              </button>

              <button
                type="button"
                onClick={restartLevel}
                className="h-11 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Начать заново</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  launchLevel(
                    currentLevel,
                    mode === 'normal' ? 'practice' : 'normal',
                    returnScreen,
                    playingCustomLevel
                  )
                }
                className="h-11 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Flag className="h-4 w-4 text-emerald-400" />
                <span>
                  {mode === 'normal' ? 'Переключить в Практику' : 'Переключить в Обычный режим'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExitPlay}
                className="h-11 w-full rounded-xl bg-transparent hover:bg-white/5 text-slate-300 text-sm font-medium border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                {returnScreen === 'LEVEL_EDITOR' ? 'Вернуться в редактор' : 'Назад к меню'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          LEVEL COMPLETE MODAL
         ==================================================================== */}
      {screen === 'LEVEL_COMPLETE' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/12 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shrink-0"
                style={{ backgroundColor: currentLevel.accentColor }}
              >
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-400">
                  {mode === 'practice' ? 'Практика завершена' : 'Уровень пройден'}
                </div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  {currentLevel.title}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Результат</div>
                <div className="font-mono-tabular text-xl font-bold text-white mt-0.5">
                  {runBestPct}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Попыток</div>
                <div className="font-mono-tabular text-xl font-bold text-white mt-0.5">
                  {attempt}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Капли</div>
                <div className="font-mono-tabular text-xl font-bold text-amber-300 mt-0.5">
                  {dropsCount}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {nextLevel && (
                <button
                  type="button"
                  onClick={() => startOfficialLevel(nextLevel.id, 'normal')}
                  className="h-11 w-full rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-95 whitespace-nowrap cursor-pointer"
                  style={{ backgroundColor: nextLevel.accentColor }}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Следующий: {nextLevel.title}</span>
                </button>
              )}

              <button
                type="button"
                onClick={restartLevel}
                className="h-11 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Играть снова</span>
              </button>

              <button
                type="button"
                onClick={handleExitPlay}
                className="h-11 w-full rounded-xl bg-transparent hover:bg-white/5 text-slate-300 text-sm font-medium border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                {returnScreen === 'LEVEL_EDITOR' ? 'Вернуться в редактор' : 'Назад к меню'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
