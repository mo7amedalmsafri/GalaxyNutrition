'use client'

// ── Dietak — جوائز المستويات (Battle Pass) ───────────────────────────
import { grantRewardProHours } from '@/lib/limits'

export type RewardType = 'xp_boost' | 'free_pro' | 'discount'

export interface Reward {
  level: number
  type: RewardType
  hours?: number       // لجوائز free_pro
  percent?: number     // لجائزة الخصم
  icon: string
  ar: string
  en: string
}

// الجوائز عند مستويات محددة (الباقي بلا جائزة)
export const REWARDS: Reward[] = [
  { level: 4,  type: 'xp_boost', icon: '🚀', ar: 'زيادة نقاط دائمة +٢٥٪',      en: '+25% XP forever' },
  { level: 5,  type: 'free_pro',  hours: 1,  icon: '🎁', ar: 'ساعة Pro مجانية',        en: '1 hour free Pro' },
  { level: 10, type: 'free_pro',  hours: 24, icon: '🎁', ar: 'يوم Pro مجاني',          en: '1 day free Pro' },
  { level: 15, type: 'free_pro',  hours: 48, icon: '🎁', ar: 'يومان Pro مجاني',        en: '2 days free Pro' },
  { level: 18, type: 'free_pro',  hours: 72, icon: '🎁', ar: '٣ أيام Pro مجاني',       en: '3 days free Pro' },
  { level: 20, type: 'discount', percent: 50, icon: '💰', ar: 'خصم ٥٠٪ على الاشتراك', en: '50% off subscription' },
]

export function rewardAt(level: number): Reward | undefined {
  return REWARDS.find(r => r.level === level)
}

// ── المستلَمة (localStorage) ──────────────────────────────────────────
const CLAIMED_KEY = 'dietak-claimed-rewards'

export function claimedLevels(): number[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CLAIMED_KEY) || '[]') } catch { return [] }
}

export function isClaimed(level: number): boolean {
  return claimedLevels().includes(level)
}

/** هل الجائزة جاهزة للاستلام؟ (وصل المستوى + غير مستلَمة) */
export function isClaimable(level: number, currentLevel: number): boolean {
  return !!rewardAt(level) && currentLevel >= level && !isClaimed(level)
}

/**
 * يستلم جائزة المستوى ويطبّق أثرها.
 * يُعيد نوع الجائزة (أو null إن تعذّر).
 */
export function claimReward(level: number): Reward | null {
  const reward = rewardAt(level)
  if (!reward || isClaimed(level)) return null

  if (reward.type === 'free_pro' && reward.hours) {
    grantRewardProHours(reward.hours)
  }
  // xp_boost: تأثير سلبي (يُقرأ من المستوى مباشرة) — يكفي التعليم كمستلَم
  // discount: يُفعّل عبر Apple لاحقاً — نعلّمه كمستلَم ونعرض إشعاراً

  if (typeof window !== 'undefined') {
    const next = Array.from(new Set([...claimedLevels(), level]))
    localStorage.setItem(CLAIMED_KEY, JSON.stringify(next))
  }
  return reward
}
