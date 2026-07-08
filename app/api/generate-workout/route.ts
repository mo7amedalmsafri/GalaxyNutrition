import { NextRequest } from 'next/server'
import { aiChat } from '@/lib/ai'

export const maxDuration = 60

// أسماء الرياضات بالعربية/الإنجليزية
const SPORTS: Record<string, { ar: string; en: string }> = {
  weights:      { ar: 'رفع أثقال', en: 'Weightlifting' },
  cardio:       { ar: 'كارديو',   en: 'Cardio' },
  running:      { ar: 'جري',      en: 'Running' },
  swimming:     { ar: 'سباحة',    en: 'Swimming' },
  boxing:       { ar: 'ملاكمة',   en: 'Boxing' },
  cycling:      { ar: 'دراجة',    en: 'Cycling' },
  hiit:         { ar: 'هيت HIIT', en: 'HIIT' },
  calisthenics: { ar: 'وزن الجسم', en: 'Calisthenics' },
  jumprope:     { ar: 'نط الحبل', en: 'Jump Rope' },
  yoga:         { ar: 'يوغا وإطالة', en: 'Yoga & Stretching' },
}

const GOALS: Record<string, { ar: string; en: string }> = {
  fatloss:   { ar: 'حرق الدهون وإنقاص الوزن', en: 'Fat loss & weight reduction' },
  muscle:    { ar: 'بناء العضلات والقوة',      en: 'Muscle building & strength' },
  endurance: { ar: 'اللياقة والتحمّل',          en: 'Fitness & endurance' },
  general:   { ar: 'صحة عامة',                   en: 'General health' },
}

