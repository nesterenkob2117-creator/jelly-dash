import { CEILING_GY } from './constants';
import { CustomLevelData, LevelObject } from './types';

interface RawGDObject {
  id: number;
  x: number;
  y: number;
  rot: number;
}

const GD_GRID = 30;
const BLOCK_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7,
  46, 47, 48, 49,
  62, 63, 64, 65, 66, 67, 68,
  69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
  83, 99, 100, 101, 102,
  209, 210, 211, 212, 213, 214,
  467, 468, 469, 470, 471, 472,
  503, 504, 505,
  675, 676, 677, 678, 679, 680,
  737,
]);

const HALF_SPIKE_IDS = new Set([9, 39, 103, 135]);

/**
 * Parses a Geometry Dash decoded object string (e.g., `kS38,...;1,8,2,525,3,15;...`)
 * into Jelly Dash `LevelObject[]` and merges contiguous 1x1 blocks horizontally.
 */
export function parseGDLevelString(rawLevelData: string, prefix = 'gd'): LevelObject[] {
  const tokens = rawLevelData.split(';');
  const parsed: RawGDObject[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token || token.startsWith('k')) continue;

    const parts = token.split(',');
    const map: Record<string, string> = {};
    for (let j = 0; j + 1 < parts.length; j += 2) {
      map[parts[j]] = parts[j + 1];
    }

    const id = Number(map['1']);
    const x = Number(map['2']);
    const y = Number(map['3']);
    const rot = map['6'] ? Number(map['6']) : 0;

    if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || y < -30) continue;

    parsed.push({ id, x, y, rot });
  }

  const objects: LevelObject[] = [];
  const blockCells: Array<{ gx: number; gy: number }> = [];
  let counter = 0;

  const nextId = () => {
    counter += 1;
    return `${prefix}_${counter}`;
  };

  for (const item of parsed) {
    const gx = Math.round(((item.x - 15) / GD_GRID) * 100) / 100;
    const gy = Math.round(((item.y - 15) / GD_GRID) * 100) / 100;

    if (BLOCK_IDS.has(item.id)) {
      const cellX = Math.round((item.x - 15) / GD_GRID);
      const cellY = Math.max(0, Math.round((item.y - 15) / GD_GRID));
      blockCells.push({ gx: cellX, gy: cellY });
      continue;
    }

    // ID 40: Half-slab (height 0.5u)
    if (item.id === 40) {
      const snappedGy = Math.max(0, Math.round(((item.y - 7.5) / GD_GRID) * 2) / 2);
      objects.push({
        id: nextId(),
        type: 'block',
        gx: Math.round(gx),
        gy: snappedGy,
        w: 1,
        h: 0.5,
      });
      continue;
    }

    // ID 8: Full spike
    if (item.id === 8) {
      const isDown = Math.abs(Math.abs(item.rot) - 180) < 25;
      objects.push({
        id: nextId(),
        type: isDown ? 'spike_down' : 'spike',
        gx: Math.round(gx),
        gy: Math.max(0, Math.round(gy)),
        w: 1,
        h: 1,
      });
      continue;
    }

    // Half-height / small spikes
    if (HALF_SPIKE_IDS.has(item.id)) {
      const isDown = Math.abs(Math.abs(item.rot) - 180) < 25;
      const baseGy = item.y <= 10 ? 0 : Math.max(0, Math.round(((item.y - 7.5) / GD_GRID) * 2) / 2);
      objects.push({
        id: nextId(),
        type: isDown ? 'spike_down' : 'spike',
        gx: Math.round(gx),
        gy: baseGy,
        w: 1,
        h: 0.48,
      });
      continue;
    }

    // Secret / User Coin -> collectible Jelly Drop
    if (item.id === 1329 || item.id === 142) {
      objects.push({
        id: nextId(),
        type: 'drop',
        gx,
        gy: Math.max(0.3, gy),
        w: 1,
        h: 1,
      });
      continue;
    }

    // Pads & Orbs
    if (item.id === 35) {
      objects.push({ id: nextId(), type: 'pad_yellow', gx, gy: Math.max(0, gy), w: 1, h: 0.4 });
    } else if (item.id === 140) {
      objects.push({ id: nextId(), type: 'pad_pink', gx, gy: Math.max(0, gy), w: 1, h: 0.4 });
    } else if (item.id === 36 || item.id === 141) {
      objects.push({ id: nextId(), type: 'orb_yellow', gx, gy: Math.max(0, gy), w: 1, h: 1 });
    } else if (item.id === 84 || item.id === 1022) {
      objects.push({ id: nextId(), type: 'orb_cyan', gx, gy: Math.max(0, gy), w: 1, h: 1 });
    } else if (item.id === 10) {
      objects.push({ id: nextId(), type: 'portal_gravity_normal', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 11) {
      objects.push({ id: nextId(), type: 'portal_gravity_flip', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 12) {
      objects.push({ id: nextId(), type: 'portal_cube', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 13) {
      objects.push({ id: nextId(), type: 'portal_ship', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 111) {
      objects.push({ id: nextId(), type: 'portal_ufo', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 660) {
      objects.push({ id: nextId(), type: 'portal_wave', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 200 || item.id === 201) {
      objects.push({ id: nextId(), type: 'portal_speed_normal', gx, gy: 0, w: 1.2, h: 12.5 });
    } else if (item.id === 202 || item.id === 203 || item.id === 1334) {
      objects.push({ id: nextId(), type: 'portal_speed_fast', gx, gy: 0, w: 1.2, h: 12.5 });
    }
  }

  // Deduplicate and merge contiguous horizontal 1x1 block runs by row
  const byRow = new Map<number, number[]>();
  const seen = new Set<string>();
  for (const cell of blockCells) {
    const key = `${cell.gx}:${cell.gy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byRow.get(cell.gy) ?? [];
    list.push(cell.gx);
    byRow.set(cell.gy, list);
  }

  for (const [gy, xs] of byRow.entries()) {
    xs.sort((a, b) => a - b);
    let runStart = xs[0];
    let runLen = 1;
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] === runStart + runLen) {
        runLen += 1;
      } else {
        objects.push({ id: nextId(), type: 'block', gx: runStart, gy, w: runLen, h: 1 });
        runStart = xs[i];
        runLen = 1;
      }
    }
    objects.push({ id: nextId(), type: 'block', gx: runStart, gy, w: runLen, h: 1 });
  }

  // Remove half-spikes completely buried inside solid 1x1 block cells
  const filtered = objects.filter((o) => {
    if (o.type === 'spike' && (o.h ?? 1) < 1) {
      return !seen.has(`${Math.round(o.gx)}:${Math.round(o.gy)}`);
    }
    return true;
  });

  filtered.sort((a, b) => a.gx - b.gx || a.gy - b.gy);
  return filtered;
}

function base64ToUint8Array(b64Input: string): Uint8Array {
  let clean = b64Input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (clean.length % 4 !== 0) {
    clean += '=';
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function tryDecompressStream(bytes: Uint8Array, format: 'gzip' | 'deflate' | 'deflate-raw'): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Браузер не поддерживает DecompressionStream');
  }
  const ds = new DecompressionStream(format);
  const blobPart = new Uint8Array(bytes);
  const stream = new Blob([blobPart]).stream().pipeThrough(ds);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        result += decoder.decode(value, { stream: true });
      }
    }
    result += decoder.decode();
  } catch {
    // Partial recovery: return whatever valid GD tokens were decoded before truncation
  }

  return result;
}

function extractTagValue(xml: string, keyName: string): string | null {
  const regex = new RegExp(`<k>${keyName}</k>\\s*<s>([\\s\\S]*?)</s>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

export interface ImportedGDLevelResult {
  title: string;
  author: string;
  objects: LevelObject[];
  lengthUnits: number;
  ceilingGy: number;
  rawObjectCount: number;
}

/**
 * Imports official Geometry Dash levels from:
 * - `.gmd` XML text
 * - Compressed Base64 (`H4sI...` gzip / zlib)
 * - Raw GD semicolon object string (`1,8,2,525,3,15;...`)
 * - Jelly Dash share string (`JELLY1:...` or JSON)
 */
export async function importGDLevel(rawInput: string, fallbackTitle = 'Уровень из GD'): Promise<ImportedGDLevelResult> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Вставьте код уровня Geometry Dash или .gmd файл');
  }

  // 1. Check Jelly Dash Share format
  if (trimmed.startsWith('JELLY1:') || trimmed.startsWith('{')) {
    const jsonText = trimmed.startsWith('JELLY1:') ? trimmed.slice(7) : trimmed;
    const parsed = JSON.parse(jsonText) as Partial<CustomLevelData>;
    if (Array.isArray(parsed.objects) && parsed.objects.length > 0) {
      const objects = parsed.objects.map((o, idx) => ({
        ...o,
        id: o.id || `imp_${idx + 1}`,
      }));
      const maxX = objects.reduce((acc, o) => Math.max(acc, o.gx + (o.w ?? 1)), 60);
      const maxY = objects.reduce((acc, o) => Math.max(acc, o.gy + (o.h ?? 1)), 0);
      const hasFlight = objects.some(
        (o) => o.type === 'portal_ship' || o.type === 'portal_ufo' || o.type === 'portal_wave'
      );
      return {
        title: parsed.title || fallbackTitle,
        author: parsed.author || 'Игрок',
        objects,
        lengthUnits: Math.max(60, Math.ceil(maxX + 12)),
        ceilingGy: hasFlight || maxY > 7.5 ? 12.5 : CEILING_GY,
        rawObjectCount: objects.length,
      };
    }
  }

  // 2. Extract from .gmd XML if present
  let title = fallbackTitle;
  let author = 'GD Импорт';
  let payload = trimmed;

  if (trimmed.includes('<k>k4</k>') || trimmed.includes('<plist')) {
    const extractedTitle = extractTagValue(trimmed, 'k2');
    const extractedAuthor = extractTagValue(trimmed, 'k5');
    const extractedData = extractTagValue(trimmed, 'k4');
    if (extractedTitle) title = extractedTitle;
    if (extractedAuthor) author = extractedAuthor;
    if (extractedData) {
      payload = extractedData;
    }
  }

  // 3. Decompress if Base64 (H4sI... or eJz...)
  let decodedText = payload;
  if (!payload.includes(';') && /^[A-Za-z0-9+/_-]{16,}={0,2}$/.test(payload.replace(/\s+/g, ''))) {
    const bytes = base64ToUint8Array(payload);
    // Check gzip magic header 0x1f 0x8b
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      decodedText = await tryDecompressStream(bytes, 'gzip');
    } else if (bytes[0] === 0x78) {
      decodedText = await tryDecompressStream(bytes, 'deflate');
    } else {
      decodedText = await tryDecompressStream(bytes, 'deflate-raw');
    }

    // Double-encoded GD payloads sometimes wrap k4 inner string in base64 again
    if (decodedText && !decodedText.includes(';') && /^[A-Za-z0-9+/_-]{16,}={0,2}$/.test(decodedText.trim())) {
      const innerBytes = base64ToUint8Array(decodedText.trim());
      if (innerBytes[0] === 0x1f && innerBytes[1] === 0x8b) {
        decodedText = await tryDecompressStream(innerBytes, 'gzip');
      }
    }
  }

  if (!decodedText || !decodedText.includes(',')) {
    throw new Error('Не удалось распознать объекты Geometry Dash в этом коде');
  }

  const objects = parseGDLevelString(decodedText, `gd_${Date.now().toString(36)}`);
  if (objects.length === 0) {
    throw new Error('В коде не найдено ни одного поддерживаемого объекта GD (блоки, шипы, порталы, батуты)');
  }

  const maxX = objects.reduce((acc, o) => Math.max(acc, o.gx + (o.w ?? 1)), 60);
  const maxY = objects.reduce((acc, o) => Math.max(acc, o.gy + (o.h ?? 1)), 0);
  const hasFlight = objects.some(
    (o) => o.type === 'portal_ship' || o.type === 'portal_ufo' || o.type === 'portal_wave'
  );

  return {
    title,
    author,
    objects,
    lengthUnits: Math.max(80, Math.ceil(maxX + 14)),
    ceilingGy: hasFlight || maxY > 7.5 ? 12.5 : CEILING_GY,
    rawObjectCount: objects.length,
  };
}

/**
 * Serializes a Jelly Dash custom level to an official-compatible GD object string.
 */
export function exportLevelToGDString(level: CustomLevelData): string {
  const parts: string[] = ['kS38,1_40_2_125_3_255_11_255_12_255_13_255_4_-1_6_1000_7_1_15_1_18_0_8_1'];
  for (const o of level.objects) {
    const x = Math.round(o.gx * GD_GRID + 15);
    const y = Math.round(o.gy * GD_GRID + 15);
    if (o.type === 'block') {
      const wCount = Math.max(1, Math.round(o.w ?? 1));
      const h = o.h ?? 1;
      if (h <= 0.55) {
        for (let dx = 0; dx < wCount; dx++) {
          parts.push(`1,40,2,${x + dx * GD_GRID},3,${Math.round(o.gy * GD_GRID + 23)}`);
        }
      } else {
        const hCount = Math.max(1, Math.round(h));
        for (let dx = 0; dx < wCount; dx++) {
          for (let dy = 0; dy < hCount; dy++) {
            parts.push(`1,1,2,${x + dx * GD_GRID},3,${y + dy * GD_GRID}`);
          }
        }
      }
    } else if (o.type === 'spike') {
      const id = (o.h ?? 1) < 0.7 ? 9 : 8;
      parts.push(`1,${id},2,${x},3,${id === 9 ? Math.round(o.gy * GD_GRID + 8) : y}`);
    } else if (o.type === 'spike_down') {
      parts.push(`1,8,2,${x},3,${y},6,180`);
    } else if (o.type === 'pad_yellow') {
      parts.push(`1,35,2,${x},3,${y}`);
    } else if (o.type === 'pad_pink') {
      parts.push(`1,140,2,${x},3,${y}`);
    } else if (o.type === 'orb_yellow') {
      parts.push(`1,36,2,${x},3,${y}`);
    } else if (o.type === 'orb_cyan') {
      parts.push(`1,84,2,${x},3,${y}`);
    } else if (o.type === 'portal_gravity_normal') {
      parts.push(`1,10,2,${x},3,90`);
    } else if (o.type === 'portal_gravity_flip') {
      parts.push(`1,11,2,${x},3,90`);
    } else if (o.type === 'portal_cube') {
      parts.push(`1,12,2,${x},3,90`);
    } else if (o.type === 'portal_ship') {
      parts.push(`1,13,2,${x},3,90`);
    } else if (o.type === 'portal_ufo') {
      parts.push(`1,111,2,${x},3,90`);
    } else if (o.type === 'portal_wave') {
      parts.push(`1,660,2,${x},3,90`);
    } else if (o.type === 'portal_speed_normal') {
      parts.push(`1,201,2,${x},3,90`);
    } else if (o.type === 'portal_speed_fast') {
      parts.push(`1,202,2,${x},3,90`);
    } else if (o.type === 'drop') {
      parts.push(`1,1329,2,${x},3,${y}`);
    }
  }
  return parts.join(';');
}
