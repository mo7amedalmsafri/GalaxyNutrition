import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', language = 'ar' } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'لم يتم توفير صورة' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح API غير متوفر' }, { status: 500 })
    }

    const isAr = language === 'ar'

    const prompt = isAr
      ? `أنت خبير تغذية متخصص. قم بتحليل الوجبة في هذه الصورة بدقة عالية.

أعطني قائمة بجميع الأطعمة الموجودة في الصورة بالتنسيق التالي بالضبط (JSON فقط، لا نص إضافي):

{
  "foods": [
    {
      "name": "food name in English",
      "nameAr": "اسم الطعام بالعربية",
      "estimatedWeight": 150,
      "confidence": 0.9,
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
  ],
  "totalCalories": 200,
  "mealDescription": "وصف مختصر للوجبة بالعربية"
}

القيم الغذائية يجب أن تكون للكمية المقدرة بالكامل (ليس لكل 100 جرام).
قدّر الوزن بدقة بناءً على حجم الوجبة في الصورة.
استخدم قواعد بيانات التغذية الموثوقة (USDA وما شابهها).`

      : `You are a specialist nutrition expert. Analyze the meal in this image with high accuracy.

Give me a list of all foods in the image in exactly this format (JSON only, no extra text):

{
  "foods": [
    {
      "name": "food name in English",
      "nameAr": "food name in English",
      "estimatedWeight": 150,
      "confidence": 0.9,
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
  ],
  "totalCalories": 200,
  "mealDescription": "brief meal description in English"
}

Nutrition values must be for the total estimated amount (not per 100g).
Estimate weight accurately based on the meal size in the image.
Use reliable nutrition databases (USDA etc).`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://galaxy-nutrition.app',
        'X-Title': 'Galaxy Nutrition App',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return NextResponse.json({ error: 'فشل تحليل الصورة' }, { status: 500 })
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
      detectedFoods: parsed.foods || [],
      totalCalories: parsed.totalCalories || 0,
      mealDescription: parsed.mealDescription || '',
    })
  } catch (error) {
    console.error('analyze-food error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
