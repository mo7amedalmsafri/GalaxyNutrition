'use client'

import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'

interface DataPoint {
  date: string
  weight: number
}

interface WeightMiniChartProps {
  data: DataPoint[]
  currentWeight: number
  targetWeight: number
}

export default function WeightMiniChart({ data, currentWeight, targetWeight }: WeightMiniChartProps) {
  const t = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'

  // ── derived ────────────────────────────────────────────────────────────
  const startWeight   = data.length > 0 ? data[0].weight : currentWeight
  const toGoal        = Math.max(currentWeight - targetWeight, 0)
  const totalJourney  = startWeight - targetWeight
  const progressPct   = totalJourney > 0
    ? Math.max(0, Math.min(1, (startWeight - currentWeight) / totalJourney))
    : 0

  // 7-day trend = last entry minus first entry in the data window
  const weekTrend   = data.length >= 2 ? data[data.length - 1].weight - data[0].weight : 0
  const trendColor  = weekTrend < 0 ? '#10b981' : weekTrend > 0 ? '#ef4444' : '#f59e0b'
  const trendIcon   = weekTrend < 0 ? '↓' : weekTrend > 0 ? '↑' : '→'
  const trendLabel  = weekTrend !== 0
    ? `${trendIcon} ${Math.abs(weekTrend).toFixed(1)} ${t('كغ', 'kg')}`
    : `→ ${t('ثابت', 'stable')}`

  // ── chart math ─────────────────────────────────────────────────────────
  const W = 300, H = 80, P = 12
  const weights = data.map(d => d.weight)
  const minW = Math.min(...weights, targetWeight) - 1.5
  const maxW = Math.max(...weights) + 1.5
  const gX = (i: number) => P + (i / Math.max(data.length - 1, 1)) * (W - P * 2)
  const gY = (w: number) => H - P - ((w - minW) / (maxW - minW)) * (H - P * 2)

  const linePoints = data.map((d, i) => `${gX(i)},${gY(d.weight)}`).join(' ')
  const areaPoints = [
    `${gX(0)},${H}`,
    ...data.map((d, i) => `${gX(i)},${gY(d.weight)}`),
    `${gX(data.length - 1)},${H}`,
  ].join(' ')

  return (
    <div className="flex flex-col gap-4">

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">

        {/* Current */}
        <div className="flex flex-col items-center gap-0.5 py-3 rounded-2xl"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}>
          <span className="text-xl font-black text-white">{currentWeight}</span>
          <span className="text-[10px] text-white/40">{t('الحالي', 'Current')}</span>
          <span className="text-[10px] text-white/25">{t('كغ', 'kg')}</span>
        </div>

        {/* 7-day trend */}
        <div className="flex flex-col items-center gap-0.5 py-3 rounded-2xl"
          style={{ background: `${trendColor}12`, border: `1px solid ${trendColor}28` }}>
          <span className="text-lg font-black" style={{ color: trendColor }}>{trendLabel}</span>
          <span className="text-[10px] text-white/40">{t('آخر 7 أيام', 'Last 7 days')}</span>
        </div>

        {/* To goal */}
        <div className="flex flex-col items-center gap-0.5 py-3 rounded-2xl"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}>
          {toGoal > 0 ? (
            <>
              <span className="text-xl font-black text-emerald-400">{toGoal.toFixed(1)}</span>
              <span className="text-[10px] text-white/40">{t('للهدف', 'To goal')}</span>
              <span className="text-[10px] text-white/25">{t('كغ', 'kg')}</span>
            </>
          ) : (
            <>
              <span className="text-xl">🎯</span>
              <span className="text-[10px] text-emerald-400 font-bold">{t('وصلت!', 'Reached!')}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Journey progress bar ───────────────────────────────────── */}
      {totalJourney > 0 && (
        <div>
          <div className="flex justify-between text-[11px] text-white/35 mb-1.5"
            style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}>
            <span>{t('البداية', 'Start')}: {startWeight} {t('كغ', 'kg')}</span>
            <span>{t('الهدف', 'Goal')}: {targetWeight} {t('كغ', 'kg')}</span>
          </div>

          <div className="relative h-4 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="absolute inset-0 h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #97E325, #10b981)',
                boxShadow: '0 0 10px rgba(16,185,129,0.45)',
              }}
            />
            {/* Milestone dot */}
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg transition-all duration-1000"
              style={{ left: `calc(${progressPct * 100}% - 6px)` }}
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <span className="text-xs font-bold" style={{ color: '#10b981' }}>
              {Math.round(progressPct * 100)}%
            </span>
            <span className="text-xs text-white/35">{t('من رحلتك مكتملة', 'of your journey complete')}</span>
          </div>
        </div>
      )}

      {/* ── SVG chart ─────────────────────────────────────────────── */}
      {data.length >= 2 ? (
        <>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
            style={{ height: 72, display: 'block' }}>
            <defs>
              <linearGradient id="wgArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#a855f7" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
              <filter id="wgGlow">
                <feGaussianBlur stdDeviation="2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Area fill */}
            <polygon points={areaPoints} fill="url(#wgArea)" />

            {/* Line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#wgGlow)"
            />

            {/* Data dots */}
            {data.map((d, i) => (
              <circle key={i} cx={gX(i)} cy={gY(d.weight)} r="3.5" fill="#ec4899"
                filter="url(#wgGlow)" />
            ))}

            {/* Target dashed line */}
            <line
              x1={P} y1={gY(targetWeight)}
              x2={W - P} y2={gY(targetWeight)}
              stroke="#f59e0b" strokeWidth="1.5"
              strokeDasharray="5,5" opacity="0.65"
            />
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <div className="w-5 h-px" style={{ border: '1.5px dashed #f59e0b', opacity: 0.65 }} />
            <span>{t('الهدف', 'Goal')}: {targetWeight} {t('كغ', 'kg')}</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 py-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-4xl">📊</span>
          <span className="text-sm text-white/35 text-center">
            {t('سجّل وزنك يومياً لرؤية مسارك', 'Log weight daily to see your progress')}
          </span>
        </div>
      )}
    </div>
  )
}
