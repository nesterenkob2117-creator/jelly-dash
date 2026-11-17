export type AppScreen =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'ICON_KIT'
  | 'CREATOR_HUB'
  | 'MY_LEVELS'
  | 'SAVED_LEVELS'
  | 'SEARCH_LEVELS'
  | 'LEVEL_DETAIL'
  | 'LEVEL_EDITOR'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE';

export type GameState = AppScreen;

export type GameMode = 'normal' | 'practice';

export type VehicleType = 'cube' | 'ship' | 'ufo' | 'wave';

export type CubeIconId = 'classic' | 'cyclops' | 'visor' | 'star' | 'crown' | 'ninja';

export type ShipIconId = 'dart' | 'shark' | 'rocket' | 'dragon' | 'jet';

export type UfoIconId = 'classic_saucer' | 'jelly_dome' | 'cyber_pod';

export type WaveIconId = 'razor_dart' | 'crystal_arrow' | 'jelly_bolt';

export type ObstacleType =
  | 'block'
  | 'spike'
  | 'spike_down'
  | 'pad_yellow'
  | 'pad_pink'
  | 'orb_yellow'
  | 'orb_cyan'
  | 'portal_gravity_flip'
  | 'portal_gravity_normal'
  | 'portal_speed_fast'
  | 'portal_speed_normal'
  | 'portal_ship'
  | 'portal_cube'
  | 'portal_ufo'
  | 'portal_wave'
  | 'drop';

export interface LevelObject {
  id: string;
  type: ObstacleType;
  /** Grid X coordinate (1 unit = 48px) */
  gx: number;
  /** Grid Y coordinate above ground (0 = sitting on ground) */
  gy: number;
  /** Width in grid units (default 1) */
  w?: number;
  /** Height in grid units (default 1) */
  h?: number;
}

export interface LevelDefinition {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  difficulty: 'Легкий' | 'Средний' | 'Сложный' | 'Классика';
  bpm: number;
  /** Base horizontal speed in grid units per second */
  baseSpeed: number;
  /** Total length in grid units to finish line */
  lengthUnits: number;
  /** Optional custom ceiling height in grid units (defaults to CEILING_GY) */
  ceilingGy?: number;
  accentColor: string;
  bgTop: string;
  bgBottom: string;
  groundColor: string;
  gridColor: string;
  musicKey: 'strawberry' | 'mint' | 'mango' | 'stereo';
  objects: LevelObject[];
}

export interface CustomLevelData {
  id: string;
  title: string;
  author: string;
  authorUid?: string;
  description: string;
  difficulty: LevelDefinition['difficulty'];
  bpm: number;
  baseSpeed: number;
  lengthUnits: number;
  ceilingGy: number;
  accentColor: string;
  bgTop: string;
  bgBottom: string;
  groundColor: string;
  gridColor: string;
  musicKey: LevelDefinition['musicKey'];
  objects: LevelObject[];
  createdAt: number;
  updatedAt: number;
  published?: boolean;
  likes?: number;
  downloads?: number;
}

export interface JellySkin {
  id: string;
  name: string;
  flavor: string;
  bodyColor: string;
  innerColor: string;
  highlightColor: string;
  rimColor: string;
  trailColor: string;
}

export interface LevelProgress {
  bestNormal: number;
  bestPractice: number;
  attempts: number;
  completed: boolean;
}

export interface SavedData {
  progress: Record<string, LevelProgress>;
  selectedSkinId: string;
  selectedCubeIcon: CubeIconId;
  selectedShipIcon: ShipIconId;
  selectedUfoIcon: UfoIconId;
  selectedWaveIcon: WaveIconId;
  selectedLevelId: string;
  muted: boolean;
  myLevels: CustomLevelData[];
  savedLevels: CustomLevelData[];
  publishedLevels: CustomLevelData[];
}

export interface Checkpoint {
  x: number;
  y: number;
  vy: number;
  gravityDir: 1 | -1;
  speedMult: number;
  vehicle: VehicleType;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  bounces?: boolean;
  ring?: boolean;
}

export interface TrailNode {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  color: string;
}
