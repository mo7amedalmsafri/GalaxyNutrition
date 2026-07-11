import Foundation
import Capacitor
import WidgetKit

/**
 * جسر ماء الويدجت: يزامن ماء اليوم بين التطبيق والويدجت عبر App Group.
 * الويدجت يملك القيمة عند وجود تعديلات غير مُزامنة (widgetDirty)،
 * والتطبيق يكتب القيمة المرجعية (من Supabase) عند فتحه.
 */
@objc(WaterWidgetPlugin)
public class WaterWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WaterWidgetPlugin"
    public let jsName = "WaterWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWater", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetState", returnType: CAPPluginReturnPromise)
    ]

    private let appGroup = "group.com.dietak.app"

    /// التطبيق يكتب القيمة المرجعية لليوم — يصفّر إشارة التعديل ومكدّس التراجع
    @objc func setWater(_ call: CAPPluginCall) {
        let waterMl = call.getInt("waterMl") ?? 0
        let targetMl = call.getInt("targetMl") ?? 2500
        let date = call.getString("date") ?? ""

        if let d = UserDefaults(suiteName: appGroup) {
            d.set(waterMl, forKey: "waterMl")
            d.set(targetMl, forKey: "waterTargetMl")
            d.set(date, forKey: "waterDate")
            d.set(false, forKey: "widgetDirty")
            d.set([Int](), forKey: "waterStack")
            d.set(false, forKey: "clearArmed")
        }
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
        call.resolve(["ok": true])
    }

    /// يُعيد حالة الويدجت للتطبيق: هل فيه تعديل غير مُزامن، وقيمة الماء وتاريخها.
    /// إن كان dirty، التطبيق يعتمد waterMl كقيمة اليوم ويكتبها في Supabase.
    @objc func getWidgetState(_ call: CAPPluginCall) {
        let d = UserDefaults(suiteName: appGroup)
        let dirty = d?.bool(forKey: "widgetDirty") ?? false
        let waterMl = d?.integer(forKey: "waterMl") ?? 0
        let date = d?.string(forKey: "waterDate") ?? ""
        call.resolve(["dirty": dirty, "waterMl": waterMl, "date": date])
    }
}
