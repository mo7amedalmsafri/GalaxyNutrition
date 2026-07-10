'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock, Check, Gift } from 'lucide-react'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useLang } from '@/lib/store'
import { LEVELS, getCurrentLevel, getLevelProgress, getXpToNextLevel } from '@/lib/gamification'
import { rewardAt, claimReward, claimedLevels } from '@/lib/rewards'

export default function RewardsPage() {
  const t = useT()
  const lang = useLang()
  const router = useRouter()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)

  const currentXp = (profile.xpLocked ?? 0) + (profile.xpPending ?? 0)
  const cur = getCurrentLevel(currentXp)
  const curLevel = cur.level
  const progress = getLevelProgress(currentXp)
  const toNext = getXpToNextLevel(currentXp)

  const [claimed, setClaimed] = useState<number[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => { setClaimed(claimedLevels()) }, [])
  useEffect(() => {
    // ينزل تلقائياً لمستواك الحالي عند الفتح
    const el = document.getElementById(`lvl-${curLevel}`)
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 60)
  }, [curLevel])

  const doClaim = (level: number) => {
    const r = claimReward(level)
    if (!r) return
    setClaimed(claimedLevels())
    setToast(lang === 'en' ? r.en : r.ar)
    setTimeout(() => setToast(''), 3500)
  }

  // من الأعلى (٢٠) للأسفل (١) — المستوى ١ تحت
  const levelsDesc = [...LEVELS].reverse()

  return (
    <div className="min-h-screen px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,33,168,0.18) 0%, transparent 55%), #0a0014', direction: lang === 'en' ? 'ltr' : 'rtl' }}>
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronRight size={20} color="#fff" style={{ transform: lang === 'en' ? 'rotate(180deg)' : 'none' }} />
          </button>
          <h1 className="text-xl font-black text-white">{t('الجوائز والمستويات', 'Rewards & Levels')}</h1>
        </div>

        {/* Current level summary */}
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-4"
          style={{ background: `${cur.color}18`, border: `1px solid ${cur.color}40` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: `${cur.color}25` }}>{cur.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg" style={{ color: cur.color }}>
              {t('المستوى', 'Level')} {curLevel} · {lang === 'en' ? cur.nameEn : cur.name}
            </p>
            <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: cur.color }} />
            </div>
            <p className="text-xs text-white/45 mt-1">
              {currentXp} XP {toNext > 0 && `· ${toNext} ${t('للمستوى التالي', 'to next level')}`}
            </p>
          </div>
        </div>

        {/* ── The path ── */}
        <div className="relative">
          {levelsDesc.map(info => {
            const lvl = info.level
            const unlocked = curLevel >= lvl
            const isCurrent = curLevel === lvl
            const reward = rewardAt(lvl)
            const isClaimedR = claimed.includes(lvl)
            const canClaim = !!reward && unlocked && !isClaimedR
            const left = lvl % 2 === 0   // تناوب الجهة

            return (
              <div key={lvl} id={`lvl-${lvl}`} className="relative flex items-center" style={{ minHeight: 104 }}>
                {/* spine segment */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[6px]"
                  style={{ background: unlocked ? info.color : 'rgba(255,255,255,0.07)' }} />

                {/* row content pushed to one side */}
                <div className="relative z-10 w-full flex" style={{ justifyContent: left ? 'flex-start' : 'flex-end' }}>
                  <div className="flex items-center gap-3" style={{ flexDirection: left ? 'row' : 'row-reverse' }}>

                    {/* node circle */}
                    <div className="flex flex-col items-center justify-center flex-shrink-0 rounded-full"
                      style={{
                        width: 62, height: 62,
                        background: unlocked ? `${info.color}25` : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${unlocked ? info.color : 'rgba(255,255,255,0.12)'}`,
                        boxShadow: isCurrent ? `0 0 0 4px ${info.color}40, 0 0 22px ${info.color}70` : 'none',
                        opacity: unlocked ? 1 : 0.55,
                      }}>
                      <span className="text-xl leading-none">{unlocked ? info.icon : '🔒'}</span>
                      <span className="text-[10px] font-black mt-0.5" style={{ color: unlocked ? info.color : 'rgba(255,255,255,0.4)' }}>
                        {lvl}
                      </span>
                    </div>

                    {/* reward chip */}
                    {reward && (
                      <div className="rounded-xl px-3 py-2 max-w-[180px]"
                        style={{
                          background: canClaim ? 'rgba(245,158,11,0.15)' : isClaimedR ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${canClaim ? 'rgba(245,158,11,0.5)' : isClaimedR ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                        <p className="text-xs font-bold flex items-center gap-1"
                          style={{ color: canClaim ? '#f59e0b' : isClaimedR ? '#10b981' : 'rgba(255,255,255,0.6)' }}>
                          <span>{reward.icon}</span> {lang === 'en' ? reward.en : reward.ar}
                        </p>
                        {canClaim && reward.type === 'discount' ? (
                          <p className="text-[10px] mt-1 font-bold" style={{ color: '#f59e0b' }}>
                            {t('متاح قريباً عبر الاشتراك', 'Coming soon via subscription')}
                          </p>
                        ) : canClaim ? (
                          <button onClick={() => doClaim(lvl)}
                            className="mt-1.5 w-full py-1 rounded-lg text-xs font-black"
                            style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#09090D' }}>
                            {t('استلم 🎁', 'Claim 🎁')}
                          </button>
                        ) : isClaimedR ? (
                          <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#10b981' }}>
                            <Check size={11} /> {t('مستلَمة', 'Claimed')}
                          </p>
                        ) : (
                          <p className="text-[10px] mt-1 flex items-center gap-1 text-white/35">
                            <Lock size={10} /> {t(`تفتح بالمستوى ${lvl}`, `Unlocks at level ${lvl}`)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-white/30 text-xs mt-6 mb-4">
          {t('اجمع نقاط XP بتسجيل وجباتك وتمارينك لترتقي في المستويات 🚀',
             'Earn XP by logging meals & workouts to climb levels 🚀')}
        </p>
      </div>

      {/* Claim toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto rounded-2xl px-5 py-4 flex items-center gap-3 animate-slide-up"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 8px 40px rgba(245,158,11,0.5)' }}>
          <Gift size={26} color="#09090D" />
          <div>
            <p className="font-black text-sm" style={{ color: '#09090D' }}>{t('مبروك! 🎉', 'Unlocked! 🎉')}</p>
            <p className="text-xs font-bold" style={{ color: '#09090D' }}>{toast}</p>
          </div>
        </div>
      )}
    </div>
  )
}
