import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  Download,
  Flag,
  FolderHeart,
  Hammer,
  Loader2,
  LogOut,
  Pencil,
  Play,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { importGDLevel, exportLevelToGDString } from '../game/gdParser';
import {
  CUBE_ICONS,
  JELLY_SKINS,
  SHIP_ICONS,
  UFO_ICONS,
  WAVE_ICONS,
} from '../game/skins';
import {
  CubeIconId,
  CustomLevelData,
  GameMode,
  JellySkin,
  LevelProgress,
  ShipIconId,
  UfoIconId,
  VehicleType,
  WaveIconId,
} from '../game/types';
import { JellyPreviewIcon } from './JellyPreviewIcon';

export function GoogleSignInButton({
  onClick,
  loading = false,
  label = 'Войти через Google',
  compact = false,
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`pointer-events-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-60 text-slate-900 font-medium shadow-md border border-slate-300/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
        compact ? 'h-10 px-3.5 text-xs' : 'h-11 px-4 text-sm'
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
      ) : (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
      )}
      <span>{loading ? 'Вход...' : label}</span>
    </button>
  );
}

/* ============================================================================
   1. ICON KIT (Cube + Ship + UFO + Wave Icons + Jelly Flavors)
   ============================================================================ */
interface IconKitScreenProps {
  skin: JellySkin;
  cubeIcon: CubeIconId;
  shipIcon: ShipIconId;
  ufoIcon: UfoIconId;
  waveIcon: WaveIconId;
  onSelectSkin: (id: string) => void;
  onSelectCube: (id: CubeIconId) => void;
  onSelectShip: (id: ShipIconId) => void;
  onSelectUfo: (id: UfoIconId) => void;
  onSelectWave: (id: WaveIconId) => void;
  onBack: () => void;
}

export function IconKitScreen({
  skin,
  cubeIcon,
  shipIcon,
  ufoIcon,
  waveIcon,
  onSelectSkin,
  onSelectCube,
  onSelectShip,
  onSelectUfo,
  onSelectWave,
  onBack,
}: IconKitScreenProps) {
  const [tab, setTab] = useState<VehicleType>('cube');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white">Иконки и Желе</h1>
              <p className="text-xs text-slate-400">Куб, корабль, НЛО, желейная волна и вкус желе</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/70 px-3.5 py-2 border border-white/10">
            <JellyPreviewIcon skin={skin} cubeIcon={cubeIcon} size={34} />
            <JellyPreviewIcon skin={skin} shipIcon={shipIcon} mode="ship" size={38} />
            <JellyPreviewIcon skin={skin} ufoIcon={ufoIcon} mode="ufo" size={38} />
            <JellyPreviewIcon skin={skin} waveIcon={waveIcon} mode="wave" size={38} />
          </div>
        </div>

        {/* Mode Tabs: Cube / Ship / UFO / Wave */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-white/10 w-fit">
          {(
            [
              { id: 'cube', label: 'Куб' },
              { id: 'ship', label: 'Корабль' },
              { id: 'ufo', label: 'НЛО' },
              { id: 'wave', label: 'Волна' },
            ] as Array<{ id: VehicleType; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Icon Selection Grid */}
        {tab === 'cube' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CUBE_ICONS.map((item) => {
              const active = item.id === cubeIcon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCube(item.id)}
                  className={`flex items-center gap-3.5 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-white/40 ring-1 ring-white/20'
                      : 'bg-slate-950/55 border-white/10 hover:bg-slate-800/60'
                  }`}
                >
                  <JellyPreviewIcon skin={skin} cubeIcon={item.id} size={46} />
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-white truncate">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'ship' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SHIP_ICONS.map((item) => {
              const active = item.id === shipIcon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectShip(item.id)}
                  className={`flex items-center gap-3.5 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-white/40 ring-1 ring-white/20'
                      : 'bg-slate-950/55 border-white/10 hover:bg-slate-800/60'
                  }`}
                >
                  <JellyPreviewIcon skin={skin} shipIcon={item.id} mode="ship" size={52} />
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-white truncate">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'ufo' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {UFO_ICONS.map((item) => {
              const active = item.id === ufoIcon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectUfo(item.id)}
                  className={`flex items-center gap-3.5 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-white/40 ring-1 ring-white/20'
                      : 'bg-slate-950/55 border-white/10 hover:bg-slate-800/60'
                  }`}
                >
                  <JellyPreviewIcon skin={skin} ufoIcon={item.id} mode="ufo" size={52} />
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-white truncate">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'wave' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WAVE_ICONS.map((item) => {
              const active = item.id === waveIcon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectWave(item.id)}
                  className={`flex items-center gap-3.5 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-white/40 ring-1 ring-white/20'
                      : 'bg-slate-950/55 border-white/10 hover:bg-slate-800/60'
                  }`}
                >
                  <JellyPreviewIcon skin={skin} waveIcon={item.id} mode="wave" size={52} />
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-white truncate">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Jelly Color / Flavor */}
        <div className="space-y-2.5 border-t border-white/10 pt-4">
          <div className="text-xs font-medium text-slate-400">
            Цвет и вкус желе: <span className="text-white font-semibold">{skin.name}</span> · {skin.flavor}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {JELLY_SKINS.map((s) => {
              const active = s.id === skin.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSkin(s.id)}
                  title={s.name}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-transform cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-white/45 scale-105'
                      : 'bg-slate-950/60 border-white/10 hover:bg-slate-800/70'
                  }`}
                >
                  <JellyPreviewIcon skin={s} cubeIcon={cubeIcon} size={32} />
                  <span className="text-[11px] text-slate-300 truncate max-w-full">{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. CREATOR HUB (Создать уровень / Сохранённые уровни / Искать уровни)
   ============================================================================ */
interface CreatorHubScreenProps {
  myCount: number;
  savedCount: number;
  searchCount: number;
  user: User | null;
  authBusy: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenMyLevels: () => void;
  onOpenSavedLevels: () => void;
  onOpenSearchLevels: () => void;
  onBack: () => void;
}

export function CreatorHubScreen({
  myCount,
  savedCount,
  searchCount,
  user,
  authBusy,
  onSignIn,
  onSignOut,
  onOpenMyLevels,
  onOpenSavedLevels,
  onOpenSearchLevels,
  onBack,
}: CreatorHubScreenProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Главное меню</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white">Мастерская уровней</h1>
              <p className="text-xs text-slate-400">Создавайте уровни, импортируйте из Geometry Dash и ищите карты</p>
            </div>
          </div>

          {user ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/75 border border-white/10 px-3 py-1.5">
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
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {user.displayName || user.email?.split('@')[0] || 'Игрок'}
                </div>
                <div className="text-[11px] text-emerald-400">Публикация открыта</div>
              </div>
              <button
                type="button"
                onClick={() => void onSignOut()}
                title="Выйти из аккаунта"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={() => void onSignIn()}
              loading={authBusy}
              label="Войти через Google"
              compact
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={onOpenMyLevels}
            className="group rounded-2xl bg-slate-950/65 hover:bg-slate-800/85 border border-white/12 p-6 text-left flex flex-col justify-between gap-6 transition-all cursor-pointer"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400">
              <Hammer className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Создать уровень</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Все ваши уровни, редактор карты и импорт кода из официального Geometry Dash
              </p>
              <div className="text-xs font-mono-tabular text-amber-300 mt-3">
                Ваших уровней: {myCount}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSavedLevels}
            className="group rounded-2xl bg-slate-950/65 hover:bg-slate-800/85 border border-white/12 p-6 text-left flex flex-col justify-between gap-6 transition-all cursor-pointer"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
              <FolderHeart className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Сохранённые уровни</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Уровни сообщества, которые вы сохранили для быстрого запуска
              </p>
              <div className="text-xs font-mono-tabular text-emerald-300 mt-3">
                Сохранено: {savedCount}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSearchLevels}
            className="group rounded-2xl bg-slate-950/65 hover:bg-slate-800/85 border border-white/12 p-6 text-left flex flex-col justify-between gap-6 transition-all cursor-pointer"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-400">
              <Search className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Искать уровни</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Поиск по готовым и опубликованным уровням с возможностью сохранения
              </p>
              <div className="text-xs font-mono-tabular text-blue-300 mt-3">
                Доступно карт: {searchCount}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. MY LEVELS + IMPORT FROM OFFICIAL GEOMETRY DASH
   ============================================================================ */
interface MyLevelsScreenProps {
  levels: CustomLevelData[];
  progress: Record<string, LevelProgress>;
  onCreateNew: () => void;
  onImportGD: (imported: CustomLevelData) => void;
  onOpenLevelMenu: (levelId: string) => void;
  onBack: () => void;
}

export function MyLevelsScreen({
  levels,
  progress,
  onCreateNew,
  onImportGD,
  onOpenLevelMenu,
  onBack,
}: MyLevelsScreenProps) {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImporting(true);
    try {
      const res = await importGDLevel(importText, importTitle.trim() || 'Уровень из GD');
      const now = Date.now();
      const newLevel: CustomLevelData = {
        id: `gd_custom_${now}_${Math.random().toString(36).slice(2, 6)}`,
        title: importTitle.trim() || res.title,
        author: res.author,
        description: `Импортировано из Geometry Dash · ${res.rawObjectCount} объектов`,
        difficulty: 'Классика',
        bpm: 145,
        baseSpeed: 7.9,
        lengthUnits: res.lengthUnits,
        ceilingGy: res.ceilingGy,
        accentColor: '#3B82F6',
        bgTop: '#0B1437',
        bgBottom: '#172554',
        groundColor: '#172554',
        gridColor: 'rgba(59, 130, 246, 0.12)',
        musicKey: 'stereo',
        objects: res.objects,
        createdAt: now,
        updatedAt: now,
        published: false,
      };
      onImportGD(newLevel);
      setShowImport(false);
      setImportText('');
      setImportTitle('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Ошибка чтения кода Geometry Dash');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white">Мои уровни</h1>
              <p className="text-xs text-slate-400">Нажмите на уровень, чтобы открыть его меню (Играть / Выложить / Создавать)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Вставить из GD</span>
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Новый уровень</span>
            </button>
          </div>
        </div>

        {/* Levels List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {levels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center space-y-3">
              <p className="text-sm text-slate-300">
                У вас пока нет собственных уровней.
              </p>
              <p className="text-xs text-slate-400">
                Создайте новый уровень в редакторе или вставьте код уровня из официального Geometry Dash (.gmd, H4sI... или строку объектов).
              </p>
            </div>
          ) : (
            levels.map((lvl) => {
              const stat = progress[lvl.id];
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => onOpenLevelMenu(lvl.id)}
                  className="w-full flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-white/10 p-4 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg shrink-0"
                      style={{ backgroundColor: lvl.accentColor }}
                    >
                      {lvl.title.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-white truncate">{lvl.title}</h2>
                        {lvl.published && (
                          <span className="text-xs font-semibold text-emerald-400">· Опубликован</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-tabular mt-0.5">
                        {lvl.objects.length} объектов · Длина {lvl.lengthUnits} · Скорость {lvl.baseSpeed}
                        {stat ? ` · Рекорд ${stat.bestNormal}%` : ''}
                      </div>
                    </div>
                  </div>

                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-white/10 whitespace-nowrap">
                    Открыть меню
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* GD Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleImportSubmit}
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-white">Вставить уровень из Geometry Dash</h2>
              <p className="text-xs text-slate-400 mt-1">
                Поддерживаются форматы: файл .gmd (XML), сжатый код H4sI..., строка объектов GD (1,8,2,525...) или код Jelly Dash.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Название (необязательно)</label>
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="Например: Back On Track или Мой уровень"
                className="w-full h-10 rounded-xl bg-slate-950 border border-white/15 px-3 text-sm text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Код уровня или содержимое .gmd</label>
              <textarea
                rows={6}
                required
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Вставьте H4sIAAAAAAAAC... или <plist>...</plist> или 1,8,2,525,3,15;..."
                className="w-full rounded-xl bg-slate-950 border border-white/15 p-3 text-xs font-mono-tabular text-slate-100 focus:outline-none focus:border-blue-400"
              />
            </div>

            {importError && (
              <div className="rounded-xl bg-rose-950/60 border border-rose-500/30 px-3 py-2 text-xs text-rose-200">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImport(false);
                  setImportError('');
                }}
                className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={importing}
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white cursor-pointer"
              >
                {importing ? 'Декодирование...' : 'Импортировать'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   4. LEVEL DETAIL MENU (Поиграть / Выложить / Создавать)
   ============================================================================ */
interface LevelDetailScreenProps {
  level: CustomLevelData;
  progress?: LevelProgress;
  user: User | null;
  authBusy: boolean;
  authError?: string | null;
  publishBusy: boolean;
  publishError?: string | null;
  onSignIn: () => Promise<void>;
  onPlay: (mode: GameMode) => void;
  onPublish: () => Promise<void>;
  onUnpublish?: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function LevelDetailScreen({
  level,
  progress,
  user,
  authBusy,
  authError,
  publishBusy,
  publishError,
  onSignIn,
  onPlay,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  onBack,
}: LevelDetailScreenProps) {
  const [copiedCode, setCopiedCode] = useState<'gd' | 'jelly' | null>(null);
  const [needAuthPrompt, setNeedAuthPrompt] = useState(false);

  const handleCopyShare = (type: 'gd' | 'jelly') => {
    const text =
      type === 'gd'
        ? exportLevelToGDString(level)
        : `JELLY1:${JSON.stringify({ title: level.title, author: level.author, objects: level.objects, baseSpeed: level.baseSpeed, ceilingGy: level.ceilingGy })}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handlePublishClick = () => {
    if (!user) {
      setNeedAuthPrompt(true);
      return;
    }
    setNeedAuthPrompt(false);
    void onPublish();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>К уровням</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white">{level.title}</h1>
              <div className="text-xs text-slate-400 font-mono-tabular mt-0.5">
                {level.objects.length} объектов · Длина {level.lengthUnits} · Скорость {level.baseSpeed}
                {progress ? ` · Рекорд ${progress.bestNormal}%` : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDelete}
            title="Удалить уровень"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-white/10 shrink-0 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Primary Actions: Play / Publish / Edit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onPlay('normal')}
            className="flex flex-col items-center justify-center gap-2.5 rounded-2xl p-5 text-white font-display font-bold text-base shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: level.accentColor }}
          >
            <Play className="h-7 w-7 fill-current" />
            <span>Играть</span>
          </button>

          <button
            type="button"
            onClick={handlePublishClick}
            disabled={publishBusy}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl p-5 font-display font-bold text-base border transition-colors disabled:opacity-60 cursor-pointer ${
              level.published
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/75'
                : 'bg-slate-800 hover:bg-slate-700 border-white/12 text-white'
            }`}
          >
            {publishBusy ? (
              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
            ) : level.published ? (
              <Check className="h-7 w-7" />
            ) : (
              <Share2 className="h-7 w-7 text-blue-400" />
            )}
            <span className="text-center">
              {publishBusy
                ? 'Публикация...'
                : level.published
                ? 'Выложен · Обновить'
                : 'Выложить уровень'}
            </span>
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/12 p-5 text-white font-display font-bold text-base transition-colors cursor-pointer"
          >
            <Pencil className="h-7 w-7 text-amber-400" />
            <span>Создавать</span>
          </button>
        </div>

        {/* Registration gate for publishing */}
        {!user && (
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              needAuthPrompt
                ? 'bg-amber-950/40 border-amber-400/50'
                : 'bg-slate-950/65 border-white/10'
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-white">
                Регистрация нужна для публикации
              </div>
              <p className="text-xs text-slate-300">
                Войдите через Google, чтобы выложить «{level.title}» в общий поиск уровней.
              </p>
            </div>
            <GoogleSignInButton
              onClick={() => void onSignIn()}
              loading={authBusy}
              label="Войти через Google"
              compact
            />
          </div>
        )}

        {(authError || publishError) && (
          <div className="rounded-xl bg-rose-950/60 border border-rose-500/35 px-4 py-2.5 text-xs text-rose-200">
            {publishError || authError}
          </div>
        )}

        {/* Practice + Unpublish + Copy GD / Share Code */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPlay('practice')}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 text-xs font-semibold text-emerald-300 border border-white/10 cursor-pointer"
            >
              <Flag className="h-4 w-4" />
              <span>Режим практики</span>
            </button>

            {level.published && user && (!level.authorUid || level.authorUid === user.uid) && onUnpublish && (
              <button
                type="button"
                onClick={() => void onUnpublish()}
                disabled={publishBusy}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 px-3 text-xs font-medium text-slate-300 hover:text-rose-200 border border-white/10 cursor-pointer"
              >
                <span>Снять с публикации</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyShare('gd')}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 px-3 text-xs font-medium text-slate-300 border border-white/10 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedCode === 'gd' ? 'GD код скопирован' : 'Экспорт GD кода'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyShare('jelly')}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 px-3 text-xs font-medium text-slate-300 border border-white/10 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedCode === 'jelly' ? 'Код скопирован' : 'Код Jelly Dash'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. SAVED LEVELS SCREEN
   ============================================================================ */
interface SavedLevelsScreenProps {
  levels: CustomLevelData[];
  progress: Record<string, LevelProgress>;
  onPlay: (level: CustomLevelData, mode: GameMode) => void;
  onCloneToMy: (level: CustomLevelData) => void;
  onRemoveSaved: (id: string) => void;
  onBack: () => void;
}

export function SavedLevelsScreen({
  levels,
  progress,
  onPlay,
  onCloneToMy,
  onRemoveSaved,
  onBack,
}: SavedLevelsScreenProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 gap-5">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white">Сохранённые уровни</h1>
              <p className="text-xs text-slate-400">Скачанные карты из поиска</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {levels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center text-sm text-slate-400">
              Пока нет сохранённых уровней. Откройте «Искать уровни», чтобы сохранить понравившиеся карты.
            </div>
          ) : (
            levels.map((lvl) => {
              const stat = progress[lvl.id];
              return (
                <div
                  key={lvl.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/60 border border-white/10 p-4"
                >
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-bold text-white truncate">{lvl.title}</h2>
                    <div className="text-xs text-slate-400 font-mono-tabular mt-0.5">
                      Автор: {lvl.author} · {lvl.difficulty} · {lvl.objects.length} объектов
                      {stat ? ` · Рекорд ${stat.bestNormal}%` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCloneToMy(lvl)}
                      title="Скопировать в Мои уровни"
                      className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 whitespace-nowrap cursor-pointer"
                    >
                      В редактор
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlay(lvl, 'normal')}
                      className="h-9 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      style={{ backgroundColor: lvl.accentColor }}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Играть</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSaved(lvl.id)}
                      title="Удалить из сохранённых"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-white/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   6. SEARCH LEVELS SCREEN
   ============================================================================ */
interface SearchLevelsScreenProps {
  allLevels: CustomLevelData[];
  savedIds: Set<string>;
  progress: Record<string, LevelProgress>;
  onPlay: (level: CustomLevelData, mode: GameMode) => void;
  onSaveLevel: (level: CustomLevelData) => void;
  onCloneToMy: (level: CustomLevelData) => void;
  onBack: () => void;
}

export function SearchLevelsScreen({
  allLevels,
  savedIds,
  progress,
  onPlay,
  onSaveLevel,
  onCloneToMy,
  onBack,
}: SearchLevelsScreenProps) {
  const [query, setQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allLevels.filter((lvl) => {
      if (diffFilter !== 'all' && lvl.difficulty !== diffFilter) return false;
      if (!q) return true;
      return (
        lvl.title.toLowerCase().includes(q) ||
        lvl.author.toLowerCase().includes(q) ||
        lvl.description.toLowerCase().includes(q)
      );
    });
  }, [allLevels, query, diffFilter]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 md:p-8 gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 text-sm font-semibold text-slate-200 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white">Искать уровни</h1>
              <p className="text-xs text-slate-400">Карты сообщества и ваши опубликованные уровни</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или автору..."
              className="w-full h-10 rounded-xl bg-slate-950 border border-white/15 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/75 border border-white/10 overflow-x-auto">
            {['all', 'Легкий', 'Средний', 'Сложный', 'Классика'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiffFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  diffFilter === d ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {d === 'all' ? 'Все' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center text-sm text-slate-400">
              Ничего не найдено. Попробуйте другой запрос.
            </div>
          ) : (
            filtered.map((lvl) => {
              const isSaved = savedIds.has(lvl.id);
              const stat = progress[lvl.id];
              return (
                <div
                  key={lvl.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/60 border border-white/10 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-bold text-white truncate">{lvl.title}</h2>
                      <span className="text-xs font-semibold" style={{ color: lvl.accentColor }}>
                        · {lvl.difficulty}
                      </span>
                      {lvl.authorUid && (
                        <span className="text-xs font-semibold text-emerald-400">· Онлайн</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{lvl.description}</p>
                    <div className="text-xs text-slate-500 font-mono-tabular mt-1">
                      Автор: {lvl.author} · {lvl.objects.length} объектов
                      {stat ? ` · Рекорд ${stat.bestNormal}%` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSaveLevel(lvl)}
                      disabled={isSaved}
                      className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold border whitespace-nowrap cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-200'
                      }`}
                    >
                      {isSaved ? <Bookmark className="h-3.5 w-3.5 fill-current" /> : <Download className="h-3.5 w-3.5" />}
                      <span>{isSaved ? 'Сохранён' : 'Сохранить'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCloneToMy(lvl)}
                      className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 whitespace-nowrap cursor-pointer"
                    >
                      Копия
                    </button>

                    <button
                      type="button"
                      onClick={() => onPlay(lvl, 'normal')}
                      className="h-9 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      style={{ backgroundColor: lvl.accentColor }}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Играть</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
