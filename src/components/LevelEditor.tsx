import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eraser,
  Play,
  Save,
  Trash2,
} from 'lucide-react';
import { CEILING_GY, GROUND_Y, UNIT, WORLD_HEIGHT } from '../game/constants';
import { gyToPx, renderEditorScene } from '../game/renderer';
import { customToLevelDefinition } from '../game/storage';
import { CustomLevelData, LevelObject, ObstacleType } from '../game/types';

type EditorTool =
  | 'erase'
  | 'block'
  | 'half_block'
  | 'spike'
  | 'spike_down'
  | 'pad_yellow'
  | 'pad_pink'
  | 'orb_yellow'
  | 'orb_cyan'
  | 'drop'
  | 'portal_ship'
  | 'portal_cube'
  | 'portal_ufo'
  | 'portal_wave'
  | 'portal_gravity_flip'
  | 'portal_gravity_normal'
  | 'portal_speed_fast'
  | 'portal_speed_normal';

const TOOLS: Array<{ id: EditorTool; label: string; color: string }> = [
  { id: 'erase', label: 'Ластик', color: '#94A3B8' },
  { id: 'block', label: 'Блок', color: '#64748B' },
  { id: 'half_block', label: 'Полублок', color: '#475569' },
  { id: 'spike', label: 'Шип', color: '#F43F5E' },
  { id: 'spike_down', label: 'Шип ↓', color: '#FB7185' },
  { id: 'pad_yellow', label: 'Батут Ж', color: '#FACC15' },
  { id: 'pad_pink', label: 'Батут Р', color: '#F472B6' },
  { id: 'orb_yellow', label: 'Сфера Ж', color: '#EAB308' },
  { id: 'orb_cyan', label: 'Сфера Г', color: '#22D3EE' },
  { id: 'drop', label: 'Капля', color: '#FDE047' },
  { id: 'portal_ship', label: 'Корабль', color: '#F472B6' },
  { id: 'portal_cube', label: 'Куб', color: '#4ADE80' },
  { id: 'portal_ufo', label: 'НЛО', color: '#FB923C' },
  { id: 'portal_wave', label: 'Волна', color: '#06B6D4' },
  { id: 'portal_gravity_flip', label: 'Грав ↑', color: '#22D3EE' },
  { id: 'portal_gravity_normal', label: 'Грав ↓', color: '#A78BFA' },
  { id: 'portal_speed_fast', label: 'Быстро', color: '#F59E0B' },
  { id: 'portal_speed_normal', label: 'Обычно', color: '#34D399' },
];

const ACCENTS = [
  { color: '#FB3768', bgTop: '#0F172A', bgBottom: '#1E1B3A', ground: '#1E293B', grid: 'rgba(251, 55, 104, 0.1)' },
  { color: '#3B82F6', bgTop: '#0B1437', bgBottom: '#172554', ground: '#172554', grid: 'rgba(59, 130, 246, 0.12)' },
  { color: '#10B981', bgTop: '#0B1524', bgBottom: '#0F292E', ground: '#132A2E', grid: 'rgba(16, 185, 129, 0.1)' },
  { color: '#F59E0B', bgTop: '#13111C', bgBottom: '#2A1810', ground: '#261D17', grid: 'rgba(245, 158, 11, 0.1)' },
  { color: '#A855F7', bgTop: '#160B2E', bgBottom: '#2A1454', ground: '#211240', grid: 'rgba(168, 85, 247, 0.12)' },
];

interface LevelEditorProps {
  level: CustomLevelData;
  onSave: (updated: CustomLevelData) => void;
  onBack: (updated: CustomLevelData) => void;
  onTestPlay: (updated: CustomLevelData) => void;
}

