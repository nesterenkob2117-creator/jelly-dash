import { buildStereoMadnessObjects } from './stereoMadness';
import { LevelDefinition, LevelObject } from './types';

let objCounter = 0;
function obj(
  type: LevelObject['type'],
  gx: number,
  gy: number,
  w = 1,
  h = 1
): LevelObject {
  objCounter += 1;
  return { id: `o_${objCounter}`, type, gx, gy, w, h };
}

function spikeRow(gx: number, gy: number, count: number, down = false): LevelObject[] {
  const res: LevelObject[] = [];
  for (let i = 0; i < count; i++) {
    res.push(obj(down ? 'spike_down' : 'spike', gx + i, gy));
  }
  return res;
}

function platform(gx: number, gy: number, w: number, h = 1): LevelObject {
  return obj('block', gx, gy, w, h);
}

// ============================================================================
// LEVEL 1: КЛУБНИЧНЫЙ СТАРТ (Strawberry Bounce) — 120 BPM, Легкий
// Base speed: 8.8 u/s. Flat jump = ~5.1u.
// ============================================================================
const level1Objects: LevelObject[] = [
  // Gentle warmup — collectible drops & first single spike
  obj('drop', 10, 0.3),
  obj('drop', 12, 0.3),
  obj('spike', 18, 0),
  obj('drop', 20.5, 2.1),

  // Second spike + double spike intro
  obj('spike', 28, 0),
  ...spikeRow(38, 0, 2),
  obj('drop', 39, 2.2),

  // First step-up platform
  platform(48, 0, 4, 1), // gy 0..1 at x=48..52
  obj('drop', 49.5, 1.4),
  platform(55, 0, 4, 2), // step up to gy=2
  obj('spike', 57, 2), // jump over spike on top of gy=2
  platform(62, 0, 5, 1), // drop down to gy=1
  obj('drop', 64, 1.4),

  // First Yellow Jelly Pad bounce over spike pit!
  obj('pad_yellow', 72, 0, 1, 0.4),
  ...spikeRow(74, 0, 3),
  platform(78, 0, 5, 3), // land high at gy=3!
  obj('drop', 80, 3.4),
  ...spikeRow(84, 0, 2),

  // Rhythm Orb section
  ...spikeRow(93, 0, 2),
  obj('orb_yellow', 96.5, 2.4),
  ...spikeRow(98, 0, 3),
  platform(102, 0, 4, 1),
  obj('drop', 103.5, 1.4),

  // Staircase climb with Pink Pad
  platform(111, 0, 3, 1),
  obj('pad_pink', 113, 1, 1, 0.4),
  platform(116, 0, 5, 3),
  obj('spike', 118.5, 3),
  obj('drop', 120, 3.4),

  // Fast rhythmic single spikes
  obj('spike', 128, 0),
  obj('spike', 135, 0),
  ...spikeRow(142, 0, 2),

  // Elevated sky bridge
  obj('pad_yellow', 151, 0, 1, 0.4),
  platform(155, 2, 6, 1), // floating platform gy=2..3
  obj('drop', 157, 3.4),
  obj('orb_yellow', 162.5, 3.8),
  platform(165, 3, 5, 1),
  obj('drop', 167, 4.4),
  ...spikeRow(165, 0, 5),

  // Cool down victory sprint
  obj('spike', 176, 0),
  ...spikeRow(183, 0, 2),
  obj('pad_pink', 190, 0, 1, 0.4),
  obj('drop', 193, 2.8),
  obj('drop', 196, 0.4),
  obj('drop', 198, 0.4),
];

