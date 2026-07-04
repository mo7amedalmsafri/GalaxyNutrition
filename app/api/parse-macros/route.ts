import { NextRequest } from 'next/server'
import { aiChat, extractJson } from '@/lib/ai'

interface NutritionTargets {
  water: number      // liters/day
  calories: number   // kcal/day
  protein: number    // g/day
  carbs: number      // g/day
  fat: number        // g/day
}

export async function POST(req: NextRequest) {
  try {
    const { planText, language, targets } = await req.json()
    const lang = (language as string) === 'en' ? 'en' : 'ar'
    const t = targets as NutritionTargets | undefined

    // ── Examples ──────────────────────────────────────────────────────────────
    const exampleAr = `{
  "calories": ${t?.calories ?? 2000},
  "meals": [
    { "name": "إفطار",  "protein": 30, "carbs": 60, "fat": 15, "water": 500 },
    { "name": "غداء",   "protein": 40, "carbs": 80, "fat": 20, "water": 750 },
    { "name": "عشاء",   "protein": 35, "carbs": 70, "fat": 18, "water": 750 },
    { "name": "سناك",   "protein": 15, "carbs": 40, "fat":  7, "water": 500 }
  ]
}`
    const exampleEn = `{
  "calories": ${t?.calories ?? 2000},
  "meals": [
    { "name": "Breakfast", "protein": 30, "carbs": 60, "fat": 15, "water": 500 },
    { "name": "Lunch",     "protein": 40, "carbs": 80, "fat": 20, "water": 750 },
    { "name": "Dinner",    "protein": 35, "carbs": 70, "fat": 18, "water": 750 },
    { "name": "Snack",     "protein": 15, "carbs": 40, "fat":  7, "water": 500 }
  ]
}`

    // ── Targets instruction block ─────────────────────────────────────────────
    const targetsBlockAr = t
      ? `\n\nالأهداف اليومية الشخصية للمستخدم (وزّعها على الوجبات بدقة — المجاميع يجب أن تساوي هذه الأرقام بالضبط):
• السعرات الإجمالية: ${t.calories} سعرة
• البروتين الإجمالي: ${t.protein} جرام
• الكربوهيدرات الإجمالية: ${t.carbs} جرام
• الدهون الإجمالية: ${t.fat} جرام
• الماء الإجمالي: ${Math.round(t.water * 1000)} مل (${t.water} لتر)`
      : ''

    const targetsBlockEn = t
      ? `\n\nUser's personal daily targets (distribute these across meals — totals must match exactly):
• Total calories: ${t.calories} kcal
• Total protein: ${t.protein}g
• Total carbs: ${t.carbs}g
• Total fat: ${t.fat}g
• Total water: ${Math.round(t.water * 1000)}ml (${t.water}L)`
      : ''

    // ── Prompt ────────────────────────────────────────────────────────────────
    const prompt = lang === 'ar'
      ? `من خطة التغذية التالية، استخرج وزّع المغذيات على الوجبات اليومية.${targetsBlockAr}

أعطني JSON فقط بدون أي نص إضافي، بهذا الشكل بالضبط:
${exampleAr}

قواعد مهمة:
- الماء بالمليلتر، البروتين والكارب والدهون بالجرام
- ${t ? `مجموع كل عمود يجب أن يساوي بالضبط: بروتين=${t.protein}g، كارب=${t.carbs}g، دهون=${t.fat}g، ماء=${Math.round(t.water * 1000)}ml` : 'استخدم الأرقام الواردة في الخطة'}
- وزّع بنسب منطقية: إفطار ~25%، غداء ~35%، عشاء ~30%، سناك ~10%
- لا تُضف أي نص خارج الـ JSON

خطة التغذية:
${planText}`
      : `From the following nutrition plan, extract and distribute macros across daily meals.${targetsBlockEn}

Return JSON only with no extra text, exactly in this format:
${exampleEn}

Important rules:
- Water in ml, protein/carbs/fat in grams
- ${t ? `Column totals must equal exactly: protein=${t.protein}g, carbs=${t.carbs}g, fat=${t.fat}g, water=${Math.round(t.water * 1000)}ml` : 'Use numbers from the plan'}
- Distribute logically: Breakfast ~25%, Lunch ~35%, Dinner ~30%, Snack ~10%
- No text outside the JSON

Nutrition plan:
${planText}`

    // ── Call AI (free-first chain, non-streaming) ─────────────────────────────
    const content = await aiChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 600, temperature: 0.1 }
    )

    if (!content) {
      return Response.json({ error: 'AI unavailable' }, { status: 500 })
    }

    const macros = extractJson(content)
    if (!macros) {
      return Response.json({ error: 'Parse failed' }, { status: 500 })
    }

    // ── If targets provided, override calories field with user's value ─────────
    if (t && macros) {
      macros.calories = t.calories
    }

    return Response.json(macros)
  } catch (err) {
    console.error('[parse-macros] error:', err)
    return Response.json({ error: 'Parse failed' }, { status: 500 })
  }
}
