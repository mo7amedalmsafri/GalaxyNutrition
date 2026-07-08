import { NextRequest } from 'next/server'
import { aiChat } from '@/lib/ai'

export const maxDuration = 60

interface NutritionTargets {
  water: number      // liters/day
  calories: number   // kcal/day
  protein: number    // g/day
  carbs: number      // g/day
  fat: number        // g/day
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { goal, gender, activity, diet, age, weight, height, language, targets } = body
    const lang = (language as string) === 'en' ? 'en' : 'ar'
    const t = targets as NutritionTargets | undefined

    if (!goal || !age || !weight) {
      return new Response(
        JSON.stringify({ error: lang === 'ar' ? 'بيانات ناقصة' : 'Missing data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── Label helpers ─────────────────────────────────────────────────────────
    const genderLabel = lang === 'ar'
      ? (gender === 'female' ? 'أنثى' : 'ذكر')
      : (gender === 'female' ? 'Female' : 'Male')

    // ── Diet type descriptions for AI ────────────────────────────────────────
    const dietMap: Record<string, { ar: string; en: string }> = {
      balanced: {
        ar: 'متوازن (30% بروتين، 40% كارب، 30% دهون صحية — مناسب لجميع الأهداف)',
        en: 'Balanced (~30% protein, ~40% carbs, ~30% healthy fats — suitable for all goals)',
      },
      keto: {
        ar: 'كيتو (70-75% دهون، 20-25% بروتين، 5% كارب فقط، أقل من 50g كارب/يوم لتحقيق الكيتوسيس — تجنب الحبوب والسكريات والنشويات تماماً)',
        en: 'Keto (70-75% fat, 20-25% protein, only 5% carbs (<50g/day) to achieve ketosis — avoid all grains, sugars, and starches)',
      },
      mediterranean: {
        ar: 'متوسطي (خضروات وفيرة، زيت زيتون، أسماك وبروتين خفيف، بقوليات، حبوب كاملة معتدلة، دهون صحية غير مشبعة — صحي للقلب)',
        en: 'Mediterranean (abundant vegetables, olive oil, fish & lean protein, legumes, moderate whole grains, unsaturated healthy fats — heart-healthy)',
      },
      intermittent: {
        ar: 'صيام متقطع 16:8 (جميع الوجبات في نافذة 8 ساعات فقط مثلاً 12pm-8pm — لا وجبة إفطار صباحي، ابدأ بوجبة الغداء، وزّع الكميات على غداء + عشاء + سناك فقط)',
        en: 'Intermittent Fasting 16:8 (all meals within an 8-hour window e.g. 12pm–8pm — no morning breakfast, start with lunch, distribute meals as: lunch + dinner + snack only)',
      },
      lowcarb: {
        ar: 'كارب منخفض (أقل من 100g كارب/يوم، تركيز على البروتين العالي والدهون الصحية، تجنب السكريات والنشويات المكررة)',
        en: 'Low Carb (under 100g carbs/day, focus on high protein and healthy fats, avoid refined sugars and starches)',
      },
    }
    // If diet is a known preset use its full description; otherwise pass the raw string
    // and let the AI interpret it (user may have typed "عد السعرات", "paleo", etc.)
    const dietLabel = lang === 'ar'
      ? (dietMap[diet]?.ar ?? diet)
      : (dietMap[diet]?.en ?? diet)
    const isCustomDiet = !dietMap[diet]

    // ── System prompt ────────────────────────────────────────────────────────
    const systemPrompt = lang === 'ar'
      ? `أنت أخصائي تغذية. مهمتك إخراج ملخص ماكرو دقيق فقط — بدون ذكر أي أطعمة أو وصفات.
${isCustomDiet ? `النظام الغذائي المختار: ${dietLabel} — خذه بعين الاعتبار عند توزيع الماكروز.` : ''}

الإخراج المطلوب بالترتيب (لا تضف أي شيء خارجه):

1. سطر واحد للأهداف اليومية:
💧 ${t ? t.water : '—'}ل  🔥 ${t ? t.calories : '—'} سعرة  💪 ${t ? t.protein : '—'}غ بروتين  🌾 ${t ? t.carbs : '—'}غ كارب  🥑 ${t ? t.fat : '—'}غ دهون

2. جدول توزيع الوجبات (بهذا التنسيق الحرفي بالضبط):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 توزيع الوجبات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌅 الفطور
   💪 بروتين: __غ  |  🌾 كارب: __غ  |  🥑 دهون: __غ  |  🔥 __ سعرة

☀️ الغداء
   💪 بروتين: __غ  |  🌾 كارب: __غ  |  🥑 دهون: __غ  |  🔥 __ سعرة

🌙 العشاء
   💪 بروتين: __غ  |  🌾 كارب: __غ  |  🥑 دهون: __غ  |  🔥 __ سعرة

[أضف سناك فقط إذا السعرات > 1600 والنظام ليس صياماً متقطعاً]
🍎 سناك
   💪 بروتين: __غ  |  🌾 كارب: __غ  |  🥑 دهون: __غ  |  🔥 __ سعرة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 المجموع: بروتين ${t ? t.protein : '__'}غ | كارب ${t ? t.carbs : '__'}غ | دهون ${t ? t.fat : '__'}غ | 🔥 ${t ? t.calories : '__'} سعرة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. نصيحتان مختصرتان (سطر واحد لكل نصيحة).

قواعد صارمة:
- استبدل __ بأرقام حقيقية تجمع بالضبط على الأهداف
- لا تذكر أسماء أطعمة أو وصفات أو مكونات إطلاقاً
- لا تكتب جملاً طويلة — فقط الجدول والنصيحتان
- توزيع: فطور ~28%، غداء ~38%، عشاء ~27%، سناك ~7% إن وُجد`
      : `You are a nutritionist. Output ONLY a concise macro summary — no food names, no recipes, no ingredient lists.
${isCustomDiet ? `Diet type: ${dietLabel} — factor it into the macro distribution.` : ''}

Required output in order (nothing else):

1. One line with daily targets:
💧 ${t ? t.water : '—'}L  🔥 ${t ? t.calories : '—'} kcal  💪 ${t ? t.protein : '—'}g protein  🌾 ${t ? t.carbs : '—'}g carbs  🥑 ${t ? t.fat : '—'}g fat

2. Meal breakdown table (exact format):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Meal Breakdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌅 Breakfast
   💪 Protein: __g  |  🌾 Carbs: __g  |  🥑 Fat: __g  |  🔥 __ kcal

☀️ Lunch
   💪 Protein: __g  |  🌾 Carbs: __g  |  🥑 Fat: __g  |  🔥 __ kcal

🌙 Dinner
   💪 Protein: __g  |  🌾 Carbs: __g  |  🥑 Fat: __g  |  🔥 __ kcal

[Add Snack ONLY if calories > 1600 and diet is not intermittent fasting]
🍎 Snack
   💪 Protein: __g  |  🌾 Carbs: __g  |  🥑 Fat: __g  |  🔥 __ kcal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total: Protein ${t ? t.protein : '__'}g | Carbs ${t ? t.carbs : '__'}g | Fat ${t ? t.fat : '__'}g | 🔥 ${t ? t.calories : '__'} kcal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. Two short tips (one line each).

Strict rules:
- Replace __ with real numbers that add up exactly to the targets
- Do NOT mention any food names, recipes, or ingredients
- No long sentences — only the table and two tips
- Split: Breakfast ~28%, Lunch ~38%, Dinner ~27%, Snack ~7% if included`

    const activityMap: Record<string, { ar: string; en: string }> = {
      sedentary:  { ar: 'خامل (لا رياضة)',        en: 'Sedentary (no exercise)'  },
      light:      { ar: 'خفيف (1-3 أيام/أسبوع)',  en: 'Light (1-3 days/week)'    },
      moderate:   { ar: 'معتدل (3-5 أيام/أسبوع)', en: 'Moderate (3-5 days/week)' },
      active:     { ar: 'نشيط (6-7 أيام/أسبوع)',  en: 'Active (6-7 days/week)'   },
      veryActive: { ar: 'مكثف (رياضة شديدة)',       en: 'Very Active (intense)'    },
    }
    const activityLabel = lang === 'ar'
      ? (activityMap[activity]?.ar ?? activity)
      : (activityMap[activity]?.en ?? activity)

    const goalMap: Record<string, { ar: string; en: string }> = {
      'weight-loss':    { ar: 'تخفيف الوزن',         en: 'Weight Loss'     },
      'muscle-gain':    { ar: 'بناء الكتلة العضلية', en: 'Muscle Gain'     },
      'maintain':       { ar: 'الحفاظ على الوزن',    en: 'Maintain Weight' },
      'general-health': { ar: 'صحة عامة',             en: 'General Health'  },
    }
    const goalLabel = lang === 'ar'
      ? (goalMap[goal]?.ar ?? goal)
      : (goalMap[goal]?.en ?? goal)

    // ── User prompt ───────────────────────────────────────────────────────────
    const targetsBlockAr = t
      ? `\n\n🎯 أهدافي اليومية الشخصية (التزم بها بالضبط):\n💧 ماء: ${t.water} لتر\n🔥 سعرات: ${t.calories} سعرة\n💪 بروتين: ${t.protein} جرام\n🌾 كربوهيدرات: ${t.carbs} جرام\n🥑 دهون: ${t.fat} جرام`
      : ''

    const targetsBlockEn = t
      ? `\n\n🎯 My personal daily targets (use these exactly):\n💧 Water: ${t.water}L\n🔥 Calories: ${t.calories} kcal\n💪 Protein: ${t.protein}g\n🌾 Carbs: ${t.carbs}g\n🥑 Fat: ${t.fat}g`
      : ''

    const userPrompt = lang === 'ar'
      ? `الجنس: ${genderLabel}\nالعمر: ${age} سنة\nالوزن: ${weight} كجم\nالطول: ${height} سم\nمستوى النشاط: ${activityLabel}\nالهدف: ${goalLabel}\nنوع النظام الغذائي: ${dietLabel}${targetsBlockAr}\n\nاكتب خطة تغذية يومية شاملة ومفصلة لهذا الشخص باللغة العربية، مع شرح مبادئ النظام الغذائي المختار.`
      : `Gender: ${genderLabel}\nAge: ${age} years\nWeight: ${weight} kg\nHeight: ${height} cm\nActivity Level: ${activityLabel}\nGoal: ${goalLabel}\nDiet Type: ${dietLabel}${targetsBlockEn}\n\nWrite a comprehensive detailed daily nutrition plan for this person, explaining the chosen diet type principles.`

    // ── Call AI (non-streaming: streaming is unreliable inside the iOS
    //    WKWebView, so we return the full plan in one JSON response) ───────────
    const plan = await aiChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      { maxTokens: 2000 }
    )

    if (!plan || !plan.trim()) {
      console.error('[generate-plan] all AI providers failed')
      return new Response(
        JSON.stringify({ error: lang === 'ar' ? 'الذكاء الاصطناعي غير متاح حالياً، حاول بعد قليل' : 'AI temporarily unavailable, try again shortly' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ plan }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' } }
    )
  } catch (err) {
    console.error('[generate-plan] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
