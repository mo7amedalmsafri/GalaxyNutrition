'use client'

import { getCurrentLevel, getLevelProgress } from '@/lib/gamification'

interface LevelRingProps {
  xp:   number
  size?: number
}

export default function LevelRing({ xp, size = 50 }: LevelRingProps) {
  const level    = getCurrentLevel(xp)
  const progress = getLevelProgress(xp)

  const strokeW = 4.5
  const r       = (size - strokeW) / 2
  const circ    = 2 * Math.PI * r
  const dash    = circ * progress

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* SVG ring — rotated so the gap starts at 12 o'clock */}
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeW}
        />
        {/* progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={level.color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{
            filter:     `drop-shadow(0 0 5px ${level.color}88)`,
            transition: 'stroke-dasharray 0.7s ease',
          }}
        />
      </svg>

      {/* Center: level number + LV label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none gap-0.5">
        <span
          className="font-black text-white"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {level.level}
        </span>
        <span
          className="font-bold"
          style={{ fontSize: Math.round(size * 0.19), color: level.color }}
        >
          LV
        </span>
      </div>
    </div>
  )
}
