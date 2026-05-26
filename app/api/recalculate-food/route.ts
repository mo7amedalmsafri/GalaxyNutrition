import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { foodName, estimatedWeight } = await req.json()

    if (!foodName) {
      return NextResponse.json({ error: 'اسم الطعام مطلوب' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح API غير متوفر' }, { status: 500 })
    }

    const weight = estimatedWeight || 100

    const prompt = `أنت خبير تغذية متخصص. احسب القيم الغذائية الدقيقة لـ "${foodName}" بوزن ${weight} جرام.

أعطني النتيجة بهذا التنسيق بالضبط (JSON فقط، لا نص إضافي):
{
  "nameAr": "اسم الطعام بالعربية",
  "name": "food name in English",
  "nutrition": {
    "calories": 200,
    "protein": 15,
    "carbs": 25,
    "fiber": 3,
    "sugars": 5,
    "fat": 8,
    "saturatedFat": 2,
    "unsaturatedFat": 6,
    "sodium": 300,
    "potassium": 400
  }
}

القيم الغذائية يجب أن تكون للكمية الكاملة (${weight} جرام) وليس لكل 100 جرام.
استخدم قواعد بيانات التغذية الموثوقة (USDA وما شابهها).`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://galaxy-nutrition.app',
        'X-Title': 'Galaxy Nutrition App',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return NextResponse.json({ error: 'فشل حساب القيم الغذائية' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'لم يتم الحصول على نتيجة' }, { status: 500 })
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'تنسيق الاستجابة غير صحيح' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      nameAr: parsed.nameAr || foodName,
      name: parsed.name || foodName,
      nutrition: parsed.nutrition,
    })
  } catch (error) {
    console.error('recalculate-food error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