export function LevelEditor({ level, onSave, onBack, onTestPlay }: LevelEditorProps) {
  const [draft, setDraft] = useState<CustomLevelData>(() => ({
    ...level,
    objects: level.objects.map((o) => ({ ...o })),
  }));
  const [tool, setTool] = useState<EditorTool>('block');
  const [camGx, setCamGx] = useState(0);
  const [camGy, setCamGy] = useState(0);
  const [hoverCell, setHoverCell] = useState<{ gx: number; gy: number } | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const paintingRef = useRef<null | 'paint' | 'erase'>(null);
  const lastCellKeyRef = useRef<string>('');
  const logicalSizeRef = useRef<{ width: number; height: number }>({ width: 1000, height: WORLD_HEIGHT });

  const draftRef = useRef(draft);
  draftRef.current = draft;

  const camRef = useRef({ camGx, camGy });
  camRef.current = { camGx, camGy };

  const hoverRef = useRef(hoverCell);
  hoverRef.current = hoverCell;

  // Keyboard horizontal/vertical pan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLSelectElement) {
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setCamGx((x) => Math.min(draftRef.current.lengthUnits + 10, x + 3));
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setCamGx((x) => Math.max(0, x - 3));
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setCamGy((y) => Math.min(Math.max(0, draftRef.current.ceilingGy - CEILING_GY), y + 1));
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setCamGy((y) => Math.max(0, y - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Render loop for editor canvas
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (canvas && wrap) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = wrap.getBoundingClientRect();
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
          ctx.save();
          ctx.scale(dpr, dpr);
          renderEditorScene({
            ctx,
            width: logicalWidth,
            level: customToLevelDefinition(draftRef.current),
            camX: camRef.current.camGx * UNIT,
            camY: camRef.current.camGy,
            time: now / 1000,
            hoverCell: hoverRef.current,
          });
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const screenToCell = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { width } = logicalSizeRef.current;
    const lx = ((clientX - rect.left) / Math.max(1, rect.width)) * width;
    const ly = ((clientY - rect.top) / Math.max(1, rect.height)) * WORLD_HEIGHT;
    const gx = Math.floor((lx + camRef.current.camGx * UNIT) / UNIT);
    const gy = Math.floor((GROUND_Y - ly) / UNIT + camRef.current.camGy);
    if (gx < 0 || gy < 0 || gy >= draftRef.current.ceilingGy) return null;
    return { gx, gy };
  }, []);

  const applyToolAtCell = useCallback(
    (gx: number, gy: number, forceErase = false) => {
      const activeTool = forceErase ? 'erase' : tool;
      setDraft((prev) => {
        const nextObjects = [...prev.objects];

        if (activeTool === 'erase') {
          const filtered = nextObjects.filter((o) => {
            const w = o.w ?? 1;
            const h = o.h ?? 1;
            const hitX = gx >= Math.floor(o.gx) && gx < Math.ceil(o.gx + w);
            const hitY = gy >= Math.floor(o.gy) && gy < Math.ceil(o.gy + h);
            return !(hitX && hitY);
          });
          if (filtered.length === nextObjects.length) return prev;
          return { ...prev, objects: filtered, updatedAt: Date.now() };
        }

        // Remove any existing object strictly at this exact cell before placing
        const cleaned = nextObjects.filter((o) => {
          const isPortal = o.type.startsWith('portal_');
          if (isPortal) return Math.round(o.gx) !== gx;
          return !(Math.round(o.gx) === gx && Math.floor(o.gy) === gy);
        });

        const id = `ed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        let newObj: LevelObject;

        if (activeTool === 'half_block') {
          newObj = { id, type: 'block', gx, gy, w: 1, h: 0.5 };
        } else if (activeTool === 'pad_yellow' || activeTool === 'pad_pink') {
          newObj = { id, type: activeTool, gx, gy, w: 1, h: 0.4 };
        } else if (
          activeTool === 'portal_ship' ||
          activeTool === 'portal_cube' ||
          activeTool === 'portal_ufo' ||
          activeTool === 'portal_wave' ||
          activeTool === 'portal_gravity_flip' ||
          activeTool === 'portal_gravity_normal' ||
          activeTool === 'portal_speed_fast' ||
          activeTool === 'portal_speed_normal'
        ) {
          newObj = {
            id,
            type: activeTool as ObstacleType,
            gx,
            gy: 0,
            w: 1.2,
            h: prev.ceilingGy,
          };
        } else if (activeTool === 'drop') {
          newObj = { id, type: 'drop', gx, gy: Math.max(0.3, gy), w: 1, h: 1 };
        } else {
          newObj = { id, type: activeTool as ObstacleType, gx, gy, w: 1, h: 1 };
        }

        cleaned.push(newObj);
        cleaned.sort((a, b) => a.gx - b.gx || a.gy - b.gy);

        // Auto-expand level length if building near the finish gate
        const neededLength = Math.max(prev.lengthUnits, gx + 14);
        const neededCeil =
          activeTool === 'portal_ship' || activeTool === 'portal_ufo' || activeTool === 'portal_wave'
            ? Math.max(prev.ceilingGy, 12.5)
            : prev.ceilingGy;

        return {
          ...prev,
          objects: cleaned,
          lengthUnits: neededLength,
          ceilingGy: neededCeil,
          updatedAt: Date.now(),
        };
      });
    },
    [tool]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const cell = screenToCell(e.clientX, e.clientY);
    if (!cell) return;
    const isRight = e.button === 2;
    paintingRef.current = isRight || tool === 'erase' ? 'erase' : 'paint';
    lastCellKeyRef.current = `${cell.gx}:${cell.gy}`;
    applyToolAtCell(cell.gx, cell.gy, isRight);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = screenToCell(e.clientX, e.clientY);
    setHoverCell(cell);
    if (!paintingRef.current || !cell) return;
    const key = `${cell.gx}:${cell.gy}`;
    if (key === lastCellKeyRef.current) return;
    lastCellKeyRef.current = key;
    applyToolAtCell(cell.gx, cell.gy, paintingRef.current === 'erase');
  };

  const handlePointerUp = () => {
    paintingRef.current = null;
    lastCellKeyRef.current = '';
  };

  const handleSave = () => {
    onSave(draft);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleClearAll = () => {
    setDraft((prev) => ({ ...prev, objects: [], updatedAt: Date.now() }));
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-white select-none">
      {/* Top Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onBack(draft)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 text-xs font-semibold text-slate-200 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Меню</span>
          </button>

          <input
            type="text"
            value={draft.title}
            maxLength={32}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            aria-label="Название уровня"
            className="h-9 w-40 sm:w-52 rounded-lg bg-slate-950 border border-white/15 px-3 text-sm font-semibold text-white focus:outline-none focus:border-white/40"
          />

          <div className="hidden md:flex items-center gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a.color}
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    accentColor: a.color,
                    bgTop: a.bgTop,
                    bgBottom: a.bgBottom,
                    groundColor: a.ground,
                    gridColor: a.grid,
                  }))
                }
                aria-label={`Цвет ${a.color}`}
                className={`h-6 w-6 rounded-md border transition-transform cursor-pointer ${
                  draft.accentColor === a.color ? 'border-white scale-110' : 'border-white/20'
                }`}
                style={{ backgroundColor: a.color }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Скорость</span>
            <select
              value={draft.baseSpeed}
              onChange={(e) => setDraft((p) => ({ ...p, baseSpeed: Number(e.target.value) }))}
              className="h-9 rounded-lg bg-slate-800 border border-white/10 px-2 text-xs font-mono-tabular text-white cursor-pointer"
            >
              <option value={7.4}>7.4 (Спокойная)</option>
              <option value={7.9}>7.9 (Классика)</option>
              <option value={8.5}>8.5 (Быстрая)</option>
              <option value={9.2}>9.2 (Рывок)</option>
            </select>
          </label>

          <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
            <span>Длина</span>
            <input
              type="number"
              min={40}
              max={600}
              step={10}
              value={draft.lengthUnits}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  lengthUnits: Math.max(40, Math.min(600, Number(e.target.value) || 80)),
                }))
              }
              className="h-9 w-16 rounded-lg bg-slate-800 border border-white/10 px-2 text-xs font-mono-tabular text-white"
            />
          </label>

          <button
            type="button"
            onClick={() =>
              setDraft((p) => ({
                ...p,
                ceilingGy: p.ceilingGy > 10 ? CEILING_GY : 12.5,
              }))
            }
            className="h-9 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {draft.ceilingGy > 10 ? 'Потолок: Высокий' : 'Потолок: Обычный'}
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            title="Очистить все объекты"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-white/10 shrink-0 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 text-xs font-semibold text-emerald-300 border border-emerald-500/30 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savedToast ? 'Сохранено' : 'Сохранить'}</span>
          </button>

          <button
            type="button"
            onClick={() => onTestPlay(draft)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white shadow-md whitespace-nowrap shrink-0 cursor-pointer"
            style={{ backgroundColor: draft.accentColor }}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Тест</span>
          </button>
        </div>
      </header>

      {/* Canvas Grid Stage */}
      <div ref={wrapRef} className="relative flex-1 min-h-0 bg-[#0B1120]">
        <canvas
          ref={canvasRef}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            setHoverCell(null);
            handlePointerUp();
          }}
          className="block w-full h-full cursor-crosshair touch-none"
        />

        {/* Quick Scroll / Position Overlay */}
        <div className="pointer-events-auto absolute top-3 left-4 right-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/80 border border-white/10 px-3 py-1.5 backdrop-blur-md text-xs font-mono-tabular text-slate-300">
            <span>Объектов: {draft.objects.length}</span>
            <span aria-hidden="true">·</span>
            <span>X: {camGx} / {draft.lengthUnits}</span>
            {hoverCell && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-white">
                  Клетка ({hoverCell.gx}, {hoverCell.gy})
                </span>
              </>
            )}
          </div>

          {draft.ceilingGy > 10 && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-950/80 border border-white/10 px-3 py-1.5 backdrop-blur-md text-xs">
              <span className="text-slate-300">Высота:</span>
              <button
                type="button"
                onClick={() => setCamGy((y) => Math.max(0, y - 2))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setCamGy((y) => Math.min(4, y + 2))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                ↑
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Timeline Slider + Object Palette */}
      <footer className="bg-slate-900 border-t border-white/10 px-4 py-2.5 space-y-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 whitespace-nowrap">Прокрутка карты:</span>
          <input
            type="range"
            min={0}
            max={Math.max(20, draft.lengthUnits)}
            value={camGx}
            onChange={(e) => setCamGx(Number(e.target.value))}
            className="flex-1 accent-rose-500 cursor-pointer"
          />
          <span className="hidden sm:inline text-xs text-slate-400 whitespace-nowrap">
            ЛКМ — поставить · ПКМ — стереть · A/D — сдвиг
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-700 border-white/50 text-white'
                    : 'bg-slate-950/70 border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {t.id === 'erase' ? (
                  <Eraser className="h-3.5 w-3.5 text-slate-300" />
                ) : (
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                )}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
