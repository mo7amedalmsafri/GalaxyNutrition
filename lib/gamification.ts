// ── Galaxy Nutrition — Gamification (Levels & XP) ────────────────────────

export interface LevelInfo {
  level:    number
  name:     string   // Arabic
  nameEn:   string   // English
  color:    string
  icon:     string
  minXp:    number
  maxXp:    number
  rewardAr: string
  rewardEn: string
}

// عتبات XP لكل مستوى (٢٠ مستوى، الفجوة تكبر تدريجياً)
const LEVEL_XP = [0, 150, 400, 800, 1400, 2200, 3200, 4400, 5800, 7400,
                  9200, 11200, 13400, 15800, 18400, 21200, 24200, 27400, 30800, 34400]

const LEVEL_META: { name: string; nameEn: string; color: string; icon: string }[] = [
  { name: 'مبتدئ',      nameEn: 'Beginner',    color: '#94a3b8', icon: '🌱' },
  { name: 'مستكشف',     nameEn: 'Explorer',    color: '#22d3ee', icon: '🔍' },
  { name: 'ملتزم',      nameEn: 'Committed',   color: '#10b981', icon: '💪' },
  { name: 'نشيط',       nameEn: 'Active',      color: '#84cc16', icon: '⚡' },
  { name: 'محترف',      nameEn: 'Pro',         color: '#8b5cf6', icon: '⭐' },
  { name: 'متقدّم',     nameEn: 'Advanced',    color: '#06b6d4', icon: '🎯' },
  { name: 'خبير',       nameEn: 'Expert',      color: '#3b82f6', icon: '🧠' },
  { name: 'بطل',        nameEn: 'Champion',    color: '#f59e0b', icon: '🏆' },
  { name: 'متمكّن',     nameEn: 'Master',      color: '#eab308', icon: '🥇' },
  { name: 'أسطورة',     nameEn: 'Legend',      color: '#ef4444', icon: '🔥' },
  { name: 'صقر',        nameEn: 'Falcon',      color: '#f97316', icon: '🦅' },
  { name: 'قائد',       nameEn: 'Leader',      color: '#14b8a6', icon: '🚩' },
  { name: 'محارب',      nameEn: 'Warrior',     color: '#dc2626', icon: '⚔️' },
  { name: 'نخبة',       nameEn: 'Elite',       color: '#a855f7', icon: '💎' },
  { name: 'جبّار',      nameEn: 'Titan',       color: '#6366f1', icon: '🗿' },
  { name: 'عملاق',      nameEn: 'Giant',       color: '#f43f5e', icon: '🌋' },
  { name: 'خارق',       nameEn: 'Superhuman',  color: '#0ea5e9', icon: '🦾' },
  { name: 'أسطوري',     nameEn: 'Mythic',      color: '#8b5cf6', icon: '🌌' },
  { name: 'نجم',        nameEn: 'Star',        color: '#fbbf24', icon: '🌟' },
  { name: 'نجم المجرة', nameEn: 'Galaxy Star', color: '#f59e0b', icon: '👑' },
]

export const LEVELS: LevelInfo[] = LEVEL_META.map((m, i) => ({
  level: i + 1,
  minXp: LEVEL_XP[i],
  maxXp: i < LEVEL_XP.length - 1 ? LEVEL_XP[i + 1] : 999999,
  name: m.name,
  nameEn: m.nameEn,
  color: m.color,
  icon: m.icon,
  rewardAr: '',
  rewardEn: '',
}))

/** مضاعِف XP: يفتح +٢٥٪ عند المستوى ٤ */
export function xpMultiplier(level: number): number {
  return level >= 4 ? 1.25 : 1
}

// ── XP earned per action ─────────────────────────────────────────────────
export const XP_REWARDS = {
  LOG_FOOD:   10,   // تسجيل وجبة
  LOG_WATER:   5,   // تسجيل ماء
  LOG_WEIGHT: 15,   // تسجيل الوزن
  SCAN_FOOD:  20,   // مسح طعام بالكاميرا
}

/** Maximum XP that can be earned in a single day */
export const XP_DAILY_CAP = 50

/**
 * Returns how much XP should actually be awarded, capped by the daily limit.
 * If the cap is already reached, returns 0.
 */
export function capDailyXp(currentPending: number, amount: number): number {
  const remaining = Math.max(0, XP_DAILY_CAP - currentPending)
  return Math.min(amount, remaining)
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Current level based on total XP */
export function getCurrentLevel(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i]
  }
  return LEVELS[0]
}

/** Progress within the current level (0 → 1) */
export function getLevelProgress(xp: number): number {
  const cur = getCurrentLevel(xp)
  if (cur.level === LEVELS.length) return 1      // max level → full ring
  const range  = cur.maxXp - cur.minXp
  const earned = xp - cur.minXp
  return Math.max(0, Math.min(earned / range, 1))
}

/** XP needed to reach the next level */
export function getXpToNextLevel(xp: number): number {
  const cur = getCurrentLevel(xp)
  if (cur.level === LEVELS.length) return 0      // already max
  return cur.maxXp - xp
}

/**
 * Call once on app boot.
 * If today ≠ xpDate, the pending XP from yesterday is permanently locked.
 * Returns the patch to apply to StoredProfile (or null if nothing changed).
 */
export function buildXpRollover(
  xpLocked:  number,
  xpPending: number,
  xpDate:    string | undefined,
  today:     string
): { xpLocked: number; xpPending: number; xpDate: string } | null {
  if (!xpDate) return { xpLocked, xpPending: 0, xpDate: today }  // first launch
  if (xpDate === today) return null                                // same day, no-op
  // New day → lock yesterday's pending permanently
  return { xpLocked: xpLocked + xpPending, xpPending: 0, xpDate: today }
}
