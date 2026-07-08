import { NextRequest, NextResponse } from 'next/server'
import { aiChat, extractJson } from '@/lib/ai'

// نمنح الدالة وقتاً كافياً على Vercel حتى لا تُقطع قبل رد الذكاء الاصطناعي
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { foodName, estimatedWeight, language = 'ar' } = await req.json()

    if (!foodName) {
      return NextResponse.json({ error: 'اسم الطعام مطلوب' }, { status: 400 })
    }

    const isAr = language === 'ar'
    const hasExplicitWeight = typeof estimatedWeight === 'number' && estimatedWeight > 0

    const prompt = isAr
      ? `أنت خبير تغذية دقيق. حلّل هذا الطعام واحسب قيمه الغذائية: "${foodName}"

قواعد مهمة جداً:
- افهم الكمية من النص نفسه. "ملعقة عسل" = ملعقة كبيرة واحدة (~21 جرام) وليس 100 جرام. "كوب أرز" = ~200 جرام. "3 تمرات" = ~24 جرام. "ملعقتين" = ملعقتان.
- إذا لم تُذكر كمية لمكوّن، افترض حصة منزلية معقولة (مثال: شوفان بلا كمية = 40 جرام حصة).
- إذا كان الطعام مزيجاً (مثل "شوفان + ملعقة عسل") فاحسب كل مكوّن بمقداره الفعلي ثم اجمعهما — لا تحسب المزيج كله على 100 جرام.
${hasExplicitWeight ? `- المستخدم حدد وزناً ${estimatedWeight} جرام، فاحسب على هذا الوزن.` : '- قدّر الوزن الإجمالي الفعلي للكمية الموصوفة بالجرام.'}

أعطني النتيجة بهذا التنسيق بالضبط (JSON فقط):
{
  "nameAr": "اسم الطعام بالعربية",
  "name": "food name in English",
  "totalGrams": 61,
  "nutrition": {
    "calories": 200, "protein": 15, "carbs": 25, "fiber": 3, "sugars": 5,
    "fat": 8, "saturatedFat": 2, "unsaturatedFat": 6, "sodium": 300, "potassium": 400
  }
}

مهم: "totalGrams" = الوزن الإجمالي الفعلي بالجرام للكمية الموصوفة. و "nutrition" = القيم لكل 100 جرام من هذا الطعام. استخدم USDA.`

      : `You are a precise nutrition expert. Analyze this food and calculate its nutrition: "${foodName}"

Very important rules:
- Understand the quantity from the text itself. "a spoon of honey" = 1 tablespoon (~21g), NOT 100g. "a cup of rice" = ~200g. "3 dates" = ~24g. "two spoons" = 2 tablespoons.
- If no quantity is given for an item, assume a reasonable home serving (e.g. oats with no amount = 40g serving).
- If it's a mix (like "oats + a spoon of honey"), calculate each item at its real amount then sum them — do NOT treat the whole mix as 100g.
${hasExplicitWeight ? `- The user set a weight of ${estimatedWeight}g, calculate for that weight.` : '- Estimate the real total weight of the described amount in grams.'}

Return exactly this format (JSON only):
{
  "nameAr": "${foodName}",
  "name": "food name in English",
  "totalGrams": 61,
  "nutrition": {
    "calories": 200, "protein": 15, "carbs": 25, "fiber": 3, "sugars": 5,
    "fat": 8, "saturatedFat": 2, "unsaturatedFat": 6, "sodium": 300, "potassium": 400
  }
}

Important: "totalGrams" = the real total weight in grams of the described amount. "nutrition" = values PER 100g of this food. Use USDA.`

    const content = await aiChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 500, temperature: 0.1, timeoutMs: 12000 }
    )

    if (!content) {
      return NextResponse.json({ error: 'فشل حساب القيم الغذائية' }, { status: 500 })
    }

    const parsed = extractJson(content)
    if (!parsed) {
      return NextResponse.json({ error: 'تنسيق الاستجابة غير صحيح' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      nameAr: parsed.nameAr || foodName,
      name: parsed.name || foodName,
      // الوزن الفعلي للكمية الموصوفة (ملعقة، كوب…) — التطبيق يضبط الكمية عليه
      totalGrams: (typeof parsed.totalGrams === 'number' && parsed.totalGrams > 0)
        ? Math.round(parsed.totalGrams)
        : (hasExplicitWeight ? estimatedWeight : 100),
      nutrition: parsed.nutrition,
    })
  } catch (error) {
    console.error('recalculate-food error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
