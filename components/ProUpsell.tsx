'use client'

import { Sparkles } from 'lucide-react'
import WatchAdButton from './WatchAdButton'
import { grantRewardProHours } from '@/lib/limits'
import { useT } from '@/lib/store'

/** لافتة صغيرة تظهر عند استنفاد الحصة المجانية — توجّه للاشتراك أو مشاهدة إعلان */
export default function ProUpsell({ text }: { text: string }) {
  const t = useT()
  return (
    <div>
      <a
        href="/settings#pro"
        className="mt-2 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.08))',
          border: '1px solid rgba(245,158,11,0.4)',
        }}
      >
        <Sparkles size={16} color="#f59e0b" className="flex-shrink-0" />
        <span className="text-xs font-semibold text-start flex-1" style={{ color: '#f59e0b' }}>{text}</span>
        <span className="text-xs font-black px-2 py-0.5 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>Pro ✨</span>
      </a>
      {/* بديل مجاني: مشاهدة إعلان لساعة Pro (يظهر داخل التطبيق فقط) */}
      <WatchAdButton
        scheme="cyan"
        label={t('شاهد إعلاناً واحصل على ساعة استخدام مجانية', 'Watch an ad for 1 free hour')}
        successLabel={t('تم تفعيل ساعة مجانية ✨', 'Free hour activated ✨')}
        onReward={() => grantRewardProHours(1)}
      />
    </div>
  )
}
