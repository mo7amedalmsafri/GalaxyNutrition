'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock, Check, Gift, Zap, Percent } from 'lucide-react'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useLang } from '@/lib/store'
import { LEVELS, getCurrentLevel, getLevelProgress, getXpToNextLevel } from '@/lib/gamification'
import { rewardAt, claimReward, claimedLevels, type Reward } from '@/lib/rewards'

// أيقونة SVG نظيفة لكل نوع جائزة (بدون إيموجي)
function RewardIcon({ reward, size = 13 }: { reward: Reward; size?: number }) {
  if (reward.type === 'xp_boost') return <Zap size={size} />
  if (reward.type === 'discount') return <Percent size={size} />
  return <Gift size={size} />
}

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

  const levelsDesc = [...LEVELS].reverse()   // ٢٠ فوق → ١ تحت

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
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-4"
          style={{ background: `${cur.color}18`, border: `1px solid ${cur.color}40` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${cur.color}25`, border: `2px solid ${cur.color}` }}>
            <span className="text-2xl font-black" style={{ color: cur.color }}>{curLevel}</span>
          </div>
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

        {/* ── The path (central spine + short branches) ── */}
        <div dir="ltr" className="relative">
          {levelsDesc.map(info => {
            const lvl = info.level
            const unlocked = curLevel >= lvl
            const isCurrent = curLevel === lvl
            const reward = rewardAt(lvl)
            const isClaimedR = claimed.includes(lvl)
            const canClaim = !!reward && unlocked && !isClaimedR
            const onLeft = lvl % 2 === 0
            const lineCol = unlocked ? info.color : 'rgba(255,255,255,0.08)'

            const node = (
              <div className="flex items-center justify-center flex-shrink-0 rounded-full"
                style={{
                  width: 50, height: 50,
                  background: unlocked ? `${info.color}22` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${unlocked ? info.color : 'rgba(255,255,255,0.14)'}`,
                  boxShadow: isCurrent ? `0 0 0 4px ${info.color}33, 0 0 20px ${info.color}66` : 'none',
                }}>
                {unlocked
                  ? <span className="text-base font-black" style={{ color: info.color }}>{lvl}</span>
                  : <Lock size={16} color="rgba(255,255,255,0.3)" />}
              </div>
            )

            const connector = <div style={{ width: 14, height: 5, background: lineCol, flexShrink: 0 }} />

            const rewardBox = reward ? (
              <div className="rounded-xl px-3 py-2" dir={lang === 'en' ? 'ltr' : 'rtl'}
                style={{
                  maxWidth: 156,
                  background: canClaim ? 'rgba(245,158,11,0.14)' : isClaimedR ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canClaim ? 'rgba(245,158,11,0.45)' : isClaimedR ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.09)'}`,
                }}>
                <p className="text-[11px] font-bold flex items-center gap-1.5 leading-tight"
                  style={{ color: canClaim ? '#f59e0b' : isClaimedR ? '#10b981' : 'rgba(255,255,255,0.55)' }}>
                  <RewardIcon reward={reward} /> {lang === 'en' ? reward.en : reward.ar}
                </p>
                {canClaim && reward.type === 'discount' ? (
                  <p className="text-[10px] mt-1 font-bold" style={{ color: '#f59e0b' }}>{t('متاح قريباً', 'Coming soon')}</p>
                ) : canClaim ? (
                  <button onClick={() => doClaim(lvl)} className="mt-1.5 w-full py-1 rounded-lg text-[11px] font-black"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#09090D' }}>{t('استلم', 'Claim')}</button>
                ) : isClaimedR ? (
                  <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#10b981' }}><Check size={11} /> {t('مستلَمة', 'Claimed')}</p>
                ) : (
                  <p className="text-[10px] mt-1 flex items-center gap-1 text-white/35"><Lock size={10} /> {t('مقفلة', 'Locked')}</p>
                )}
              </div>
            ) : null

            const group = onLeft
              ? <div className="flex items-center gap-2">{rewardBox}{node}{connector}</div>
              : <div className="flex items-center gap-2">{connector}{node}{rewardBox}</div>

            return (
              <div key={lvl} id={`lvl-${lvl}`} className="grid items-center"
                style={{ gridTemplateColumns: '1fr 5px 1fr', minHeight: 84 }}>
                <div className="col-start-1 flex justify-end items-center">{onLeft && group}</div>
                <div className="col-start-2 self-stretch justify-self-center" style={{ width: 5, background: lineCol }} />
                <div className="col-start-3 flex justify-start items-center">{!onLeft && group}</div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-white/30 text-xs mt-6 mb-4">
          {t('اجمع نقاط XP بتسجيل وجباتك وتمارينك لترتقي في المستويات',
             'Earn XP by logging meals & workouts to climb levels')}
        </p>
      </div>

      {/* Claim toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto rounded-2xl px-5 py-4 flex items-center gap-3 animate-slide-up"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 8px 40px rgba(245,158,11,0.5)' }}>
          <Gift size={26} color="#09090D" />
          <div>
            <p className="font-black text-sm" style={{ color: '#09090D' }}>{t('مبروك!', 'Unlocked!')}</p>
            <p className="text-xs font-bold" style={{ color: '#09090D' }}>{toast}</p>
          </div>
        </div>
      )}
    </div>
  )
}