// ============================================================================
// LEVEL 2: МЯТНАЯ ГРАВИТАЦИЯ (Mint Gravity) — 132 BPM, Средний
// Introduces Gravity Flip Portals, Ceiling Spikes, and Cyan Orbs!
// ============================================================================
const level2Objects: LevelObject[] = [
  // Opening rhythm
  obj('spike', 15, 0),
  ...spikeRow(23, 0, 2),
  platform(31, 0, 4, 1),
  obj('spike', 33, 1),
  obj('drop', 34.5, 1.4),

  // First Gravity Flip Portal!
  obj('portal_gravity_flip', 42, 0, 1.2, 8.75),
  // Player now rides on the CEILING (gy = 8.75, player top at 8.75)
  obj('drop', 48, 7.2),
  obj('spike_down', 53, 7.75), // ceiling spike pointing down!
  obj('drop', 56, 6.2),
  ...spikeRow(62, 7.75, 2, true), // double ceiling spike

  // Ceiling platform step
  platform(70, 6.75, 5, 2), // hanging from ceiling (gy 6.75..8.75)
  obj('drop', 72.5, 5.9),
  obj('spike_down', 78, 7.75),

  // Flip back to Normal Gravity
  obj('portal_gravity_normal', 86, 0, 1.2, 8.75),
  obj('drop', 91, 0.5),
  ...spikeRow(96, 0, 2),

  // Cyan Gravity Orb challenge!
  obj('pad_yellow', 105, 0, 1, 0.4),
  ...spikeRow(107, 0, 3),
  obj('orb_cyan', 110.5, 4.2), // tap to flip up to ceiling!
  // Safe ceiling landing zone
  ...spikeRow(112, 0, 4),
  obj('drop', 117, 7.2),
  obj('spike_down', 122, 7.75),

  // Downward portal back to floor
  obj('portal_gravity_normal', 129, 0, 1.2, 8.75),
  platform(134, 0, 4, 1),
  obj('orb_yellow', 139.5, 2.4),
  ...spikeRow(140, 0, 3),
  platform(144, 0, 5, 2),
  obj('drop', 146, 2.4),

  // Speed up for final section!
  obj('portal_speed_fast', 154, 0, 1.2, 8.75),
  obj('spike', 162, 0),
  ...spikeRow(170, 0, 2),
  obj('pad_yellow', 178, 0, 1, 0.4),
  ...spikeRow(180, 0, 3),
  platform(185, 2, 5, 1),
  obj('drop', 187, 3.4),

  // Final quick gravity flip & return
  obj('portal_gravity_flip', 196, 0, 1.2, 8.75),
  obj('spike_down', 204, 7.75),
  obj('portal_gravity_normal', 212, 0, 1.2, 8.75),
  obj('drop', 218, 0.5),
  obj('spike', 223, 0),
  obj('drop', 229, 0.5),
];

