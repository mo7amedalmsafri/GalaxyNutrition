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

/** يسحب الماء المضاف من أزرار الويدجت (أثناء إغلاق التطبيق) ويصفّره — يُعيد المقدار بالمل */
export async function consumePendingWaterWidget(): Promise<number> {
  try {
    const w = window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean
        Plugins?: Record<string, { consumePendingWater?: () => Promise<{ pendingMl?: number }> }>
      }
    }
    if (!w.Capacitor?.isNativePlatform?.()) return 0
    const plugin = w.Capacitor?.Plugins?.WaterWidget
    if (!plugin?.consumePendingWater) return 0
    const r = await plugin.consumePendingWater()
    return typeof r?.pendingMl === 'number' && r.pendingMl > 0 ? r.pendingMl : 0
  } catch { return 0 }
}
