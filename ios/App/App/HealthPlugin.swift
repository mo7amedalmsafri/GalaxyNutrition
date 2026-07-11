import Foundation
import Capacitor
import HealthKit

/**
 * جسر Apple Health: يقرأ السعرات المحروقة (النشاط) من تطبيق الصحة —
 * تصل إليها بيانات Apple Watch وWhoop وغيرها تلقائياً.
 */
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "DietakHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTodayBurned", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let burned = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: nil, read: [burned]) { granted, _ in
            call.resolve(["granted": granted])
        }
    }

    /// مجموع سعرات النشاط المحروقة لليوم (بداية اليوم UTC لمطابقة يوم التطبيق)
    @objc func getTodayBurned(_ call: CAPPluginCall) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else {
            call.resolve(["kcal": 0])
            return
        }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC") ?? .current
        let start = cal.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
            let kcal = result?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
            DispatchQueue.main.async {
                call.resolve(["kcal": Int(kcal.rounded())])
            }
        }
        store.execute(query)
    }
}
