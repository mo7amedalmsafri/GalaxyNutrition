// ── Galaxy Nutrition — Freemium / Pro Limits ─────────────────────────
//
//  Free tier  : 2 AI scans / day  |  1 meal plan / week
//  Pro tier   : unlimited everything
//  Admin      : also unlimited (add email to NEXT_PUBLIC_ADMIN_EMAILS)
//
//  Pro activation: user enters NEXT_PUBLIC_PRO_CODE in settings → stored
//  in localStorage under 'galaxy-pro-active'.
// ────────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export const FREE_DAILY_SCANS  = 2
export const FREE_WEEKLY_PLANS = 1
const PRO_KEY = 'galaxy-pro-active'

// ── Admin bypass ─────────────────────────────────────────────────────
export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

// ── Pro tier ─────────────────────────────────────────────────────────
/** Returns true if user is admin OR has activated Pro locally */
export function isProUser(email?: string | null): boolean {
  if (isAdmin(email)) return true
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PRO_KEY) === 'true'
}

// Default built-in code — always works without any env var.
// Override by setting NEXT_PUBLIC_PRO_CODE in Vercel if you want a custom code.
const DEFAULT_PRO_CODE = 'GALAXY-PRO-2025'

/** Validates `code` and activates Pro in localStorage.
 *  Accepts NEXT_PUBLIC_PRO_CODE if set, otherwise falls back to DEFAULT_PRO_CODE. */
export function activatePro(code: string): boolean {
  const validCode = process.env.NEXT_PUBLIC_PRO_CODE ?? DEFAULT_PRO_CODE
  if (code.trim().toUpperCase() !== validCode.trim().toUpperCase()) return false
  localStorage.setItem(PRO_KEY, 'true')
  return true
}

/** Removes the local Pro activation (admin bypass is not affected). */
export function deactivatePro(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(PRO_KEY)
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
  return isProUser(email) || getTodayScanCount() < FREE_DAILY_SCANS
}

/** Returns '∞' for Pro/admin, otherwise the number of scans left today */
export function remainingScans(email?: string | null): number | '∞' {
  if (isProUser(email)) return '∞'
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
  if (isProUser(email)) return true
  const last = getLastPlanDate()
  if (!last) return true
  const diffDays = Math.floor(
    (Date.now() - new Date(last).getTime()) / 86_400_000
  )
  return diffDays >= 7
}

/** Days remaining until the next free plan (0 if available now) */
export function daysUntilNextPlan(email?: string | null): number {
  if (isProUser(email)) return 0
  const last = getLastPlanDate()
  if (!last) return 0
  const diffDays = Math.floor(
    (Date.now() - new Date(last).getTime()) / 86_400_000
  )
  return Math.max(0, 7 - diffDays)
}
