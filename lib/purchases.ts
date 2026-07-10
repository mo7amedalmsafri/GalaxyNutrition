'use client'

// ── Dietak — Apple In-App Purchase عبر RevenueCat ────────────────────
//  يعمل فقط داخل تطبيق iOS الأصلي. على الويب كل الدوال no-op.
//  يتطلب: NEXT_PUBLIC_REVENUECAT_IOS_KEY (مفتاح RevenueCat العام appl_...)
//  + منتج اشتراك في App Store Connect + Entitlement اسمه "pro" في RevenueCat.
// ─────────────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core'

// build marker v2 — يجبر إعادة تضمين متغيّر البيئة في حزمة العميل
const RC_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? ''
let configured = false

// التطبيق عنده صلاحية واحدة فقط (Pro)، فأي صلاحية فعّالة = مشترك.
// هذا يتجنّب الاعتماد على تطابق اسم الـ entitlement بالضبط.
function hasActiveEntitlement(customerInfo: { entitlements?: { active?: Record<string, unknown> } }): boolean {
  return Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0
}

/** هل نعمل داخل تطبيق iOS الأصلي؟ */
export function isNativeIOS(): boolean {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  } catch { return false }
}

/** هل إضافة RevenueCat الأصلية مُضمّنة في البناء ومسجّلة؟ */
export function nativePluginPresent(): boolean {
  try { return Capacitor.isPluginAvailable('Purchases') } catch { return false }
}

/** هل ميزة الشراء متاحة (تطبيق أصلي + مفتاح مضبوط)؟ */
export function purchasesAvailable(): boolean {
  return isNativeIOS() && !!RC_KEY
}

// تحميل الإضافة عند الحاجة فقط (يبقي حزمة الويب نظيفة)
async function rc() {
  const mod = await import('@revenuecat/purchases-capacitor')
  return mod.Purchases
}

// وعد مشترك يمنع استدعاء configure أكثر من مرة في نفس الوقت (سباق)
let configurePromise: Promise<void> | null = null
async function ensureConfigured(): Promise<void> {
  if (configured) return
  if (!configurePromise) {
    configurePromise = (async () => {
      const Purchases = await rc()
      // أحياناً وعد configure لا يرجع رغم نجاح التهيئة فعلياً (خلل جسر معروف)
      // فنطلقه بلا انتظار، ثم نستعلم isConfigured دورياً كبديل موثوق
      Purchases.configure({ apiKey: RC_KEY }).then(() => { configured = true }).catch(() => {})
      for (let i = 0; i < 24 && !configured; i++) {
        try {
          const r = await Purchases.isConfigured()
          if (r?.isConfigured) { configured = true; break }
        } catch { /* ignore */ }
        await new Promise(res => setTimeout(res, 500))
      }
      if (!configured) throw new Error('configure-failed')
    })().catch(e => { configurePromise = null; throw e })
  }
  return configurePromise
}

/** هل الاشتراك مفعّل حالياً على هذا الحساب؟ */
export async function checkProEntitlement(): Promise<boolean> {
  if (!purchasesAvailable()) return false
  try {
    await ensureConfigured()
    const Purchases = await rc()
    const { customerInfo } = await Purchases.getCustomerInfo()
    return hasActiveEntitlement(customerInfo)
  } catch {
    return false
  }
}

export interface PurchaseResult { ok: boolean; cancelled?: boolean; error?: string }

// يمنع التعليق للأبد: يفشل الوعد بعد المهلة مع اسم الخطوة
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout:' + label)), ms)),
  ])
}

/** يشتري باقة الاشتراك من العرض الحالي — مع مهل ورسائل تشخيص دقيقة */
export async function purchasePro(): Promise<PurchaseResult> {
  if (!isNativeIOS()) return { ok: false, error: 'not-native' }
  if (!RC_KEY) return { ok: false, error: 'no-key' }
  if (!nativePluginPresent()) return { ok: false, error: 'plugin-missing (بناء قديم؟)' }
  try {
    await withTimeout(ensureConfigured(), 15000, 'configure')
    const Purchases = await rc()

    const offerings = await withTimeout(Purchases.getOfferings(), 15000, 'offerings')
    const pkgs = offerings.current?.availablePackages ?? []
    if (pkgs.length === 0) {
      const allCount = offerings.all ? Object.keys(offerings.all).length : 0
      return { ok: false, error: `no-products (offerings=${allCount})` }
    }

    const pkg =
      pkgs.find(p => p.product?.identifier === 'dietak_pro_monthly') ??
      pkgs.find(p => p.packageType === 'MONTHLY') ??
      pkgs[0]

    const { customerInfo } = await withTimeout(Purchases.purchasePackage({ aPackage: pkg }), 120000, 'purchase')
    return { ok: hasActiveEntitlement(customerInfo) }
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; userCancelled?: boolean }
    if (err?.userCancelled || err?.code === 'PURCHASE_CANCELLED' || /cancel/i.test(err?.message ?? '')) {
      return { ok: false, cancelled: true }
    }
    const probe = await probeBridge()
    return { ok: false, error: `${err?.message ?? 'purchase-failed'} | ${bridgeDiag()} | ${probe}` }
  }
}

// اختبار حاسم: ننادي إضافة نظام أخرى (Cookies) — لو ردّت فالجسر سليم
// والعطل خاص بإضافة الدفع؛ لو علّقت فالجسر كله معطّل مع الرابط البعيد
async function probeBridge(): Promise<string> {
  try {
    const w = window as unknown as { Capacitor?: { Plugins?: Record<string, { getCookies?: () => Promise<unknown> }> } }
    const cookies = w.Capacitor?.Plugins?.CapacitorCookies
    if (!cookies?.getCookies) return 'probe:no-cookies-plugin'
    return await Promise.race([
      cookies.getCookies().then(() => 'probe:bridge-OK'),
      new Promise<string>(res => setTimeout(() => res('probe:bridge-HANG'), 3000)),
    ])
  } catch (e) { return 'probe:err:' + (e as Error).message }
}

// تشخيص حالة جسر Capacitor — يُلحق برسالة الخطأ لتحديد مكان العطل
function bridgeDiag(): string {
  try {
    const w = window as unknown as { Capacitor?: { Plugins?: Record<string, unknown>; getPlatform?: () => string } }
    const cap = w.Capacitor
    if (!cap) return 'noCap'
    const plugins = cap.Plugins ? Object.keys(cap.Plugins).join(',') : 'noPlugins'
    return `platform=${cap.getPlatform?.()} avail=${Capacitor.isPluginAvailable('Purchases')} plugins=[${plugins}]`
  } catch (e) { return 'diag-err:' + (e as Error).message }
}

/** يستعيد المشتريات السابقة (عند تغيير الجهاز / إعادة التثبيت) */
export async function restorePurchases(): Promise<boolean> {
  if (!purchasesAvailable()) return false
  try {
    await ensureConfigured()
    const Purchases = await rc()
    const { customerInfo } = await Purchases.restorePurchases()
    return hasActiveEntitlement(customerInfo)
  } catch {
    return false
  }
}

/** سعر الباقة الأول للعرض (للعرض في الواجهة) — null إن تعذّر */
export async function getProPrice(): Promise<string | null> {
  if (!purchasesAvailable()) return null
  try {
    await ensureConfigured()
    const Purchases = await rc()
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.availablePackages?.[0]
    return pkg?.product?.priceString ?? null
  } catch {
    return null
  }
}
