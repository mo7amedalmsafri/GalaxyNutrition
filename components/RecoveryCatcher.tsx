'use client'

/* يلتقط رابط استعادة كلمة المرور أينما هبط.
 *
 * لماذا يلزم هذا رغم وجود حارس في proxy.ts: نوعا روابط Supabase مختلفان في
 * مكان حمل الجلسة. النوع الحديث يضعها في `?code=` — وهذه يراها الخادم
 * فيعالجها الحارس. أما النوع الآخر فيضعها في **الـhash** (`#access_token=…`)،
 * والمتصفح لا يرسل الـhash إلى الخادم إطلاقًا. فمهما فعل الحارس، لا يرى شيئًا،
 * ويرتد المستخدم إلى /login ويُطلب منه ما نسيه بالضبط.
 *
 * هذا المكوّن يقرأ الـhash في المتصفح — المكان الوحيد الذي يظهر فيه — ويحوّل
 * إلى صفحة كلمة المرور الجديدة مع الحفاظ عليه كاملًا، فتجد المكتبة جلستها
 * هناك كما لو أن الرابط قصدها من البداية.
 *
 * لا يعمل إلا على رابط استعادة صريح (type=recovery)، فلا يمس أي تدفّق آخر. */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function RecoveryCatcher() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/reset-password')) return

    /* المسار الأول: الجلسة في الـhash */
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      /* replace لا push: الرابط مستهلَك، ولا يصح أن يعيده زر الرجوع */
      router.replace(`/reset-password${hash}`)
      return
    }

    /* المسار الثاني: الرابط لم يقل شيئًا عن نوعه.
       حين يتجاهل Supabase وجهتنا ويستبدلها بصفحته الافتراضية، يصل المستخدم
       إلى الرئيسية وقد سُجّل دخوله فعلًا — ولا شيء في الرابط يشي بأن هذه كانت
       استعادة كلمة مرور. الراية المحفوظة لحظة طلب الاستعادة هي الشاهد الوحيد
       الباقي، فنقرأها هنا ونكمل ما بدأه المستخدم.
       تنتهي بعد ثلاثين دقيقة حتى لا تخطف راية منسيّة دخولًا عاديًا لاحقًا،
       وتُمسح فور استعمالها. */
    let flag: string | null = null
    try { flag = localStorage.getItem('dietak-recovery') } catch { return }
    if (!flag) return

    const fresh = Date.now() - Number(flag) < 30 * 60 * 1000
    try { localStorage.removeItem('dietak-recovery') } catch { /* ignore */ }
    if (fresh) router.replace('/reset-password')
  }, [pathname, router])

  return null
}