// ============================================================================
// LEVEL 3: МАНГОВЫЙ РЫВОК (Mango Rush) — 145 BPM, Сложный
// Fast paced, triple spikes, chained orbs, dual-tier platforms & portals!
// ============================================================================
const level3Objects: LevelObject[] = [
  // Immediate fast energy
  ...spikeRow(14, 0, 2),
  platform(21, 0, 3, 1),
  obj('orb_yellow', 25.5, 2.3),
  ...spikeRow(26, 0, 3),
  platform(30, 0, 4, 2),
  obj('spike', 32, 2),

  // Speed Boost!
  obj('portal_speed_fast', 39, 0, 1.2, 8.75),
  ...spikeRow(47, 0, 3),
  obj('drop', 48.5, 2.2),
  ...spikeRow(57, 0, 2),
  obj('pad_yellow', 64, 0, 1, 0.4),
  ...spikeRow(66, 0, 4),
  platform(71, 2, 4, 1),
  obj('orb_yellow', 76.5, 3.8),
  platform(80, 3, 5, 1),
  obj('spike', 82.5, 4),
  ...spikeRow(75, 0, 10),

  // Mid-air Cyan Orb flip into ceiling tunnel
  obj('orb_cyan', 87.5, 3.5),
  obj('drop', 94, 7.2),
  ...spikeRow(99, 7.75, 2, true),
  platform(107, 6.75, 4, 2),
  obj('drop', 109, 5.9),
  ...spikeRow(115, 7.75, 3, true),

  // Second Cyan Orb back down!
  obj('orb_cyan', 123, 5.6),
  platform(128, 0, 4, 1),
  obj('drop', 130, 1.4),

  // Rhythm Staircase + Pads
  obj('pad_pink', 136, 0, 1, 0.4),
  platform(140, 2, 3, 1),
  obj('pad_pink', 142, 3, 1, 0.4),
  platform(146, 4, 4, 1),
  obj('drop', 148, 5.4),
  ...spikeRow(140, 0, 10),

  // Back to normal speed precision section
  obj('portal_speed_normal', 155, 0, 1.2, 8.75),
  ...spikeRow(162, 0, 3),
  obj('orb_yellow', 168.5, 2.1),
  ...spikeRow(170, 0, 3),

  // Final Fast Dash Finale
  obj('portal_speed_fast', 178, 0, 1.2, 8.75),
  obj('portal_gravity_flip', 186, 0, 1.2, 8.75),
  ...spikeRow(194, 7.75, 2, true),
  obj('portal_gravity_normal', 202, 0, 1.2, 8.75),
  ...spikeRow(210, 0, 3),
  obj('pad_yellow', 218, 0, 1, 0.4),
  ...spikeRow(220, 0, 4),
  obj('drop', 226, 3.0),
  obj('drop', 231, 0.5),
];

export const LEVELS: LevelDefinition[] = [
  {
    id: 'level_1',
    order: 1,
    title: 'Клубничный Старт',
    subtitle: 'Батуты, шипы и мягкий ритм',
    difficulty: 'Легкий',
    bpm: 120,
    baseSpeed: 8.5,
    lengthUnits: 204,
    accentColor: '#FB3768',
    bgTop: '#0F172A',
    bgBottom: '#1E1B3A',
    groundColor: '#1E293B',
    gridColor: 'rgba(251, 55, 104, 0.08)',
    musicKey: 'strawberry',
    objects: level1Objects,
  },
  {
    id: 'level_2',
    order: 2,
    title: 'Мятная Гравитация',
    subtitle: 'Порталы переворота и гель-сферы',
    difficulty: 'Средний',
    bpm: 132,
    baseSpeed: 8.9,
    lengthUnits: 235,
    accentColor: '#10B981',
    bgTop: '#0B1524',
    bgBottom: '#0F292E',
    groundColor: '#132A2E',
    gridColor: 'rgba(16, 185, 129, 0.08)',
    musicKey: 'mint',
    objects: level2Objects,
  },
  {
    id: 'level_3',
    order: 3,
    title: 'Манговый Рывок',
    subtitle: 'Ускорение, серии сфер и тройные шипы',
    difficulty: 'Сложный',
    bpm: 145,
    baseSpeed: 9.3,
    lengthUnits: 238,
    accentColor: '#F59E0B',
    bgTop: '#13111C',
    bgBottom: '#2A1810',
    groundColor: '#261D17',
    gridColor: 'rgba(245, 158, 11, 0.08)',
    musicKey: 'mango',
    objects: level3Objects,
  },
  {
    id: 'level_stereo',
    order: 4,
    title: 'Stereo Madness',
    subtitle: 'Код GD · Ступени, шипы и полёт на корабле',
    difficulty: 'Классика',
    bpm: 160,
    baseSpeed: 7.9,
    lengthUnits: 546,
    ceilingGy: 12.5,
    accentColor: '#3B82F6',
    bgTop: '#0B1437',
    bgBottom: '#172554',
    groundColor: '#172554',
    gridColor: 'rgba(59, 130, 246, 0.12)',
    musicKey: 'stereo',
    objects: buildStereoMadnessObjects(),
  },
];

export function getLevelById(id: string): LevelDefinition {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
