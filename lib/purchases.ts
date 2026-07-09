'use client'

// ── Dietak — Apple In-App Purchase عبر RevenueCat ────────────────────
//  يعمل فقط داخل تطبيق iOS الأصلي. على الويب كل الدوال no-op.
//  يتطلب: NEXT_PUBLIC_REVENUECAT_IOS_KEY (مفتاح RevenueCat العام appl_...)
//  + منتج اشتراك في App Store Connect + Entitlement اسمه "pro" في RevenueCat.
// ─────────────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core'

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

/** هل ميزة الشراء متاحة (تطبيق أصلي + مفتاح مضبوط)؟ */
export function purchasesAvailable(): boolean {
  return isNativeIOS() && !!RC_KEY
}

// تحميل الإضافة عند الحاجة فقط (يبقي حزمة الويب نظيفة)
async function rc() {
  const mod = await import('@revenuecat/purchases-capacitor')
  return mod.Purchases
}

async function ensureConfigured() {
  if (configured) return
  const Purchases = await rc()
  await Purchases.configure({ apiKey: RC_KEY })
  configured = true
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

/** يشتري باقة الاشتراك الأولى من العرض الحالي */
export async function purchasePro(): Promise<PurchaseResult> {
  if (!isNativeIOS()) return { ok: false, error: 'not-native' }
  if (!RC_KEY) return { ok: false, error: 'no-key' }
  try {
    await ensureConfigured()
    const Purchases = await rc()
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.availablePackages?.[0]
    if (!pkg) return { ok: false, error: 'no-offering' }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
    return { ok: hasActiveEntitlement(customerInfo) }
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; userCancelled?: boolean }
    if (err?.userCancelled || err?.code === 'PURCHASE_CANCELLED' || /cancel/i.test(err?.message ?? '')) {
      return { ok: false, cancelled: true }
    }
    return { ok: false, error: err?.message ?? 'purchase-failed' }
  }
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
