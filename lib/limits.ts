// ── Galaxy Nutrition — Freemium Limits ──────────────────────────────
//
//  Free tier  : 5 AI scans / day  |  1 meal plan / week
//  Admin      : unlimited everything (add your email to .env.local)
//
//  .env.local → NEXT_PUBLIC_ADMIN_EMAILS=you@email.com,other@email.com
// ────────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export const FREE_DAILY_SCANS  = 5
export const FREE_WEEKLY_PLANS = 1

// ── Admin bypass ─────────────────────────────────────────────────────
export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

// ── Scan limits ───────────────────────────────────────────────────────
function readScanStore(): { date: string; count: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('galaxy-scan-limit')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function getTodayScanCount(): number {
  const store = readScanStore()
  if (!store) return 0
  const today = new Date().toISOString().split('T')[0]
  return store.date === today ? store.count : 0
}

export function incrementScanCount(): void {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().split('T')[0]
  const count = getTodayScanCount()
  localStorage.setItem('galaxy-scan-limit',
    JSON.stringify({ date: today, count: count + 1 }))
}

export function canScan(email?: string | null): boolean {
  return isAdmin(email) || getTodayScanCount() < FREE_DAILY_SCANS
}

/** Returns '∞' for admin, otherwise the number of scans left today */
export function remainingScans(email?: string | null): number | '∞' {
  if (isAdmin(email)) return '∞'
  return Math.max(0, FREE_DAILY_SCANS - getTodayScanCount())
}

// ── Plan limits ───────────────────────────────────────────────────────
export function getLastPlanDate(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('galaxy-last-plan')
}

export function recordPlanGenerated(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('galaxy-last-plan',
    new Date().toISOString().split('T')[0])
}

export function canGeneratePlan(email?: string | null): boolean {
  if (isAdmin(email)) return true
  const last = getLastPlanDate()
  if (!last) return true
  const diffDays = Math.floor(
    (Date.now() - new Date(last).getTime()) / 86_400_000
  )
  return diffDays >= 7
}

/** Days remaining until the next free plan (0 if available now) */
export function daysUntilNextPlan(email?: string | null): number {
  if (isAdmin(email)) return 0
  const last = getLastPlanDate()
  if (!last) return 0
  const diffDays = Math.floor(
    (Date.now() - new Date(last).getTime()) / 86_400_000
  )
  return Math.max(0, 7 - diffDays)
}
