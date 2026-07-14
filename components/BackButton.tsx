'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * زر رجوع عائم لصفحات الشروط/الخصوصية — داخل التطبيق (WebView) لا يوجد
 * شريط متصفح، فبدونه يعلق المستخدم في الصفحة. يرجع لسجل التنقل إن وُجد،
 * وإلا يذهب للرئيسية (حالة فتح الرابط مباشرة من متجر التطبيقات).
 */
export default function BackButton() {
  const router = useRouter()
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }
  return (
    <button
      onClick={goBack}
      aria-label="رجوع · Back"
      className="fixed z-50 flex items-center gap-2 px-4 py-2.5 rounded-full active:scale-95 transition-transform"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        insetInlineStart: '16px',
        background: 'rgba(20,15,35,0.75)',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#fff',
      }}
    >
      <ArrowRight size={18} />
      <span className="text-sm font-bold">رجوع</span>
    </button>
  )
}
