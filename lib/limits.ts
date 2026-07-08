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

// ══════════════════════════════════════════════════════════════════
//  🎛️ المكان المركزي للتحكم بالاشتراك — عدّل الأرقام هنا فقط
//  limit = عدد المرات المجانية | period = 'day' يومي أو 'week' أسبوعي
//  اجعل limit = 0 لجعل الميزة Pro فقط من البداية (بلا مجاني)
//  اجعل limit = رقم كبير جداً (مثل 9999) لجعلها مجانية عملياً
// ══════════════════════════════════════════════════════════════════
export type Feature = 'scan' | 'mealPlan' | 'aiCalc' | 'workoutPlan'

export const FREE_LIMITS: Record<Feature, { period: 'day' | 'week'; limit: number }> = {
  scan:        { period: 'day',  limit: 2 },  // 📷 تحليل صورة الطعام
  mealPlan:    { period: 'week', limit: 1 },  // 📋 توليد خطة غذائية
  aiCalc:      { period: 'day',  limit: 3 },  // ✨ حساب السعرات بالذكاء
  workoutPlan: { period: 'week', limit: 1 },  // 🏋️ خطة التمارين بالذكاء
}

export const FREE_DAILY_SCANS  = FREE_LIMITS.scan.limit
export const FREE_WEEKLY_PLANS = FREE_LIMITS.mealPlan.limit
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

/** يضبط علامة Pro المحلية مباشرة (تُستخدم لمزامنة اشتراك Apple/RevenueCat) */
export function setProLocal(active: boolean): void {
  if (typeof window === 'undefined') return
  if (active) localStorage.setItem(PRO_KEY, 'true')
  else localStorage.removeItem(PRO_KEY)
}

// ── نظام الحصص المجانية العام (لكل ميزة) ─────────────────────────────
// مفتاح الفترة الحالية: تاريخ اليوم للحد اليومي، أو دلو ٧ أيام للحد الأسبوعي
function periodKey(period: 'day' | 'week'): string {
  const now = new Date().toISOString().split('T')[0]
  if (period === 'day') return now
  // دلو أسبوعي ثابت (٧ أيام) اعتماداً على عدد الأيام منذ حقبة يونكس
  const epochDay = Math.floor(new Date(now).getTime() / 86_400_000)
  return 'W' + Math.floor(epochDay / 7)
}

function usageKey(f: Feature) { return `dietak-use-${f}` }

/** كم مرة استُخدمت الميزة في الفترة الحالية */
export function getFeatureUsage(f: Feature): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(usageKey(f))
    if (!raw) return 0
    const s = JSON.parse(raw)
    return s.key === periodKey(FREE_LIMITS[f].period) ? (s.count || 0) : 0
  } catch { return 0 }
}

/** سجّل استخداماً واحداً بعد نجاح العملية */
export function recordFeatureUse(f: Feature): void {
  if (typeof window === 'undefined') return
  const key = periodKey(FREE_LIMITS[f].period)
  const count = getFeatureUsage(f) + 1
  localStorage.setItem(usageKey(f), JSON.stringify({ key, count }))
}

/** هل يُسمح باستخدام الميزة الآن؟ (Pro/مشرف = دائماً، وإلا ضمن الحد) */
export function canUseFeature(f: Feature, email?: string | null): boolean {
  if (isProUser(email)) return true
  return getFeatureUsage(f) < FREE_LIMITS[f].limit
}

/** المتبقّي من الحصة المجانية ('∞' لـ Pro) */
export function remainingFeature(f: Feature, email?: string | null): number | '∞' {
  if (isProUser(email)) return '∞'
  return Math.max(0, FREE_LIMITS[f].limit - getFeatureUsage(f))
}

// ══════════════════════════════════════════════════════════════════
//  🕑 التجربة المجانية — كل الميزات المدفوعة مجانية لأول يومين من الحساب
//  عدّل TRIAL_DAYS للتحكم بمدة التجربة
// ══════════════════════════════════════════════════════════════════
export const TRIAL_DAYS = 2

/** الأيام المتبقّية من التجربة (يعتمد على تاريخ إنشاء الحساب من الخادم) */
export function trialDaysLeft(createdAtISO?: string | null): number {
  if (!createdAtISO) return TRIAL_DAYS   // قبل تحميل التاريخ لا نقفل (fail-open)
  const created = new Date(createdAtISO).getTime()
  if (isNaN(created)) return 0
  const elapsed = (Date.now() - created) / 86_400_000
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed))
}

/** هل للمستخدم وصول للميزات المدفوعة؟ (Pro/مشرف أو ما زال ضمن التجربة) */
export function hasPremiumAccess(email?: string | null, createdAtISO?: string | null): boolean {
  if (isProUser(email)) return true
  return trialDaysLeft(createdAtISO) > 0
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
