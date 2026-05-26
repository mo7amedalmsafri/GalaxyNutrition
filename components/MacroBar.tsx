'use client'

import { useT } from '@/lib/store'

interface MacroBarProps {
  protein: number
  carbs: number
  fat: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

interface MacroItemProps {
  label: string
  value: number
  target: number
  color: string
  unit?: string
}

function MacroItem({ label, value, target, color, unit = 'g' }: MacroItemProps) {
  const rawPct = target > 0 ? (value / target) * 100 : 0
  const isOver  = rawPct > 100
  const barPct  = Math.min(rawPct, 120)   // cap bar at 120%
  const barColor = isOver ? '#FF5F1F' : color

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
          <span className="text-sm text-white/70 font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOver && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,95,31,0.15)', color: '#FF5F1F' }}
            >
              {Math.round(rawPct)}%
            </span>
          )}
          <span className="text-sm font-bold" style={{ color: barColor }}>
            {Math.round(value)}
            <span className="text-white/40 text-xs font-normal">/{Math.round(target)}{unit}</span>
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${barPct}%`,
            background: isOver
              ? 'linear-gradient(90deg, #FF5F1F88, #FF5F1F)'
              : `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${barColor}66`,
          }}
        />
      </div>
    </div>
  )
}

export default function MacroBar({ protein, carbs, fat, targetProtein, targetCarbs, targetFat }: MacroBarProps) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3">
      <MacroItem label={t('بروتين', 'Protein')}        value={protein} target={targetProtein} color="#00D4FF" />
      <MacroItem label={t('كربوهيدرات', 'Carbs')}     value={carbs}   target={targetCarbs}   color="#F59E0B" />
      <MacroItem label={t('دهون', 'Fat')}              value={fat}     target={targetFat}     color="#FF5F1F" />
    </div>
  )
}
