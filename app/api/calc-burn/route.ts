import { NextRequest } from 'next/server'
import { aiChat, extractJson } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { exercise, weight, language } = await req.json()
    const lang = (language as string) === 'en' ? 'en' : 'ar'

    if (!exercise?.trim()) {
      return Response.json({ error: 'Missing exercise' }, { status: 400 })
    }

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

    const content = await aiChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 100, temperature: 0.1 }
    )

    if (!content) {
      return Response.json({ error: 'AI unavailable' }, { status: 500 })
    }

    const result = extractJson(content)
    if (!result) {
      return Response.json({ error: 'Bad AI response' }, { status: 500 })
    }

    return Response.json(result)
  } catch (err) {
    console.error('[calc-burn] error:', err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
