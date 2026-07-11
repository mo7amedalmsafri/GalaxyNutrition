'use client'

// جسر Apple Health — يسحب السعرات المحروقة (النشاط) من تطبيق الصحة.
// يستخدم البروكسي المباشر لجسر Capacitor (نفس النمط الموثوق في الدفع والويدجت).
// على الويب أو غير iOS: كل الدوال ترجع قيماً محايدة بدون أخطاء.

type HealthPlugin = {
  isAvailable?: () => Promise<{ available?: boolean }>
  requestAuthorization?: () => Promise<{ granted?: boolean }>
  getTodayBurned?: () => Promise<{ kcal?: number }>
}

function plugin(): HealthPlugin | null {
  try {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, HealthPlugin> }
    }
    if (!w.Capacitor?.isNativePlatform?.()) return null
    return w.Capacitor?.Plugins?.DietakHealth ?? null
  } catch { return null }
}

/** هل نحن على iOS داخل التطبيق (تظهر ميزة الصحة)؟ */
export function isHealthPlatform(): boolean {
  return plugin() !== null
}

/** يطلب إذن قراءة السعرات المحروقة — يُعيد true عند القبول */
export async function requestHealthAccess(): Promise<boolean> {
  const p = plugin()
  if (!p?.requestAuthorization) return false
  try {
    const r = await p.requestAuthorization()
    return !!r?.granted
  } catch { return false }
}

/** مجموع السعرات المحروقة (نشاط) اليوم من تطبيق الصحة */
export async function getTodayBurnedFromHealth(): Promise<number> {
  const p = plugin()
  if (!p?.getTodayBurned) return 0
  try {
    const r = await p.getTodayBurned()
    return typeof r?.kcal === 'number' && r.kcal > 0 ? Math.round(r.kcal) : 0
  } catch { return 0 }
}
