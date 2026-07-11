'use client'

import { useState, useEffect } from 'react'
import { Play, Loader2, Check } from 'lucide-react'
import { isAdsPlatform, initAds, showRewardedAd } from '@/lib/ads'
import { useT } from '@/lib/store'

type Scheme = 'cyan' | 'green' | 'amber'
const SCHEMES: Record<Scheme, { c: string; grad: string; border: string }> = {
  cyan:  { c: '#00D4FF', grad: 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(59,130,246,0.08))',  border: 'rgba(0,212,255,0.4)' },
  green: { c: '#97E325', grad: 'linear-gradient(135deg, rgba(151,227,37,0.16), rgba(151,227,37,0.06))', border: 'rgba(151,227,37,0.4)' },
  amber: { c: '#f59e0b', grad: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.08))', border: 'rgba(245,158,11,0.4)' },
}

/**
 * زر «شاهد إعلاناً» عام — يظهر داخل تطبيق iOS فقط.
 * عند إكمال المشاهدة يستدعي onReward() ثم (اختياري) يعيد تحميل الصفحة.
 */
export default function WatchAdButton({
  label,
  successLabel,
  onReward,
  reloadAfter = true,
  scheme = 'cyan',
  disabled = false,
}: {
  label: string
  successLabel: string
  onReward: () => void
  reloadAfter?: boolean
  scheme?: Scheme
  disabled?: boolean
}) {
  const t = useT()
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const s = SCHEMES[scheme]

  useEffect(() => {
    if (isAdsPlatform()) { setAvailable(true); initAds() }
  }, [])

  if (!available) return null

  const watch = async () => {
    if (loading || disabled) return
    setLoading(true); setErr('')
    const earned = await showRewardedAd()
    setLoading(false)
    if (earned) {
      onReward()
      setDone(true)
      if (reloadAfter) setTimeout(() => window.location.reload(), 1200)
      else setTimeout(() => setDone(false), 2500)
    } else {
      setErr(t('لم يكتمل الإعلان — حاول مرة أخرى', 'Ad not completed — try again'))
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={watch}
        disabled={loading || done || disabled}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ background: s.grad, border: `1px solid ${s.border}` }}
      >
        {done
          ? <Check size={16} color={s.c} className="flex-shrink-0" />
          : loading
            ? <Loader2 size={16} color={s.c} className="flex-shrink-0 animate-spin" />
            : <Play size={16} color={s.c} className="flex-shrink-0" fill={s.c} />}
        <span className="text-xs font-semibold text-start flex-1" style={{ color: s.c }}>
          {done ? successLabel : loading ? t('جاري تحميل الإعلان...', 'Loading ad...') : label}
        </span>
      </button>
      {err && <p className="text-[11px] mt-1 text-center" style={{ color: '#f87171' }}>{err}</p>}
    </div>
  )
}
