/* تحقّق روابط الإيميل — على الخادم بالكامل، وهذا آخر إصلاح في قصة الاستعادة.
 *
 * القياس الذي فرض هذا التصميم: الرابط القائم على الـhash نجح كاملًا في متصفح
 * سطح المكتب (مُشي آليًا حتى الدخول بكلمة المرور الجديدة) وفشل على آيفون
 * المالك بنفس الدقيقة — لأن حامل الجلسة كان جزء الرابط المخفي (#…)، والجزء
 * المخفي ملك المتصفح وحده: لا يصل الخادم قط، وبعض متصفحات الجوال (نافذة
 * Gmail الداخلية، وSafari عبر سلاسل التحويل) تسقطه في الطريق. كل تدفّق يعتمد
 * عليه سيعمل عند البعض ويفشل عند البعض، ولا شيء نكتبه يغيّر ذلك.
 *
 * هنا لا شيء مخفي: الرابط يحمل token_hash عاديًا في الاستعلام، يصل الخادم
 * كاملًا في كل متصفح على وجه الأرض، والخادم يبادله بجلسة (verifyOtp) ويكتبها
 * كوكيز ثم يحوّل إلى صفحة كلمة المرور الجديدة وهي جاهزة. المتصفح لم يُطلب
 * منه إلا أن يتبع التحويلات — وهذا ما لا يفشل فيه متصفح. */

import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') ?? 'recovery') as EmailOtpType
  /* الاستعادة تذهب لنموذج كلمة المرور؛ أي تحقق آخر (تأكيد تسجيل) للرئيسية */
  const next = searchParams.get('next') ?? (type === 'recovery' ? '/reset-password' : '/')

  if (token_hash) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  /* رابط منتهٍ أو مستهلَك: نقولها صراحة بدل صفحة دخول صامتة تطلب المنسي */
  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
