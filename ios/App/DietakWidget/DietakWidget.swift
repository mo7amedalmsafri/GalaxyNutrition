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

// يضمن أن العدّاد يخصّ اليوم الحالي (يصفّره مع اليوم الجديد)
private func ensureToday(_ d: UserDefaults?) {
    let today = utcToday()
    if (d?.string(forKey: "waterDate") ?? "") != today {
        d?.set(today, forKey: "waterDate")
        d?.set(0, forKey: "waterMl")
        d?.set([Int](), forKey: "waterStack")
        d?.set(false, forKey: "clearArmed")
    }
}

// ── إضافة ماء — تنفّذ مباشرة من زر الويدجت بدون فتح التطبيق ──
struct AddWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "إضافة ماء"
    @Parameter(title: "Amount (ml)") var amount: Int
    init() { self.amount = 250 }
    init(amount: Int) { self.amount = amount }

    func perform() async throws -> some IntentResult {
        let d = UserDefaults(suiteName: appGroup)
        ensureToday(d)
        let water = min((d?.integer(forKey: "waterMl") ?? 0) + amount, 6000)
        d?.set(water, forKey: "waterMl")
        var stack = (d?.array(forKey: "waterStack") as? [Int]) ?? []
        stack.append(amount)
        d?.set(stack, forKey: "waterStack")
        d?.set(false, forKey: "clearArmed")     // أي إضافة تلغي وضع تأكيد المسح
        d?.set(true, forKey: "widgetDirty")      // إشارة للتطبيق ليزامن عند الفتح
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// ── تراجع عن آخر إضافة ──
struct UndoWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "تراجع"
    func perform() async throws -> some IntentResult {
        let d = UserDefaults(suiteName: appGroup)
        ensureToday(d)
        var stack = (d?.array(forKey: "waterStack") as? [Int]) ?? []
        if let last = stack.popLast() {
            let water = max((d?.integer(forKey: "waterMl") ?? 0) - last, 0)
            d?.set(water, forKey: "waterMl")
            d?.set(stack, forKey: "waterStack")
            d?.set(true, forKey: "widgetDirty")
        }
        d?.set(false, forKey: "clearArmed")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// ── تسليح المسح (الضغطة الأولى) ──
struct ArmClearIntent: AppIntent {
    static var title: LocalizedStringResource = "مسح"
    func perform() async throws -> some IntentResult {
        let d = UserDefaults(suiteName: appGroup)
        let armed = d?.bool(forKey: "clearArmed") ?? false
        d?.set(!armed, forKey: "clearArmed")     // تبديل: ضغطة ثانية على نفسه تلغي
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// ── تأكيد المسح (الضغطة الثانية) — يصفّر ماء اليوم ──
struct ConfirmClearIntent: AppIntent {
    static var title: LocalizedStringResource = "تأكيد المسح"
    func perform() async throws -> some IntentResult {
        let d = UserDefaults(suiteName: appGroup)
        ensureToday(d)
        d?.set(0, forKey: "waterMl")
        d?.set([Int](), forKey: "waterStack")
        d?.set(false, forKey: "clearArmed")
        d?.set(true, forKey: "widgetDirty")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct WaterEntry: TimelineEntry {
    let date: Date
    let waterMl: Int
    let targetMl: Int
    let clearArmed: Bool
    let canUndo: Bool
}

func loadWaterEntry() -> WaterEntry {
    let d = UserDefaults(suiteName: appGroup)
    let today = utcToday()
    let sameDay = (d?.string(forKey: "waterDate") ?? "") == today
    let water = sameDay ? (d?.integer(forKey: "waterMl") ?? 0) : 0
    let targetRaw = d?.integer(forKey: "waterTargetMl") ?? 0
    let stack = (d?.array(forKey: "waterStack") as? [Int]) ?? []
    return WaterEntry(
        date: Date(),
        waterMl: water,
        targetMl: targetRaw > 0 ? targetRaw : 2500,
        clearArmed: sameDay && (d?.bool(forKey: "clearArmed") ?? false),
        canUndo: sameDay && !stack.isEmpty
    )
}

struct WaterProvider: TimelineProvider {
    func placeholder(in context: Context) -> WaterEntry {
        WaterEntry(date: Date(), waterMl: 1250, targetMl: 2500, clearArmed: false, canUndo: true)
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
private let red  = Color(red: 0.94, green: 0.27, blue: 0.27)

struct ProgressRing: View {
    let progress: Double
    let percentFont: CGFloat
    var body: some View {
        ZStack {
            Circle().stroke(blue.opacity(0.18), lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(LinearGradient(colors: [blue, cyan], startPoint: .top, endPoint: .bottom),
                        style: StrokeStyle(lineWidth: 8, lineCap: .round))
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
    private var label: String {
        amount >= 1000 ? "+\(String(format: "%.1f", Double(amount) / 1000))L" : "+\(amount)"
    }
    var body: some View {
        Button(intent: AddWaterIntent(amount: amount)) {
            Text(label)
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Capsule().fill(cyan))
                .lineLimit(1).minimumScaleFactor(0.7)
        }
        .buttonStyle(.plain)
    }
}

// صف التراجع + المسح (مع حالة تأكيد)
struct ActionRow: View {
    let clearArmed: Bool
    let canUndo: Bool
    var body: some View {
        HStack(spacing: 6) {
            // تراجع
            Button(intent: UndoWaterIntent()) {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.uturn.backward").font(.system(size: 10, weight: .bold))
                    Text("تراجع").font(.system(size: 10, weight: .bold))
                }
                .foregroundColor(canUndo ? .white : .white.opacity(0.25))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 5)
                .background(Capsule().fill(Color.white.opacity(canUndo ? 0.12 : 0.05)))
            }
            .buttonStyle(.plain)
            .disabled(!canUndo)

            // مسح — ضغطتان (تسليح ثم تأكيد)
            if clearArmed {
                Button(intent: ConfirmClearIntent()) { clearLabel(true) }.buttonStyle(.plain)
            } else {
                Button(intent: ArmClearIntent()) { clearLabel(false) }.buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func clearLabel(_ armed: Bool) -> some View {
        HStack(spacing: 3) {
            Image(systemName: armed ? "checkmark" : "trash").font(.system(size: 10, weight: .bold))
            Text(armed ? "تأكيد" : "مسح").font(.system(size: 10, weight: .bold))
        }
        .foregroundColor(armed ? .white : red)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 5)
        .background(Capsule().fill(armed ? red : red.opacity(0.14)))
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

    var small: some View {
        VStack(spacing: 5) {
            ProgressRing(progress: progress, percentFont: 13).frame(maxHeight: .infinity)
            Text("\(entry.waterMl) / \(entry.targetMl) مل")
                .font(.system(size: 9, weight: .semibold, design: .rounded))
                .foregroundColor(.white.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.7)
            AddButton(amount: 250)
            ActionRow(clearArmed: entry.clearArmed, canUndo: entry.canUndo)
        }
        .padding(4)
    }

    var medium: some View {
        HStack(spacing: 12) {
            VStack(spacing: 4) {
                ProgressRing(progress: progress, percentFont: 16)
                Text("\(entry.waterMl) / \(entry.targetMl) مل")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.7)
            }
            VStack(spacing: 6) {
                HStack(spacing: 6) { AddButton(amount: 250); AddButton(amount: 330) }
                HStack(spacing: 6) { AddButton(amount: 500); AddButton(amount: 1500) }
                ActionRow(clearArmed: entry.clearArmed, canUndo: entry.canUndo)
            }
            .frame(width: 150)
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
        .description("تابع وأضف واحذف شرب الماء من الشاشة الرئيسية")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct DietakWidgetBundle: WidgetBundle {
    var body: some Widget {
        DietakWaterWidget()
    }
}
