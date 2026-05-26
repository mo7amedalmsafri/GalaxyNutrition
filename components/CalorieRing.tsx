'use client'

import { useEffect, useState } from 'react'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'

interface CalorieRingProps {
  consumed: number
  target: number
  size?: number
}

export default function CalorieRing({ consumed, target, size = 140 }: CalorieRingProps) {
  const t = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'

  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(timer)
  }, [])

  const radius = (size - 24) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(consumed / target, 1)
  const offset = animated ? circumference - progress * circumference : circumference
  const center = size / 2

  const isOver = consumed > target
  const remaining = Math.max(target - consumed, 0)

  const fmt = (n: number) => n.toLocaleString(lang === 'en' ? 'en' : 'ar')

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isOver ? '#ef4444' : '#6b21a8'} />
              <stop offset="50%" stopColor={isOver ? '#f97316' : '#ec4899'} />
              <stop offset="100%" stopColor={isOver ? '#fbbf24' : '#f59e0b'} />
            </linearGradient>
            <filter id="calGlow">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="14"
          />

          {/* Progress */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="url(#calorieGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
            filter="url(#calGlow)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-3xl font-black text-gradient-galaxy">{fmt(consumed)}</span>
          <span className="text-xs text-white/50">{t('سعرة', 'kcal')}</span>
          <div className="h-px w-8 bg-white/20 my-1" />
          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
            {remaining > 0
              ? `${fmt(remaining)} ${t('متبقية', 'remaining')}`
              : t('تجاوزت الهدف!', 'Goal exceeded!')}
          </span>
        </div>
      </div>

      {/* Target label */}
      <div className="text-center">
        <span className="text-white/40 text-xs">{t('الهدف اليومي: ', 'Daily Goal: ')}</span>
        <span className="text-white/80 text-sm font-bold">{fmt(target)} {t('سعرة', 'kcal')}</span>
      </div>
    </div>
  )
}
