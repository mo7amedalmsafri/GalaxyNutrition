'use client'

// مزامنة ماء اليوم مع ويدجت الشاشة الرئيسية (iOS)
// تستخدم البروكسي المباشر للجسر — نفس النمط الموثوق المستخدم في الدفع.
// على الويب أو إن غابت الإضافة: لا شيء يحدث (no-op).
export async function syncWaterWidget(waterMl: number, targetMl: number): Promise<void> {
  try {
    const w = window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean
        Plugins?: Record<string, { setWater?: (o: { waterMl: number; targetMl: number; date: string }) => Promise<unknown> }>
      }
    }
    if (!w.Capacitor?.isNativePlatform?.()) return
    const plugin = w.Capacitor?.Plugins?.WaterWidget
    if (!plugin?.setWater) return
    // نفس صيغة يوم التطبيق (UTC) ليتصفّر الويدجت مع يوم التطبيق
    const date = new Date().toISOString().split('T')[0]
    await plugin.setWater({ waterMl: Math.round(waterMl), targetMl: Math.round(targetMl), date })
  } catch { /* silent */ }
}

/**
 * يقرأ حالة الويدجت: إن كان فيه تعديل غير مُزامن (إضافة/تراجع/مسح من الويدجت
 * أثناء إغلاق التطبيق) يُعيد { dirty:true, waterMl } — والتطبيق يعتمد waterMl
 * كقيمة اليوم. غير ذلك يُعيد dirty:false.
 */
export async function getWaterWidgetState(): Promise<{ dirty: boolean; waterMl: number }> {
  try {
    const w = window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean
        Plugins?: Record<string, { getWidgetState?: () => Promise<{ dirty?: boolean; waterMl?: number; date?: string }> }>
      }
    }
    if (!w.Capacitor?.isNativePlatform?.()) return { dirty: false, waterMl: 0 }
    const plugin = w.Capacitor?.Plugins?.WaterWidget
    if (!plugin?.getWidgetState) return { dirty: false, waterMl: 0 }
    const r = await plugin.getWidgetState()
    // تحقّق أن الحالة تخصّ اليوم الحالي (UTC) لتفادي قيمة يوم سابق
    const today = new Date().toISOString().split('T')[0]
    if (r?.dirty && r?.date === today && typeof r.waterMl === 'number') {
      return { dirty: true, waterMl: Math.max(0, Math.min(r.waterMl, 6000)) }
    }
    return { dirty: false, waterMl: 0 }
  } catch { return { dirty: false, waterMl: 0 } }
}
