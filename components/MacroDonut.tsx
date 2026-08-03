'use client'

/* بطاقة الماكروز — حلقة تكشف تركيب الطبق بلمحة.
 *
 * الرقم وحده («٣٢٠ سعرة») لا يقول للمستخدم شيئًا عن طبقه: هل هو نشويات
 * صافية أم فيه بروتين؟ الحلقة تجيب قبل أن يقرأ رقمًا واحدًا — والحصص محسوبة
 * بالسعرات لا بالجرامات، لأن جرام الدهون ٩ سعرات وجرام البروتين ٤، فقسمة
 * الجرامات ترسم حلقة كاذبة تُظهر الدهون أصغر بكثير من حقيقتها في الطبق.
 *
 * SVG خالص بلا أي مكتبة رسم: يعمل في أي متصفح وداخل WKWebView، ولا يضيف
 * كيلوبايت واحدًا لحجم التطبيق. */

const CARB_KCAL = 4, PROT_KCAL = 4, FAT_KCAL = 9

export type Macros = { protein: number; carbs: number; fat: number; calories?: number }

export const MACRO_COLORS = {
  carbs:   '#97E325',
  protein: '#06b6d4',
  fat:     '#FF5F1F',
} as const

export function MacroDonut({ macros, size = 120, labels }: {
  macros: Macros
  size?: number
  /* نصّ مترجم من الصفحة المضيفة — هذا المكوّن لا يعرف اللغة */
  labels: { protein: string; carbs: string; fat: string; kcal: string }
}) {
  const g = {
    carbs:   Math.max(0, macros.carbs   || 0),
    protein: Math.max(0, macros.protein || 0),
    fat:     Math.max(0, macros.fat     || 0),
  }
  /* السعرات من كل ماكرو — هذه ما ترسمه الحلقة */
  const kcal = {
    carbs:   g.carbs   * CARB_KCAL,
    protein: g.protein * PROT_KCAL,
    fat:     g.fat     * FAT_KCAL,
  }
  const total = kcal.carbs + kcal.protein + kcal.fat

  const R = 42, C = 2 * Math.PI * R
  const parts = (['carbs', 'protein', 'fat'] as const).map(k => ({
    key: k,
    grams: Math.round(g[k]),
    pct: total > 0 ? kcal[k] / total : 0,
  }))

  /* الحلقة تُرسم قطعة تلو الأخرى بإزاحة تراكمية */
  let offset = 0
  const arcs = parts.map(p => {
    const arc = { ...p, dash: p.pct * C, gap: C - p.pct * C, rot: offset }
    offset += p.pct * 360
    return arc
  })

  const shown = Math.round(macros.calories ?? total)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
          {/* المسار الفارغ — يمنع الحلقة من الاختفاء حين لا توجد بيانات */}
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="11"
            stroke="rgba(255,255,255,0.07)" />
          {total > 0 && arcs.map(a => (
            <circle key={a.key} cx="50" cy="50" r={R} fill="none" strokeWidth="11"
              stroke={MACRO_COLORS[a.key]} strokeLinecap="butt"
              strokeDasharray={`${a.dash} ${a.gap}`}
              /* -90 يبدأ القوس من أعلى الدائرة بدل يمينها */
              transform={`rotate(${a.rot - 90} 50 50)`} />
          ))}
        </svg>
        {/* السعرات في القلب — المعلومة التي يبحث عنها أولاً */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-black leading-none text-white" style={{ fontSize: size * 0.22 }}>
            {shown}
          </span>
          <span className="text-white/40 leading-none mt-1" style={{ fontSize: size * 0.1 }}>
            {labels.kcal}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        {arcs.map(a => (
          <div key={a.key} className="flex flex-col items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: MACRO_COLORS[a.key] }} />
            <span className="text-xs font-bold text-white">{a.grams}<span className="text-white/40 font-normal">g</span></span>
            <span className="text-[10px] text-white/40">{labels[a.key]}</span>
            <span className="text-[10px] font-semibold" style={{ color: MACRO_COLORS[a.key] }}>
              {Math.round(a.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
