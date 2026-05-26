import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { exercise, weight, language } = await req.json()
    const lang = (language as string) === 'en' ? 'en' : 'ar'

    if (!exercise?.trim()) {
      return Response.json({ error: 'Missing exercise' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return Response.json({ error: 'API key missing' }, { status: 500 })

    const weightNote = weight
      ? (lang === 'ar' ? `وزن الشخص: ${weight} كجم.` : `Person weight: ${weight}kg.`)
      : ''

    const prompt = lang === 'ar'
      ? `أنت خبير لياقة بدنية. احسب السعرات المحروقة من هذا التمرين.
${weightNote}
التمرين: "${exercise}"

أجب بـ JSON فقط بهذا الشكل بالضبط:
{"name": "اسم التمرين بالعربي", "minutes": 10, "calories": 95}

قواعد:
- استخرج نوع التمرين والمدة بالدقائق من النص
- احسب بناءً على قيم MET الموثوقة (وزن افتراضي 75 كجم إن لم يُذكر)
- إذا لم تُذكر المدة، افترض 30 دقيقة
- أعطِ رقماً واقعياً — لا مبالغة ولا تقليل`
      : `You are a fitness expert. Calculate calories burned from this exercise.
${weightNote}
Exercise: "${exercise}"

Reply with JSON only in exactly this format:
{"name": "exercise name", "minutes": 10, "calories": 95}

Rules:
- Extract exercise type and duration (in minutes) from the text
- Calculate based on reliable MET values (default weight 75kg)
- If no duration mentioned, assume 30 minutes
- Give realistic numbers — no exaggeration`

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://galaxynutrition.app',
        'X-Title':       'GalaxyNutrition',
      },
      body: JSON.stringify({
        model:           'openai/gpt-4o-mini',
        stream:          false,
        max_tokens:      80,
        response_format: { type: 'json_object' },
        messages:        [{ role: 'user', content: prompt }],
      }),
    })

    if (!upstream.ok) {
      return Response.json({ error: `AI error ${upstream.status}` }, { status: 500 })
    }

    const data    = await upstream.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    const result  = JSON.parse(content)

    return Response.json(result)
  } catch (err) {
    console.error('[calc-burn] error:', err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
