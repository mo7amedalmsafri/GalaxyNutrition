'use client'

// جسر إعلانات AdMob (مكافأة) — يستخدم البروكسي المباشر لجسر Capacitor
// (نفس النمط الموثوق في الدفع والويدجت، لأن wrapper الـ npm يتجمّد مع server.url).
// على الويب أو غير iOS: كل الدوال تعود بقيَم محايدة بدون أخطاء.

// معرّف وحدة المكافأة الحقيقي لتطبيق Dietak (يمكن تجاوزه بمتغيّر بيئة)
const REWARDED_IOS = process.env.NEXT_PUBLIC_ADMOB_REWARDED_IOS || 'ca-app-pub-2680565418590912/5596047384'
// إعلانات حقيقية افتراضياً — لعرض إعلانات تجريبية اضبط NEXT_PUBLIC_ADMOB_TEST=1
const USE_TEST = process.env.NEXT_PUBLIC_ADMOB_TEST === '1'

/* eslint-disable @typescript-eslint/no-explicit-any */
type AdMobPlugin = {
  initialize?: (o?: any) => Promise<any>
  requestTrackingAuthorization?: () => Promise<any>
  prepareRewardVideoAd?: (o: any) => Promise<any>
  showRewardVideoAd?: () => Promise<any>
  addListener?: (event: string, cb: (info?: any) => void) => any
}

function plugin(): AdMobPlugin | null {
  try {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, AdMobPlugin> }
    }
    if (!w.Capacitor?.isNativePlatform?.()) return null
    return w.Capacitor?.Plugins?.AdMob ?? null
  } catch { return null }
}

/** هل الإعلانات متاحة (داخل تطبيق iOS)؟ */
export function isAdsPlatform(): boolean {
  return plugin() !== null
}

let initialized = false

/** تهيئة SDK مرة واحدة + طلب إذن التتبّع (ATT) */
export async function initAds(): Promise<void> {
  const p = plugin()
  if (!p?.initialize || initialized) return
  try {
    await p.initialize({ initializeForTesting: USE_TEST })
    initialized = true
    // إذن التتبّع (اختياري للإعلانات؛ لا يمنع ظهورها إن رُفض)
    try { await p.requestTrackingAuthorization?.() } catch { /* ignore */ }
  } catch { /* ignore */ }
}

/**
 * يعرض إعلان مكافأة. يعود true إذا أكمل المستخدم المشاهدة واستحقّ المكافأة.
 * يُحضّر الإعلان ثم يعرضه ويستمع لحدث المكافأة.
 */
export async function showRewardedAd(): Promise<boolean> {
  const p = plugin()
  if (!p?.prepareRewardVideoAd || !p?.showRewardVideoAd) return false
  try {
    await initAds()
    let earned = false
    // استمع لحدث المكافأة (يُطلق عند اكتمال المشاهدة)
    try {
      p.addListener?.('onRewardedVideoAdReward', () => { earned = true })
    } catch { /* ignore */ }

    await p.prepareRewardVideoAd({ adId: REWARDED_IOS, isTesting: USE_TEST })
    const res = await p.showRewardVideoAd()
    // بعض الإصدارات تُعيد كائن المكافأة مباشرة من show
    if (res && (res.type || res.amount || res.rewardItem)) earned = true
    return earned
  } catch { return false }
}
