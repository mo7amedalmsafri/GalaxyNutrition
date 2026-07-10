import Foundation
import Capacitor
import WidgetKit

/**
 * جسر ماء الويدجت: يستقبل قيمة الماء من تطبيق الويب،
 * يخزّنها في App Group المشترك، ويطلب من iOS تحديث الويدجت فوراً.
 */
@objc(WaterWidgetPlugin)
public class WaterWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WaterWidgetPlugin"
    public let jsName = "WaterWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWater", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumePendingWater", returnType: CAPPluginReturnPromise)
    ]

    private let appGroup = "group.com.dietak.app"

    @objc func setWater(_ call: CAPPluginCall) {
        let waterMl = call.getInt("waterMl") ?? 0
        let targetMl = call.getInt("targetMl") ?? 2500
        let date = call.getString("date") ?? ""

        if let defaults = UserDefaults(suiteName: appGroup) {
            defaults.set(waterMl, forKey: "waterMl")
            defaults.set(targetMl, forKey: "waterTargetMl")
            defaults.set(date, forKey: "waterDate")
        }

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["ok": true])
    }

    /// يُعيد الماء المضاف من أزرار الويدجت (أثناء إغلاق التطبيق) ويصفّره —
    /// التطبيق يضيفه لسجل اليوم في قاعدة البيانات
    @objc func consumePendingWater(_ call: CAPPluginCall) {
        let defaults = UserDefaults(suiteName: appGroup)
        let pending = defaults?.integer(forKey: "pendingMl") ?? 0
        defaults?.set(0, forKey: "pendingMl")
        call.resolve(["pendingMl": pending])
    }
}