const LEVELS: Record<string, { ar: string; en: string }> = {
  beginner:     { ar: 'مبتدئ',   en: 'Beginner' },
  intermediate: { ar: 'متوسط',   en: 'Intermediate' },
  advanced:     { ar: 'متقدّم',   en: 'Advanced' },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lang = body.language === 'en' ? 'en' : 'ar'

    // الرياضات: قد تكون معرّفات معروفة أو أسماء حرّة يكتبها المستخدم. قائمة فارغة = يختار الذكاء
    const sportsRaw: string[] = Array.isArray(body.sports)
      ? body.sports.map((s: unknown) => String(s ?? '').trim()).filter(Boolean).slice(0, 12)
      : []
    const days = Math.min(Math.max(parseInt(body.days) || 3, 1), 7)
    const minutes = Math.min(Math.max(parseInt(body.minutes) || 45, 10), 480)
    const goal = GOALS[body.goal] ? body.goal : 'general'
    const level = LEVELS[body.level] ? body.level : 'beginner'
    const period = body.period === 'month' ? 'month' : 'week'
    const targetKg = Number(body.targetKg) > 0 ? Number(body.targetKg) : null
    const gender = body.gender === 'female' ? 'female' : 'male'
    const age = parseInt(body.age) || 25
    const weight = parseInt(body.weight) || 75

    const L = (o: { ar: string; en: string }) => (lang === 'ar' ? o.ar : o.en)
    // اسم معروف → ترجمته، وإلا نمرّر النص كما كتبه المستخدم
    const sportsLabel = sportsRaw.map(s => (SPORTS[s] ? L(SPORTS[s]) : s)).join(lang === 'ar' ? '، ' : ', ')

    const systemPrompt = lang === 'ar'
      ? `أنت مدرّب لياقة ومدرّب قوة محترف. صمّم برنامج تدريب أسبوعياً متكاملاً واقعياً وآمناً، مبنياً على الرياضات التي اختارها المتدرّب وعدد الأيام ومستواه وهدفه.

قواعد التصميم:
- إذا لم يحدّد المتدرّب رياضات، اختر أنسب الرياضات لهدفه ومستواه.
- إذا كتب رياضة غير مألوفة أو غير شائعة، أدرِجها كما هي بتمارين وتدريبات مناسبة لها من معرفتك.
- اذكر لكل رياضة تقدير السعرات المحروقة في الساعة حسب شدّتها (خفيفة/متوسطة/عالية).
- وزّع التدريب على عدد الأيام المطلوب بالضبط، وأضِف أيام راحة واضحة لبقية الأسبوع.
- لرفع الأثقال: استخدم تقسيماً مناسباً لعدد الأيام واذكر اسمه (٣ أيام: Push / Pull / Legs — ٤ أيام: Upper / Lower — ٥ أيام: تقسيم Arnold أو عضلة/يوم — ٢ يوم: Full Body). لكل يوم: ٥–٧ تمارين مع عدد المجموعات × التكرارات ووقت الراحة.
- للسباحة: قسّم الحصة إلى إحماء + تمارين تكنيك (Drills) + المجموعة الرئيسية بمسافات وفترات راحة + تهدئة، واذكر المسافات بالأمتار.
- للملاكمة: جولات (ظل، كيس، تنطيط حبل، تكييف) مع مدة كل جولة والراحة.
- للكارديو/الجري/الدراجة/HIIT: حدّد النوع (ثابت أو فتري)، الشدة، المدة أو الفترات.
- اذكر لكل يوم تقديراً للسعرات المحروقة.
- راعِ الهدف: حرق الدهون = كثافة أعلى وكارديو أكثر ودوائر؛ بناء العضل = تضخيم وأوزان أثقل وراحة أطول.

التنسيق (التزم به حرفياً لتجنّب تشابك النص، وسطر فارغ بين الأقسام):

━━━━━━━━━━━━━━━━━━━━━━
🏋️ برنامج التدريب الأسبوعي
🎯 الهدف: ... | 📅 ... أيام | ⏱️ ... دقيقة/حصة
━━━━━━━━━━━━━━━━━━━━━━

📌 اليوم الأول — [اسم التقسيم/الرياضة]
• تمرين — مجموعات × تكرارات (أو مدة/مسافة)
• ...
🔥 حرق تقريبي: ... سعرة

(كرّر لكل يوم تدريب، ثم اذكر أيام الراحة)

━━━━━━━━━━━━━━━━━━━━━━
💡 نصائح
• 3 نصائح قصيرة (إحماء، تدرّج، ترطيب/تغذية)
━━━━━━━━━━━━━━━━━━━━━━

لا تكتب مقدمات طويلة — ابدأ بالجدول مباشرة.`
      : `You are a professional fitness and strength coach. Design a complete, realistic and safe weekly training program based on the trainee's chosen sports, number of days, level and goal.

Rules:
- If the trainee didn't specify any sports, pick the most suitable ones for their goal and level.
- If they wrote an unfamiliar or uncommon sport, include it as-is with appropriate exercises/drills from your knowledge.
- For each sport, note the approximate calories burned per hour based on intensity (light/moderate/high).
- Spread training across exactly the requested number of days, and mark clear rest days for the remaining week.
- Weightlifting: use a split suited to the day count and name it (3 days: Push / Pull / Legs — 4 days: Upper / Lower — 5 days: Arnold split or one-muscle/day — 2 days: Full Body). Each day: 5–7 exercises with sets × reps and rest time.
- Swimming: split each session into warmup + technique drills + main set with distances and rest intervals + cooldown; give distances in meters.
- Boxing: rounds (shadow, bag, jump rope, conditioning) with round duration and rest.
- Cardio/Running/Cycling/HIIT: specify type (steady or intervals), intensity, duration or intervals.
- Give an estimated calorie burn for each day.
- Respect the goal: fat loss = higher intensity, more cardio and circuits; muscle = hypertrophy, heavier weights, longer rest.

Format (follow literally to avoid overlapping text, blank line between sections):

━━━━━━━━━━━━━━━━━━━━━━
🏋️ Weekly Training Program
🎯 Goal: ... | 📅 ... days | ⏱️ ... min/session
━━━━━━━━━━━━━━━━━━━━━━

📌 Day 1 — [split/sport name]
• Exercise — sets × reps (or duration/distance)
• ...
🔥 Approx burn: ... kcal

(repeat for each training day, then list rest days)

━━━━━━━━━━━━━━━━━━━━━━
💡 Tips
• 3 short tips (warmup, progression, hydration/nutrition)
━━━━━━━━━━━━━━━━━━━━━━

No long intro — start with the table directly.`

    const targetLine = targetKg
      ? (lang === 'ar'
          ? `\nيريد إنقاص حوالي ${targetKg} كجم — اجعل البرنامج يخدم هذا الهدف مع نصيحة عن الوقت الواقعي المتوقع.`
          : `\nWants to lose about ${targetKg} kg — orient the program toward this with a note on a realistic timeframe.`)
      : ''

    const monthLine = period === 'month'
      ? (lang === 'ar'
          ? `\nالمطلوب برنامج شهري: اعرض الأسبوع النموذجي ثم اذكر كيف يتدرّج على مدى ٤ أسابيع (زيادة الأوزان/المسافات/الشدة تدريجياً).`
          : `\nMonthly program requested: show the template week, then describe how it progresses across 4 weeks (gradually increasing weights/distance/intensity).`)
      : ''

    const sportsLineAr = sportsLabel ? `الرياضات المختارة: ${sportsLabel}.` : 'الرياضات: لم يحدّد — اختر أنسب الرياضات لهدفه.'
    const sportsLineEn = sportsLabel ? `Chosen sports: ${sportsLabel}.` : 'Sports: not specified — choose the most suitable ones for the goal.'

    const userPrompt = lang === 'ar'
      ? `المتدرّب: ${gender === 'female' ? 'أنثى' : 'ذكر'}، ${age} سنة، ${weight} كجم، المستوى: ${L(LEVELS[level])}.
${sportsLineAr}
عدد أيام التدريب: ${days} أيام/أسبوع.
مدة الحصة: ${minutes} دقيقة.
الهدف: ${L(GOALS[goal])}.${targetLine}${monthLine}

صمّم البرنامج المتكامل الآن.`
      : `Trainee: ${gender === 'female' ? 'Female' : 'Male'}, ${age} yrs, ${weight} kg, level: ${L(LEVELS[level])}.
${sportsLineEn}
Training days: ${days} days/week.
Session length: ${minutes} minutes.
Goal: ${L(GOALS[goal])}.${targetLine}${monthLine}

Design the complete program now.`

    const plan = await aiChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // مهلة أطول لكل مزوّد — التوليد الطويل يحتاج وقتاً حتى لا يفشل
      { maxTokens: 2600, timeoutMs: 45000 }
    )

    if (!plan || !plan.trim()) {
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
    console.error('[generate-workout] error:', err)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
