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

export const LEVELS: LevelInfo[] = [
  {
    level: 1, minXp: 0,    maxXp: 150,
    name: 'مبتدئ',        nameEn: 'Beginner',
    color: '#94a3b8',      icon: '🌱',
    rewardAr: 'أهلاً بك في رحلة الصحة!',
    rewardEn: 'Welcome to your health journey!',
  },
  {
    level: 2, minXp: 150,  maxXp: 400,
    name: 'مستكشف',       nameEn: 'Explorer',
    color: '#06b6d4',      icon: '🔍',
    rewardAr: 'شارة المستكشف مفتوحة',
    rewardEn: 'Explorer badge unlocked',
  },
  {
    level: 3, minXp: 400,  maxXp: 800,
    name: 'ملتزم',        nameEn: 'Committed',
    color: '#10b981',      icon: '💪',
    rewardAr: 'إطار أفاتار أخضر حصري',
    rewardEn: 'Exclusive green avatar frame',
  },
  {
    level: 4, minXp: 800,  maxXp: 1400,
    name: 'بطل',          nameEn: 'Champion',
    color: '#f59e0b',      icon: '🏆',
    rewardAr: 'إطار ذهبي + شارة البطل',
    rewardEn: 'Gold frame + Champion badge',
  },
  {
    level: 5, minXp: 1400, maxXp: 2200,
    name: 'محترف',        nameEn: 'Pro',
    color: '#8b5cf6',      icon: '⭐',
    rewardAr: 'لقب المحترف + ثيم بنفسجي',
    rewardEn: 'Pro title + Purple theme',
  },
  {
    level: 6, minXp: 2200, maxXp: 3500,
    name: 'أسطورة',       nameEn: 'Legend',
    color: '#ef4444',      icon: '🔥',
    rewardAr: 'شارة الأسطورة الحمراء',
    rewardEn: 'Red Legend badge',
  },
  {
    level: 7, minXp: 3500, maxXp: 99999,
    name: 'نجم المجرة',   nameEn: 'Galaxy Star',
    color: '#f59e0b',      icon: '🌟',
    rewardAr: 'أعلى لقب في المجرة — نجم أسطوري! ✨',
    rewardEn: "Galaxy's highest rank — Legendary Star! ✨",
  },
]

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
