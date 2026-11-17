import { parseGDLevelString } from './gdParser';
import { LevelObject } from './types';

/**
 * Decoded opening sequence from the user's Stereo Madness `.gmd` export
 * (exact GD coordinates: x = 15 + gx*30, y = 15 + gy*30).
 */
const STEREO_MADNESS_GD_OPENING = [
  '1,29,2,135,3,135,36,1,7,158,8,3,9,255,10,10,35,1,23,1000',
  '1,30,2,135,3,165,36,1,7,96,8,0,9,185,10,10,35,1,23,1001',
  '1,8,2,525,3,15',
  '1,39,2,975,3,6',
  '1,8,2,1005,3,15',
  '1,8,2,1485,3,15',
  '1,8,2,1455,3,15',
  '1,1,2,1515,3,15',
  '1,9,2,1545,3,2',
  '1,9,2,1575,3,2',
  '1,20,2,1575,3,13',
  '1,16,2,1515,3,44',
  '1,1,2,1635,3,45',
  '1,9,2,1605,3,2',
  '1,9,2,1635,3,2',
  '1,9,2,1665,3,2',
  '1,7,2,1635,3,15',
  '1,9,2,1695,3,2',
  '1,19,2,1695,3,19',
  '1,16,2,1635,3,74',
  '1,9,2,1725,3,2',
  '1,1,2,1755,3,75',
  '1,7,2,1755,3,45',
  '1,7,2,1755,3,15',
  '1,16,2,1755,3,104',
  '1,8,2,2385,3,15',
  '1,8,2,2415,3,15',
  '1,3,2,2595,3,15',
  '1,2,2,2625,3,15',
  '1,2,2,2655,3,15',
  '1,2,2,2685,3,15',
  '1,2,2,2715,3,15',
  '1,2,2,2745,3,15',
  '1,2,2,2775,3,15',
  '1,3,2,2805,3,15,4,1',
  '1,9,2,2835,3,2',
  '1,9,2,2865,3,2',
  '1,9,2,2895,3,2',
  '1,20,2,2865,3,13',
  '1,3,2,2925,3,15',
  '1,2,2,2955,3,15',
  '1,2,2,2985,3,15',
  '1,2,2,3015,3,15',
  '1,2,2,3045,3,15',
  '1,2,2,3075,3,15',
  '1,8,2,3075,3,45',
  '1,2,2,3105,3,15',
  '1,2,2,3135,3,15',
  '1,2,2,3165,3,15',
  '1,2,2,3195,3,15',
  '1,3,2,3225,3,15,4,1',
  '1,9,2,3255,3,2',
  '1,9,2,3285,3,2',
  '1,21,2,3285,3,7',
  '1,9,2,3315,3,2',
  '1,3,2,3345,3,45',
  '1,2,2,3345,3,15,6,-90',
  '1,2,2,3375,3,45',
  '1,5,2,3375,3,15',
  '1,2,2,3405,3,45',
  '1,2,2,3435,3,45',
  '1,2,2,3465,3,45',
  '1,2,2,3495,3,45',
  '1,5,2,3405,3,15',
  '1,5,2,3435,3,15',
  '1,5,2,3465,3,15',
  '1,5,2,3495,3,15',
  '1,2,2,3525,3,45',
  '1,5,2,3525,3,15',
  '1,2,2,3585,3,45',
  '1,2,2,3555,3,45',
  '1,5,2,3585,3,15',
  '1,5,2,3555,3,15',
  '1,8,2,3555,3,75',
  '1,2,2,3645,3,45',
  '1,2,2,3675,3,45',
  '1,2,2,3615,3,45',
  '1,5,2,3615,3,15',
  '1,5,2,3645,3,15',
  '1,5,2,3675,3,15',
  '1,27,2,3615,3,165,36,1',
  '1,9,2,3765,3,2',
  '1,9,2,3795,3,2',
  '1,3,2,3735,3,45,4,1',
  '1,2,2,3735,3,15,6,90',
  '1,5,2,3705,3,15',
  '1,2,2,3705,3,45',
  '1,9,2,3825,3,2',
  '1,9,2,3885,3,2',
  '1,9,2,3855,3,2',
  '1,40,2,3855,3,83',
  '1,17,2,3855,3,71,5,1',
  '1,18,2,3855,3,19',
  '1,9,2,3915,3,2',
  '1,9,2,3945,3,2',
  '1,9,2,3975,3,2',
  '1,40,2,3975,3,113',
  '1,17,2,3975,3,101,5,1',
  '1,9,2,4005,3,2',
  '1,9,2,4035,3,2',
  '1,9,2,4065,3,2',
  '1,9,2,4095,3,2',
  '1,21,2,4035,3,7',
  '1,40,2,4095,3,143',
  '1,17,2,4095,3,131,5,1',
  '1,9,2,4125,3,2',
  '1,9,2,4155,3,2',
  '1,9,2,4185,3,2',
  '1,9,2,4215,3,2',
  '1,9,2,4245,3,2',
  '1,9,2,4275,3,2',
  '1,19,2,4209,3,19',
  '1,40,2,4215,3,173',
  '1,17,2,4215,3,161,5,1',
  '1,9,2,4305,3,2',
  '1,9,2,4335,3,2',
  '1,9,2,4365,3,2',
  // 5th half-slab step at gx=144 + remaining pit half-spikes up to gx=148
  '1,40,2,4335,3,203',
  '1,9,2,4395,3,2',
  '1,9,2,4425,3,2',
  '1,9,2,4455,3,2',
].join(';');

let smId = 0;
function smObj(
  type: LevelObject['type'],
  gx: number,
  gy: number,
  w = 1,
  h = 1
): LevelObject {
  smId += 1;
  return { id: `sm_${smId}`, type, gx, gy, w, h };
}

