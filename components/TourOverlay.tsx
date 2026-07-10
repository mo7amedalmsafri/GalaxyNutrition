'use client'

import { useEffect, useState } from 'react'

export interface TourStep {
  selector: string   // data-tour attribute selector
  title: string
  body: string
}

/**
 * جولة تعريفية: تُبرز عنصراً تلو الآخر بتلميح وسهم، مع «التالي» و«تخطّي».
 * العناوين/النصوص تُمرَّر مترجمة من الأب.
 */
export default function TourOverlay({ steps, lang, onClose }: {
  steps: TourStep[]
  lang: 'ar' | 'en'
  onClose: () => void
}) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    let cancelled = false
    const step = steps[i]
    if (!step) return
    const el = document.querySelector(step.selector) as HTMLElement | null
    if (!el) { setRect(null); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const to = setTimeout(() => { if (!cancelled) setRect(el.getBoundingClientRect()) }, 340)
    return () => { cancelled = true; clearTimeout(to) }
  }, [i, steps])

  const step = steps[i]
  if (!step) return null

  const pad = 8
  const hl = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const below = rect ? rect.bottom + 190 < vh : true
  const ttStyle = rect
    ? (below ? { top: rect.bottom + pad + 12 } : { bottom: vh - rect.top + pad + 12 })
    : { top: '40%' as const }

  const isLast = i >= steps.length - 1

  return (
    <div className="fixed inset-0 z-[200]" style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}>
      {/* backdrop يلتقط اللمس (يمنع التفاعل مع التطبيق أثناء الجولة) */}
      <div className="fixed inset-0" style={{ background: hl ? 'transparent' : 'rgba(0,0,0,0.8)' }} />

      {/* spotlight حول العنصر */}
      {hl && (
        <div style={{
          position: 'fixed', top: hl.top, left: hl.left, width: hl.width, height: hl.height,
          borderRadius: 16, boxShadow: '0 0 0 9999px rgba(0,0,0,0.8)', border: '2px solid #97E325',
          transition: 'all 0.3s ease', pointerEvents: 'none',
        }} />
      )}

      {/* tooltip */}
      <div className="fixed left-1/2 -translate-x-1/2 w-[90%] max-w-sm rounded-2xl p-4"
        style={{ ...ttStyle, background: 'linear-gradient(180deg,#1a0533,#12042a)', border: '1px solid rgba(151,227,37,0.4)', boxShadow: '0 14px 55px rgba(0,0,0,0.6)' }}>
        <p className="font-black text-white text-base mb-1">{step.title}</p>
        <p className="text-white/65 text-sm leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <button onClick={onClose} className="text-xs text-white/45 font-semibold px-2 py-1">
            {lang === 'en' ? 'Skip' : 'تخطّي'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">{i + 1}/{steps.length}</span>
            <button onClick={() => (isLast ? onClose() : setI(i + 1))} className="btn-galaxy px-5 py-2 text-sm">
              {isLast ? (lang === 'en' ? 'Done' : 'تم') : (lang === 'en' ? 'Next' : 'التالي')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
