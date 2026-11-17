import { useId } from 'react';
import { CubeIconId, JellySkin, ShipIconId, UfoIconId, WaveIconId } from '../game/types';

interface JellyPreviewIconProps {
  skin: JellySkin;
  cubeIcon?: CubeIconId;
  shipIcon?: ShipIconId;
  ufoIcon?: UfoIconId;
  waveIcon?: WaveIconId;
  mode?: 'cube' | 'ship' | 'ufo' | 'wave';
  size?: number;
}

export function JellyPreviewIcon({
  skin,
  cubeIcon = 'classic',
  shipIcon = 'dart',
  ufoIcon = 'classic_saucer',
  waveIcon = 'razor_dart',
  mode = 'cube',
  size = 36,
}: JellyPreviewIconProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `grad_${skin.id}_${uid}`;

  if (mode === 'wave') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="12" y1="8" x2="54" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={skin.innerColor} />
            <stop offset="100%" stopColor={skin.bodyColor} />
          </linearGradient>
        </defs>

        {/* Neon zigzag ribbon behind wave */}
        <path
          d="M4 34 L16 22 L28 30"
          stroke={skin.bodyColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />

        {waveIcon === 'crystal_arrow' ? (
          <path
            d="M54 24 L28 10 L12 18 L22 24 L12 30 L28 38 Z"
            fill={`url(#${gradId})`}
            stroke={skin.highlightColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        ) : waveIcon === 'jelly_bolt' ? (
          <path
            d="M56 24 L32 9 L14 13 L24 24 L14 35 L32 39 Z"
            fill={`url(#${gradId})`}
            stroke={skin.highlightColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M54 24 L15 10 L22 24 L15 38 Z"
            fill={`url(#${gradId})`}
            stroke={skin.highlightColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        )}

        <circle cx="35" cy="24" r="3.2" fill="#FFFFFF" />
      </svg>
    );
  }

  if (mode === 'ufo') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="18" y1="6" x2="46" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={skin.innerColor} />
            <stop offset="100%" stopColor={skin.bodyColor} />
          </linearGradient>
        </defs>

        {/* Hover beam */}
        <path d="M20 38 L44 38 L49 46 L15 46 Z" fill={skin.innerColor} opacity="0.28" />

        {/* Mini jelly rider inside dome */}
        <g transform="translate(18, 5) scale(0.55)">
          <rect
            x="6"
            y="6"
            width="36"
            height="36"
            rx="10"
            fill={`url(#${gradId})`}
            stroke={skin.highlightColor}
            strokeWidth="2.5"
          />
          <circle cx="28" cy="22" r="4" fill="white" />
          <circle cx="37" cy="22" r="3.5" fill="white" />
          <circle cx="29" cy="22" r="2" fill="#0F172A" />
          <circle cx="38" cy="22" r="1.8" fill="#0F172A" />
        </g>

        {/* Glass dome */}
        <path
          d="M14 27 A18 16 0 0 1 50 27"
          fill="rgba(255,255,255,0.14)"
          stroke={skin.highlightColor}
          strokeWidth="2"
        />

        {ufoIcon === 'cyber_pod' ? (
          <>
            <path
              d="M6 34 L17 27 L47 27 L58 34 L50 40 L14 40 Z"
              fill="#0F172A"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <rect x="17" y="32.5" width="30" height="3.8" rx="1.8" fill={skin.bodyColor} />
          </>
        ) : ufoIcon === 'jelly_dome' ? (
          <ellipse
            cx="32"
            cy="34"
            rx="25"
            ry="7"
            fill={skin.bodyColor}
            stroke={skin.highlightColor}
            strokeWidth="2"
          />
        ) : (
          <>
            <ellipse
              cx="32"
              cy="34"
              rx="26"
              ry="7"
              fill="#1E293B"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <circle cx="19" cy="34" r="2.4" fill={skin.bodyColor} />
            <circle cx="32" cy="34" r="2.4" fill={skin.bodyColor} />
            <circle cx="45" cy="34" r="2.4" fill={skin.bodyColor} />
          </>
        )}
      </svg>
    );
  }

  if (mode === 'ship') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="18" y1="6" x2="46" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={skin.innerColor} />
            <stop offset="100%" stopColor={skin.bodyColor} />
          </linearGradient>
        </defs>

        {/* Mini jelly rider inside cockpit */}
        <g transform="translate(18, 4) scale(0.56)">
          <rect
            x="6"
            y="6"
            width="36"
            height="36"
            rx="10"
            fill={`url(#${gradId})`}
            stroke={skin.highlightColor}
            strokeWidth="2.5"
          />
          <circle cx="28" cy="22" r="4" fill="white" />
          <circle cx="37" cy="22" r="3.5" fill="white" />
          <circle cx="29" cy="22" r="2" fill="#0F172A" />
          <circle cx="38" cy="22" r="1.8" fill="#0F172A" />
        </g>

        {/* Thruster flame */}
        <path d="M12 26 L3 30 L12 34 Z" fill={skin.innerColor} opacity="0.85" />

        {/* Ship Hull Variants */}
        {shipIcon === 'shark' ? (
          <>
            <path
              d="M12 37 L10 24 L20 15 L25 25 L48 25 L59 31 L49 38 Z"
              fill="#0F172A"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <rect x="18" y="30" width="26" height="4.5" rx="2.2" fill={skin.bodyColor} />
          </>
        ) : shipIcon === 'rocket' ? (
          <>
            <path
              d="M10 38 L7 21 L20 26 L45 23 L60 31 L50 38 Z"
              fill="#1E293B"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <path d="M49 26 L60 31 L49 36 Z" fill={skin.bodyColor} />
            <rect x="16" y="30" width="28" height="4.5" rx="2.2" fill={skin.bodyColor} />
          </>
        ) : shipIcon === 'dragon' ? (
          <>
            <path
              d="M10 36 L15 17 L24 25 L42 22 L52 16 L58 30 L49 38 Z"
              fill="#1E1B3A"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <rect x="17" y="30" width="28" height="4.5" rx="2" fill={skin.bodyColor} />
          </>
        ) : shipIcon === 'jet' ? (
          <>
            <path
              d="M10 37 L15 18 L28 24 L47 24 L61 31 L51 38 Z"
              fill="#0F172A"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <path d="M18 31 L48 31 L42 35.5 L15 35.5 Z" fill={skin.bodyColor} />
          </>
        ) : (
          <>
            <path
              d="M12 25 Q26 20 46 25 Q58 30 50 38 L15 38 Q9 32 12 25 Z"
              fill="#1E293B"
              stroke={skin.highlightColor}
              strokeWidth="2"
            />
            <rect x="19" y="30" width="26" height="4.5" rx="2.2" fill={skin.bodyColor} />
          </>
        )}
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={skin.innerColor} />
          <stop offset="55%" stopColor={skin.bodyColor} />
          <stop offset="100%" stopColor={skin.bodyColor} />
        </linearGradient>
      </defs>

      {/* Crown on top if crown icon */}
      {cubeIcon === 'crown' && (
        <path
          d="M15 8 L13 1 L20 5 L24 0 L28 5 L35 1 L33 8 Z"
          fill="#FACC15"
          stroke="#FEF9C3"
          strokeWidth="1.2"
        />
      )}

      {/* Soft squishy cube silhouette */}
      <path
        d="M14 6 C20 4.5, 28 4.5, 34 6 C40 6, 42 8, 42 14 C43.5 20, 43.5 28, 42 34 C42 40, 40 42, 34 42 C28 43.5, 20 43.5, 14 42 C8 42, 6 40, 6 34 C4.5 28, 4.5 20, 6 14 C6 8, 8 6, 14 6 Z"
        fill={`url(#${gradId})`}
        stroke={skin.highlightColor}
        strokeWidth="2"
      />

      {/* Star inner emblem */}
      {cubeIcon === 'star' && (
        <polygon
          points="20,17 22.5,22.5 28.5,23.2 24,27.2 25.2,33 20,30 14.8,33 16,27.2 11.5,23.2 17.5,22.5"
          fill="#FEF08A"
          fillOpacity="0.45"
        />
      )}

      {/* Specular shine */}
      <ellipse cx="15" cy="13" rx="6" ry="2.5" transform="rotate(-20 15 13)" fill="white" fillOpacity="0.72" />

      {/* Face Variants */}
      {cubeIcon === 'cyclops' ? (
        <>
          <circle cx="28" cy="23" r="8" fill="white" />
          <circle cx="29.8" cy="23" r="3.9" fill="#0F172A" />
          <circle cx="31" cy="21.5" r="1.4" fill="white" />
        </>
      ) : cubeIcon === 'visor' ? (
        <>
          <rect x="17" y="17" width="23" height="10" rx="3.5" fill="#0F172A" />
          <rect x="20" y="19.8" width="17" height="4.2" rx="2" fill={skin.highlightColor} />
        </>
      ) : cubeIcon === 'ninja' ? (
        <>
          <rect x="6" y="10" width="36" height="6" fill="#0F172A" />
          <rect x="22" y="20" width="7" height="4.5" fill="white" />
          <rect x="32" y="20" width="6.5" height="4.5" fill="white" />
          <rect x="25" y="21" width="2.8" height="2.8" fill="#0F172A" />
          <rect x="34.5" y="21" width="2.8" height="2.8" fill="#0F172A" />
        </>
      ) : (
        <>
          <ellipse cx="26" cy="22" rx="4.5" ry="5.2" fill="white" />
          <ellipse cx="36" cy="22" rx="4" ry="4.6" fill="white" />
          <circle cx="27.3" cy="22" r="2.2" fill="#0F172A" />
          <circle cx="37.1" cy="22" r="2" fill="#0F172A" />
          <circle cx="28" cy="21" r="0.8" fill="white" />
          <circle cx="37.8" cy="21" r="0.75" fill="white" />
        </>
      )}
    </svg>
  );
}
