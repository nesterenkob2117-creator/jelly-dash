import { CubeIconId, JellySkin, ShipIconId, UfoIconId, WaveIconId } from './types';

export const JELLY_SKINS: JellySkin[] = [
  {
    id: 'strawberry',
    name: 'Клубника',
    flavor: 'Сочный рубин',
    bodyColor: '#FB3768',
    innerColor: '#FF85A1',
    highlightColor: '#FFE3EA',
    rimColor: '#FF5C85',
    trailColor: 'rgba(251, 55, 104, 0.45)',
  },
  {
    id: 'lime',
    name: 'Лайм-Мята',
    flavor: 'Свежий гель',
    bodyColor: '#10B981',
    innerColor: '#6EE7B7',
    highlightColor: '#D1FAE5',
    rimColor: '#34D399',
    trailColor: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'mango',
    name: 'Манго',
    flavor: 'Солнечный джем',
    bodyColor: '#F59E0B',
    innerColor: '#FCD34D',
    highlightColor: '#FEF3C7',
    rimColor: '#FBBF24',
    trailColor: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'blueberry',
    name: 'Черника',
    flavor: 'Ледяной сироп',
    bodyColor: '#3B82F6',
    innerColor: '#93C5FD',
    highlightColor: '#DBEAFE',
    rimColor: '#60A5FA',
    trailColor: 'rgba(59, 130, 246, 0.45)',
  },
  {
    id: 'grape',
    name: 'Виноград',
    flavor: 'Ягодный мусс',
    bodyColor: '#8B5CF6',
    innerColor: '#C4B5FD',
    highlightColor: '#EDE9FE',
    rimColor: '#A78BFA',
    trailColor: 'rgba(139, 92, 246, 0.45)',
  },
  {
    id: 'peach',
    name: 'Персик',
    flavor: 'Нежный мармелад',
    bodyColor: '#F97316',
    innerColor: '#FDBA74',
    highlightColor: '#FFEDD5',
    rimColor: '#FB923C',
    trailColor: 'rgba(249, 115, 22, 0.45)',
  },
  {
    id: 'cyan_ice',
    name: 'Голубая лагуна',
    flavor: 'Морской бриз',
    bodyColor: '#06B6D4',
    innerColor: '#67E8F9',
    highlightColor: '#ECFEFF',
    rimColor: '#22D3EE',
    trailColor: 'rgba(6, 182, 212, 0.45)',
  },
  {
    id: 'crimson_berry',
    name: 'Малина Неон',
    flavor: 'Яркий мармелад',
    bodyColor: '#EC4899',
    innerColor: '#F9A8D4',
    highlightColor: '#FCE7F3',
    rimColor: '#F472B6',
    trailColor: 'rgba(236, 72, 153, 0.45)',
  },
];

export interface CubeIconMeta {
  id: CubeIconId;
  name: string;
  desc: string;
}

export interface ShipIconMeta {
  id: ShipIconId;
  name: string;
  desc: string;
}

export interface UfoIconMeta {
  id: UfoIconId;
  name: string;
  desc: string;
}

export interface WaveIconMeta {
  id: WaveIconId;
  name: string;
  desc: string;
}

export const CUBE_ICONS: CubeIconMeta[] = [
  { id: 'classic', name: 'Классик', desc: 'Милые глазки и глянцевый блик' },
  { id: 'cyclops', name: 'Циклоп', desc: 'Один большой глаз и серьёзный взгляд' },
  { id: 'visor', name: 'Кибер-визор', desc: 'Неоновая маска в стиле Geometry Dash' },
  { id: 'star', name: 'Звезда', desc: 'Сияющая звезда внутри желе' },
  { id: 'crown', name: 'Король', desc: 'Золотая корона и царственный блеск' },
  { id: 'ninja', name: 'Ниндзя', desc: 'Боевая повязка и быстрый прищур' },
];

export const SHIP_ICONS: ShipIconMeta[] = [
  { id: 'dart', name: 'Стрела', desc: 'Классический обтекаемый катер' },
  { id: 'shark', name: 'Акула', desc: 'Острый плавник и зубастый нос' },
  { id: 'rocket', name: 'Ракета', desc: 'Двойные крылья и турбо-сопло' },
  { id: 'dragon', name: 'Дракон', desc: 'Крылатый корпус и рогатый шлем' },
  { id: 'jet', name: 'Истребитель', desc: 'Сверхзвуковой крылатый реактив' },
];

export const UFO_ICONS: UfoIconMeta[] = [
  { id: 'classic_saucer', name: 'Тарелка', desc: 'Классическое НЛО с куполом и грави-лучами' },
  { id: 'jelly_dome', name: 'Желе-Сфера', desc: 'Пузырь-кабина со светящимся ободом' },
  { id: 'cyber_pod', name: 'Кибер-Диск', desc: 'Двойное кольцо и неоновые стабилизаторы' },
];

export const WAVE_ICONS: WaveIconMeta[] = [
  { id: 'razor_dart', name: 'Лезвие', desc: 'Острая треугольная стрела волны' },
  { id: 'crystal_arrow', name: 'Кристалл', desc: 'Гранёный желейный наконечник' },
  { id: 'jelly_bolt', name: 'Молния', desc: 'Скоростной двойной киль зигзага' },
];

export function getSkinById(id: string): JellySkin {
  return JELLY_SKINS.find((s) => s.id === id) ?? JELLY_SKINS[0];
}

export function getCubeIconById(id: string): CubeIconId {
  return CUBE_ICONS.some((c) => c.id === id) ? (id as CubeIconId) : 'classic';
}

export function getShipIconById(id: string): ShipIconId {
  return SHIP_ICONS.some((s) => s.id === id) ? (id as ShipIconId) : 'dart';
}

export function getUfoIconById(id: string): UfoIconId {
  return UFO_ICONS.some((u) => u.id === id) ? (id as UfoIconId) : 'classic_saucer';
}

export function getWaveIconById(id: string): WaveIconId {
  return WAVE_ICONS.some((w) => w.id === id) ? (id as WaveIconId) : 'razor_dart';
}
