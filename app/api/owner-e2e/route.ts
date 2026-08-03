/* أداة اختبار ذاتي لاستعادة كلمة المرور — للمالك فقط.
 *
 * خمس «إصلاحات» نُشرت وطُلب من المستخدم اختبارها، وخمس مرات عاد يقول «نفس
 * المشكلة». السبب المنهجي: لا أحد غيره كان يستطيع رؤية رابط الإيميل الحقيقي،
 * فكان كل إصلاح تخمينًا يُختبر على وقته هو. هذه النقطة تنهي ذلك: تولّد رابط
 * استعادة حقيقيًا لحساب اختبار — بنفس آلية الإيميل تمامًا (admin.generateLink)
 * لكن دون إرسال بريد — فيُفتح الرابط ويُمشى التدفق كاملًا آليًا، ويُرى مكان
 * الكسر بالعين قبل أن يُقال للمستخدم «جرّب».
 *
 * محمية بمفتاح المالك (مقارنة ثابتة الزمن، والخطأ 404) ولا تلمس إلا حساب
 * الاختبار المخصص لها. */

import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { isOwnerKey } from '@/lib/owner'

export const dynamic = 'force-dynamic'

const TEST_EMAIL = 'e2e.recovery.probe@dietak-internal.test'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (!isOwnerKey(searchParams.get('key'))) notFound()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    /* حساب الاختبار — يُنشأ مرة ويُعاد استعماله */
    const seed = `Seed-${Math.random().toString(36).slice(2)}Aa1!`
    const { error: createErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: seed,
      email_confirm: true,
    })
    if (createErr && !/already|exists|registered/i.test(createErr.message)) throw createErr

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: TEST_EMAIL,
    })
    if (error) throw error

    return NextResponse.json({
      ok: true,
      email: TEST_EMAIL,
      /* الرابط الذي كان سيُرسل في الإيميل حرفيًا */
      link: data.properties?.action_link,
      redirect_to: data.properties?.redirect_to,
      verification_type: data.properties?.verification_type,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

/* التحقق النهائي: هل كلمة المرور الجديدة تعمل فعلًا؟ */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (!isOwnerKey(searchParams.get('key'))) notFound()

  const { password } = await request.json().catch(() => ({}))
  if (!password) return NextResponse.json({ ok: false, error: 'no password' }, { status: 400 })

  /* عميل عادي بلا صلاحيات — نفس ما يفعله تطبيق المستخدم عند الدخول */
  const anon = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password })
  return NextResponse.json({
    ok: !error && !!data.session,
    error: error?.message,
  })
}