function halfSpikeRow(gx: number, gy: number, count: number): LevelObject[] {
  const out: LevelObject[] = [];
  for (let i = 0; i < count; i++) {
    out.push(smObj('spike', gx + i, gy, 1, 0.48));
  }
  return out;
}

function spikeRow(gx: number, gy: number, count: number, down = false): LevelObject[] {
  const out: LevelObject[] = [];
  for (let i = 0; i < count; i++) {
    out.push(smObj(down ? 'spike_down' : 'spike', gx + i, gy, 1, 1));
  }
  return out;
}

export function buildStereoMadnessObjects(): LevelObject[] {
  const opening = parseGDLevelString(STEREO_MADNESS_GD_OPENING, 'sm_gd');

  // Continuation: Authentic Stereo Madness progression after the 5 ascending half-slabs (gx = 148)
  const continuation: LevelObject[] = [
    // Landing onto ground after the 5 ascending half-slabs
    smObj('drop', 152, 0.4),
    smObj('spike', 157, 0),

    // Stepped 1 -> 2 -> 3 block staircase with floor half-spikes
    smObj('block', 164, 0, 5, 1),
    smObj('drop', 166.5, 1.4),
    ...halfSpikeRow(169, 0, 2),

    smObj('block', 171, 0, 5, 2),
    ...halfSpikeRow(176, 0, 2),

    smObj('block', 178, 0, 6, 3),
    smObj('spike', 180.5, 3),
    smObj('drop', 182.5, 3.4),

    // Drop down to flat floor -> double spike -> triple spike lead-in to Ship 1!
    ...spikeRow(189, 0, 2),
    ...spikeRow(200, 0, 3),

    // =========================================================================
    // SHIP 1 (gx = 211 -> 302): Classic 1.0 Stereo Madness wide ship flight
    // =========================================================================
    smObj('portal_ship', 211, 0, 1.2, 12.5),
    smObj('drop', 217, 3.5),

    // Upper overhang & lower floor step
    smObj('block', 226, 8, 5, 4.5),
    smObj('block', 238, 0, 5, 2.5),
    smObj('drop', 240.5, 4.2),

    // Classic floating block islands in mid-air
    smObj('block', 252, 4.5, 4, 2),
    smObj('drop', 254, 7.6),
    smObj('block', 268, 2.8, 4, 2),
    smObj('drop', 270, 6.2),

    // Wide gate before Cube 2
    smObj('block', 284, 0, 4, 3),
    smObj('block', 284, 8.8, 4, 3.7),

    // =========================================================================
    // CUBE 2 (gx = 302 -> 392): Triple spikes, 1-2-3 climb, high roof slabs
    // =========================================================================
    smObj('portal_cube', 302, 0, 1.2, 12.5),
    smObj('drop', 307, 0.5),
    ...spikeRow(314, 0, 3),

    // Ascending 1 -> 2 -> 3 platforms
    smObj('block', 324, 0, 4, 1),
    ...halfSpikeRow(328, 0, 2),
    smObj('block', 330, 0, 4, 2),
    ...halfSpikeRow(334, 0, 2),
    smObj('block', 336, 0, 5, 3),

    // High half-slab sky hop under ceiling blocks
    smObj('block', 343, 4, 3, 0.5),
    smObj('block', 349, 5, 3, 0.5),
    smObj('block', 348, 9.5, 7, 1.5),
    smObj('drop', 350.5, 6.5),
    smObj('block', 355, 4, 4, 0.5),
    ...halfSpikeRow(343, 0, 16),

    // Ground landing -> double spike -> triple spike into Ship 2
    ...spikeRow(368, 0, 2),
    ...spikeRow(380, 0, 3),

    // =========================================================================
    // SHIP 2 (gx = 392 -> 472): Steeper alternating corridor & spike island
    // =========================================================================
    smObj('portal_ship', 392, 0, 1.2, 12.5),
    smObj('drop', 397, 4.0),

    smObj('block', 406, 0, 3, 3.5),
    smObj('block', 406, 9.2, 3, 3.3),

    smObj('block', 421, 0, 3, 2.2),
    smObj('block', 421, 7.6, 3, 4.9),
    ...spikeRow(421, 6.6, 3, true),
    smObj('drop', 428, 4.8),

    smObj('block', 437, 4.0, 4, 1.5),
    smObj('spike', 438, 5.5),
    smObj('spike', 439, 5.5),
    smObj('drop', 439, 7.4),

    smObj('block', 454, 0, 3, 3.2),
    smObj('block', 454, 8.8, 3, 3.7),

    // =========================================================================
    // FINAL CUBE (gx = 472 -> 546): Classic Stereo Madness ending!
    // =========================================================================
    smObj('portal_cube', 472, 0, 1.2, 12.5),
    smObj('drop', 477, 0.5),

    smObj('spike', 482, 0),
    ...spikeRow(489, 0, 2),

    // Clean 1 -> 2 -> 3 staircase
    smObj('block', 497, 0, 4, 1),
    ...halfSpikeRow(501, 0, 2),
    smObj('block', 503, 0, 5, 2),
    ...halfSpikeRow(508, 0, 2),
    smObj('block', 510, 0, 6, 3),
    smObj('drop', 513, 3.4),

    // Final double spike + iconic ending triple spike
    ...spikeRow(522, 0, 2),
    ...spikeRow(532, 0, 3),
    smObj('drop', 533, 2.3),
    smObj('drop', 540, 0.5),
    smObj('drop', 543, 0.5),
  ];

  return [...opening, ...continuation];
}
