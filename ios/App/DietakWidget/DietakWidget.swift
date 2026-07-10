import WidgetKit
import SwiftUI

// مخزن مشترك بين التطبيق والويدجت (App Group)
private let appGroup = "group.com.dietak.app"

struct WaterEntry: TimelineEntry {
    let date: Date
    let waterMl: Int
    let targetMl: Int
}

// يقرأ ماء اليوم من المخزن المشترك — يتصفّر تلقائياً مع اليوم الجديد
// (نستخدم يوم UTC ليطابق منطق اليوم في تطبيق الويب)
func loadWaterEntry() -> WaterEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone(identifier: "UTC")
    let today = formatter.string(from: Date())
    let savedDay = defaults?.string(forKey: "waterDate") ?? ""
    let water = (savedDay == today) ? (defaults?.integer(forKey: "waterMl") ?? 0) : 0
    let targetRaw = defaults?.integer(forKey: "waterTargetMl") ?? 0
    return WaterEntry(date: Date(), waterMl: water, targetMl: targetRaw > 0 ? targetRaw : 2500)
}

struct WaterProvider: TimelineProvider {
    func placeholder(in context: Context) -> WaterEntry {
        WaterEntry(date: Date(), waterMl: 1250, targetMl: 2500)
    }
    func getSnapshot(in context: Context, completion: @escaping (WaterEntry) -> Void) {
        completion(loadWaterEntry())
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WaterEntry>) -> Void) {
        // تحديث كل ساعة (والتطبيق يحدّث فوراً عند كل تسجيل ماء)
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [loadWaterEntry()], policy: .after(next)))
    }
}

struct WaterWidgetView: View {
    var entry: WaterEntry

    private var progress: Double {
        guard entry.targetMl > 0 else { return 0 }
        return min(Double(entry.waterMl) / Double(entry.targetMl), 1.0)
    }

    private let cyan = Color(red: 0.0, green: 0.83, blue: 1.0)
    private let blue = Color(red: 0.23, green: 0.51, blue: 0.96)

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .stroke(blue.opacity(0.18), lineWidth: 9)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        LinearGradient(colors: [blue, cyan], startPoint: .top, endPoint: .bottom),
                        style: StrokeStyle(lineWidth: 9, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 1) {
                    Image(systemName: "drop.fill")
                        .foregroundColor(cyan)
                        .font(.system(size: 15))
                    Text("\(Int(progress * 100))%")
                        .font(.system(size: 15, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                }
            }
            .padding(3)
            Text("\(entry.waterMl) / \(entry.targetMl) مل")
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundColor(.white.opacity(0.72))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(10)
        .widgetBackground(Color(red: 0.04, green: 0.0, blue: 0.08))
    }
}

// خلفية متوافقة مع iOS 17+ (containerBackground) وما قبله
extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) { color }
        } else {
            background(color)
        }
    }
}

struct DietakWaterWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DietakWaterWidget", provider: WaterProvider()) { entry in
            WaterWidgetView(entry: entry)
        }
        .configurationDisplayName("ماء اليوم")
        .description("تقدّم شرب الماء اليومي من دايتك")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct DietakWidgetBundle: WidgetBundle {
    var body: some Widget {
        DietakWaterWidget()
    }
}
