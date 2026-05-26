'use client'

import { useEffect, useState } from 'react'
import { BMIInfo } from '@/lib/types'
import { clamp } from '@/lib/utils'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'

interface BMICircleProps {
  bmi: BMIInfo
}

export default function BMICircle({ bmi }: BMICircleProps) {
  const t = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'

  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const radius = 70
  const circumference = 2 * Math.PI * radius
  const normalizedBMI = clamp((bmi.value - 15) / (40 - 15), 0, 1)

  // Arc starts at 135deg (bottom-left), sweeps 270deg
  const startAngle = -225
  const bmiAngle = (startAngle + 270 * normalizedBMI) * (Math.PI / 180)
  const indicatorX = 90 + 70 * Math.cos(bmiAngle)
  const indicatorY = 90 + 70 * Math.sin(bmiAngle)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="bmiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="33%" stopColor="#10b981" />
              <stop offset="66%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={circumference * 0.125}
            transform="rotate(135 90 90)"
          />

          {/* Colored arc */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="url(#bmiGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${animated ? circumference * 0.75 * normalizedBMI : 0} ${circumference}`}
            strokeDashoffset="0"
            transform="rotate(135 90 90)"
            filter="url(#glow)"
            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />

          {/* Indicator dot */}
          {animated && (
            <circle
              cx={indicatorX}
              cy={indicatorY}
              r="8"
              fill={bmi.color}
              filter="url(#glow)"
              style={{ transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}
        </svg>

        {/* Center values */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-black"
            style={{ color: bmi.color, textShadow: `0 0 20px ${bmi.color}` }}
          >
            {bmi.value}
          </span>
          <span className="text-xs text-white/60 font-medium mt-1">
            {t('مؤشر كتلة الجسم', 'Body Mass Index')}
          </span>
        </div>
      </div>

      {/* Category badge */}
      <div
        className="px-4 py-1.5 rounded-full text-sm font-bold"
        style={{
          background: `${bmi.color}22`,
          border: `1px solid ${bmi.color}55`,
          color: bmi.color,
        }}
      >
        {lang === 'en' ? bmi.categoryEn : bmi.categoryAr}
      </div>

      {/* Zone indicators */}
      <div className="flex gap-3 text-xs text-white/50 mt-1">
        <span style={{ color: '#06b6d4' }}>{t('نقص', 'Under')}</span>
        <span style={{ color: '#10b981' }}>{t('مثالي', 'Ideal')}</span>
        <span style={{ color: '#f59e0b' }}>{t('زيادة', 'Over')}</span>
        <span style={{ color: '#ef4444' }}>{t('سمنة', 'Obese')}</span>
      </div>
    </div>
  )
}
