import WidgetKit
import SwiftUI
import AppIntents

// مخزن مشترك بين التطبيق والويدجت (App Group)
private let appGroup = "group.com.dietak.app"

private func utcToday() -> String {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.timeZone = TimeZone(identifier: "UTC")
    return fmt.string(from: Date())
}

// ── نيّة إضافة الماء — تنفّذ مباشرة من زر الويدجت بدون فتح التطبيق ──
struct AddWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "إضافة ماء"
    static var description = IntentDescription("يضيف كمية ماء لعدّاد اليوم")

    @Parameter(title: "Amount (ml)")
    var amount: Int

    init() { self.amount = 250 }
    init(amount: Int) { self.amount = amount }

    func perform() async throws -> some IntentResult {
        let d = UserDefaults(suiteName: appGroup)
        let today = utcToday()
        var water = d?.integer(forKey: "waterMl") ?? 0
        // يوم جديد؟ صفّر العدّاد أولاً
        if (d?.string(forKey: "waterDate") ?? "") != today {
            water = 0
            d?.set(today, forKey: "waterDate")
        }
        water = min(water + amount, 6000)
        d?.set(water, forKey: "waterMl")
        // يتراكم للمزامنة مع التطبيق (Supabase) عند فتحه
        let pending = (d?.integer(forKey: "pendingMl") ?? 0) + amount
        d?.set(pending, forKey: "pendingMl")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct WaterEntry: TimelineEntry {
    let date: Date
    let waterMl: Int
    let targetMl: Int
}

func loadWaterEntry() -> WaterEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    let today = utcToday()
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
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [loadWaterEntry()], policy: .after(next)))
    }
}

private let cyan = Color(red: 0.0, green: 0.83, blue: 1.0)
private let blue = Color(red: 0.23, green: 0.51, blue: 0.96)
private let bg   = Color(red: 0.04, green: 0.0, blue: 0.08)

struct ProgressRing: View {
    let progress: Double
    let percentFont: CGFloat
    var body: some View {
        ZStack {
            Circle().stroke(blue.opacity(0.18), lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    LinearGradient(colors: [blue, cyan], startPoint: .top, endPoint: .bottom),
                    style: StrokeStyle(lineWidth: 8, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Image(systemName: "drop.fill").foregroundColor(cyan).font(.system(size: percentFont * 0.8))
                Text("\(Int(progress * 100))%")
                    .font(.system(size: percentFont, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
            }
        }
    }
}

struct AddButton: View {
    let amount: Int
    var body: some View {
        Button(intent: AddWaterIntent(amount: amount)) {
            Text("+\(amount)")
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Capsule().fill(cyan))
        }
        .buttonStyle(.plain)
    }
}

struct WaterWidgetView: View {
    var entry: WaterEntry
    @Environment(\.widgetFamily) var family

    private var progress: Double {
        guard entry.targetMl > 0 else { return 0 }
        return min(Double(entry.waterMl) / Double(entry.targetMl), 1.0)
    }

    var body: some View {
        Group {
            if family == .systemMedium { medium } else { small }
        }
        .containerBackground(for: .widget) { bg }
    }

    // صغير: حلقة + زر واحد سريع (+250)
    var small: some View {
        VStack(spacing: 6) {
            ProgressRing(progress: progress, percentFont: 14)
                .frame(maxHeight: .infinity)
            Text("\(entry.waterMl) / \(entry.targetMl) مل")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundColor(.white.opacity(0.7))
                .lineLimit(1).minimumScaleFactor(0.7)
            AddButton(amount: 250)
        }
        .padding(4)
    }

    // متوسط: حلقة يسار + ثلاثة أزرار يمين
    var medium: some View {
        HStack(spacing: 14) {
            VStack(spacing: 4) {
                ProgressRing(progress: progress, percentFont: 16)
                Text("\(entry.waterMl) / \(entry.targetMl) مل")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            VStack(spacing: 6) {
                AddButton(amount: 150)
                AddButton(amount: 250)
                AddButton(amount: 500)
            }
            .frame(width: 90)
        }
        .padding(6)
    }
}

struct DietakWaterWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DietakWaterWidget", provider: WaterProvider()) { entry in
            WaterWidgetView(entry: entry)
        }
        .configurationDisplayName("ماء اليوم")
        .description("تابع وأضف شرب الماء من الشاشة الرئيسية")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct DietakWidgetBundle: WidgetBundle {
    var body: some Widget {
        DietakWaterWidget()
    }
}
