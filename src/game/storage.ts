import { CEILING_GY, STORAGE_KEY } from './constants';
import { LEVELS } from './levels';
import { JELLY_SKINS } from './skins';
import { CustomLevelData, LevelDefinition, LevelProgress, SavedData } from './types';

function createDefaultProgress(): Record<string, LevelProgress> {
  const map: Record<string, LevelProgress> = {};
  for (const lvl of LEVELS) {
    map[lvl.id] = {
      bestNormal: 0,
      bestPractice: 0,
      attempts: 0,
      completed: false,
    };
  }
  return map;
}

export function customToLevelDefinition(custom: CustomLevelData, order = 99): LevelDefinition {
  return {
    id: custom.id,
    order,
    title: custom.title,
    subtitle: `${custom.author} · ${custom.objects.length} объектов`,
    difficulty: custom.difficulty,
    bpm: custom.bpm,
    baseSpeed: custom.baseSpeed,
    lengthUnits: custom.lengthUnits,
    ceilingGy: custom.ceilingGy ?? CEILING_GY,
    accentColor: custom.accentColor,
    bgTop: custom.bgTop,
    bgBottom: custom.bgBottom,
    groundColor: custom.groundColor,
    gridColor: custom.gridColor,
    musicKey: custom.musicKey,
    objects: custom.objects,
  };
}

export function loadSavedData(): SavedData {
  const defaults: SavedData = {
    progress: createDefaultProgress(),
    selectedSkinId: JELLY_SKINS[0].id,
    selectedCubeIcon: 'classic',
    selectedShipIcon: 'dart',
    selectedUfoIcon: 'classic_saucer',
    selectedWaveIcon: 'razor_dart',
    selectedLevelId: LEVELS[0].id,
    muted: false,
    myLevels: [],
    savedLevels: [],
    publishedLevels: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SavedData>;
    return {
      progress: {
        ...defaults.progress,
        ...(parsed.progress || {}),
      },
      selectedSkinId: parsed.selectedSkinId || defaults.selectedSkinId,
      selectedCubeIcon: parsed.selectedCubeIcon || defaults.selectedCubeIcon,
      selectedShipIcon: parsed.selectedShipIcon || defaults.selectedShipIcon,
      selectedUfoIcon: parsed.selectedUfoIcon || defaults.selectedUfoIcon,
      selectedWaveIcon: parsed.selectedWaveIcon || defaults.selectedWaveIcon,
      selectedLevelId: parsed.selectedLevelId || defaults.selectedLevelId,
      muted: Boolean(parsed.muted),
      myLevels: Array.isArray(parsed.myLevels) ? parsed.myLevels : [],
      savedLevels: Array.isArray(parsed.savedLevels) ? parsed.savedLevels : [],
      publishedLevels: Array.isArray(parsed.publishedLevels) ? parsed.publishedLevels : [],
    };
  } catch {
    return defaults;
  }
}

export function saveGameData(data: SavedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}
