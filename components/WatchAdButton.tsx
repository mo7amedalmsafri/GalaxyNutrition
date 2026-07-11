'use client'

import { useState, useEffect } from 'react'
import { Play, Loader2, Check } from 'lucide-react'
import { isAdsPlatform, initAds, showRewardedAd } from '@/lib/ads'
import { grantRewardProHours } from '@/lib/limits'
import { useT } from '@/lib/store'

const REWARD_HOURS = 1

/**
 * زر «شاهد إعلاناً» للمجانيين داخل تطبيق iOS.
 * عند إكمال المشاهدة يمنح ساعة Pro مجانية ثم يعيد تحميل الصفحة ليُفعَّل الوصول.
 */
export default function WatchAdButton() {
  const t = useT()
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (isAdsPlatform()) {
      setAvailable(true)
      initAds()   // تهيئة مسبقة لتسريع أول إعلان
    }
  }, [])

  if (!available) return null

  const watch = async () => {
    if (loading) return
    setLoading(true); setErr('')
    const earned = await showRewardedAd()
    setLoading(false)
    if (earned) {
      grantRewardProHours(REWARD_HOURS)
      setDone(true)
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setErr(t('لم يكتمل الإعلان — حاول مرة أخرى', 'Ad not completed — try again'))
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={watch}
        disabled={loading || done}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(59,130,246,0.08))',
          border: '1px solid rgba(0,212,255,0.4)',
        }}
      >
        {done
          ? <Check size={16} color="#00D4FF" className="flex-shrink-0" />
          : loading
            ? <Loader2 size={16} color="#00D4FF" className="flex-shrink-0 animate-spin" />
            : <Play size={16} color="#00D4FF" className="flex-shrink-0" fill="#00D4FF" />}
        <span className="text-xs font-semibold text-start flex-1" style={{ color: '#00D4FF' }}>
          {done
            ? t('تم تفعيل ساعة مجانية ✨', 'Free hour activated ✨')
            : loading
              ? t('جاري تحميل الإعلان...', 'Loading ad...')
              : t('شاهد إعلاناً واحصل على ساعة استخدام مجانية', 'Watch an ad for 1 free hour')}
        </span>
      </button>
      {err && <p className="text-[11px] mt-1 text-center" style={{ color: '#f87171' }}>{err}</p>}
    </div>
  )
}
