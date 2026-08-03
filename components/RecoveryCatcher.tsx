'use client'

/* يلتقط استعادة كلمة المرور أينما هبط رابطها — بالحدث لا بقراءة الرابط.
 *
 * الدرس الذي كلّف خمس محاولات: الجلسة تصل في hash الرابط، ومكتبة Supabase
 * تلتقطها وتمسح الـhash فور إنشاء أول عميل — فأي كود يحاول «قراءة الرابط»
 * يتسابق مع المكتبة وقد يجد الـhash ممسوحًا قبله. القراءة سباق يُخسر.
 *
 * الحدث ليس سباقًا: مع العميل الموحّد (singleton في lib/supabase/client.ts)
 * تُطلق المكتبة PASSWORD_RECOVERY على النسخة ذاتها التي نسمع عليها هنا، في
 * أي صفحة كان الهبوط — الرئيسية، الدخول، لا يهم. نحوّل عندها إلى صفحة كلمة
 * المرور الجديدة، والجلسة قائمة أصلًا فلا نحتاج حمل أي شيء معنا.
 *
 * قراءة الـhash تبقى كخط أول (إن سبقناها فهي أسرع)، والراية المحفوظة لحظة
 * الطلب كخط أخير لمن هبط بلا أي أثر في الرابط. ثلاثة خطوط لنفس الهدف. */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RecoveryCatcher() {
  const router = useRouter()
  const pathname = usePathname()

  /* الخط الأول والأهم: حدث المكتبة نفسها */
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !window.location.pathname.startsWith('/reset-password')) {
        router.replace('/reset-password')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (pathname.startsWith('/reset-password')) return

    /* الخط الثاني: الـhash إن وصلنا إليه قبل المكتبة */
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      /* replace لا push: الرابط مستهلَك، ولا يصح أن يعيده زر الرجوع */
      router.replace(`/reset-password${hash}`)
      return
    }

    /* الخط الأخير: راية حُفظت لحظة طلب الاستعادة — لهبوط بلا أي أثر في
       الرابط (حين يستبدل Supabase وجهتنا بصفحته الافتراضية). تنتهي بعد
       ثلاثين دقيقة كي لا تخطف دخولًا عاديًا لاحقًا، وتُمسح فور استعمالها. */
    let flag: string | null = null
    try { flag = localStorage.getItem('dietak-recovery') } catch { return }
    if (!flag) return

    const fresh = Date.now() - Number(flag) < 30 * 60 * 1000
    try { localStorage.removeItem('dietak-recovery') } catch { /* ignore */ }
    if (fresh) router.replace('/reset-password')
  }, [pathname, router])

  return null
}
