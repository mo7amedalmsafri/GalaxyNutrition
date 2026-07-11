'use client'

import { X, UtensilsCrossed } from 'lucide-react'
import WatchAdButton from './WatchAdButton'
import { grantMealFromAd } from '@/lib/limits'
import { useT } from '@/lib/store'

/**
 * نافذة تظهر عند تجاوز حد الوجبات المجانية (وجبتان/يوم للمجانيين).
 * تعرض تحذيراً + زر مشاهدة إعلان لفتح وجبة إضافية، أو رابط الاشتراك.
 * onGranted يُستدعى بعد اكتمال الإعلان لإتمام إضافة الوجبة المعلّقة.
 */
export default function MealLimitModal({
  open, onClose, onGranted,
}: {
  open: boolean
  onClose: () => void
  onGranted: () => void
}) {
  const t = useT()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-5 animate-slide-up"
        style={{ background: '#140022', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)' }}>
            <UtensilsCrossed size={22} color="#f59e0b" />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={16} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        <h3 className="text-white font-bold text-base mb-1">
          {t('انتهت وجباتك المجانية اليوم', "You've used today's free meals")}
        </h3>
        <p className="text-white/50 text-sm leading-relaxed mb-4">
          {t('تحصل على وجبتين مجاناً كل يوم. شاهد إعلاناً قصيراً لإضافة وجبة أخرى، أو اشترك Pro لوجبات غير محدودة.',
             'You get 2 free meals daily. Watch a short ad to add another meal, or subscribe to Pro for unlimited meals.')}
        </p>

        {/* مشاهدة إعلان → وجبة إضافية (يظهر داخل التطبيق فقط) */}
        <WatchAdButton
          scheme="green"
          reloadAfter={false}
          label={t('شاهد إعلاناً وأضف وجبة', 'Watch an ad to add a meal')}
          successLabel={t('تمت إضافة وجبة ✓', 'Meal unlocked ✓')}
          onReward={() => { grantMealFromAd(); onGranted() }}
        />

        <a href="/settings#pro"
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>
          ✨ {t('اشترك Pro — وجبات غير محدودة', 'Subscribe to Pro — unlimited meals')}
        </a>
      </div>
    </div>
  )
}
