import { NextRequest } from 'next/server'
import { aiChat } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { dietName, language } = await req.json()
    const lang = (language as string) === 'en' ? 'en' : 'ar'

    if (!dietName?.trim()) {
      return Response.json({ error: 'Missing diet name' }, { status: 400 })
    }

    const prompt = lang === 'ar'
      ? `أنت خبير تغذية. اشرح باختصار ما هو نظام "${dietName}" الغذائي.
أجب باللغة العربية فقط بهذا الشكل بالضبط (لا تُضف عناوين إضافية):

📌 ما هو: [جملة أو جملتين تشرح المفهوم]
⚙️ كيف يعمل: [الآلية والمبدأ الأساسي]
📊 المغذيات: [النسب التقريبية أو التوزيع المعتاد — بروتين / كارب / دهون]
✅ مناسب لـ: [من يستفيد منه]
⚡ تنبيه: [أهم ملاحظة أو تحذير]

اجعل الرد موجزاً جداً، كل نقطة جملة أو جملتان فقط.`
      : `You are a nutrition expert. Briefly explain the "${dietName}" diet.
Reply in English only in exactly this format (no extra headings):

📌 What it is: [1-2 sentences explaining the concept]
⚙️ How it works: [the core mechanism/principle]
📊 Macros: [typical ratios or distribution — protein / carbs / fat]
✅ Best for: [who benefits from it]
⚡ Note: [most important warning or consideration]

Keep each point to 1-2 sentences only.`

    const content = await aiChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 400 }
    )

    if (!content) {
      return Response.json({ error: 'AI unavailable' }, { status: 500 })
    }

    return Response.json({ info: content.trim() })
  } catch (err) {
    console.error('[diet-info] error:', err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
