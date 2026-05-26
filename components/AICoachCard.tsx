'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import GlassCard from './GlassCard'
import { useT } from '@/lib/store'

const tips = [
  {
    ar: { title: 'تناول البروتين في كل وجبة', body: 'البروتين يزيد الشبع ويساعد في بناء العضلات. حاول الحصول على 25-30 جرام في كل وجبة رئيسية.' },
    en: { title: 'Protein at every meal', body: 'Protein increases satiety and helps build muscle. Aim for 25–30g of protein per main meal.' },
    icon: '💪', color: '#06b6d4',
  },
  {
    ar: { title: 'الماء قبل الوجبات', body: 'اشرب كوبًا من الماء قبل 20 دقيقة من كل وجبة لتقليل الشهية وتحسين الهضم.' },
    en: { title: 'Water before meals', body: 'Drink a glass of water 20 minutes before each meal to reduce appetite and improve digestion.' },
    icon: '💧', color: '#3b82f6',
  },
  {
    ar: { title: 'الألياف أساس الصحة', body: 'احرص على تناول 25-35 جرامًا من الألياف يوميًا. الخضروات والبقوليات مصادر رائعة.' },
    en: { title: 'Fiber is the foundation of health', body: 'Aim for 25–35g of fiber daily. Vegetables and legumes are excellent sources.' },
    icon: '🥦', color: '#10b981',
  },
  {
    ar: { title: 'نوم جيد = وزن أفضل', body: 'قلة النوم ترفع هرمون الجوع وتخفض هرمون الشبع. احرص على 7-9 ساعات يوميًا.' },
    en: { title: 'Good sleep = better weight', body: 'Poor sleep raises ghrelin and lowers leptin. Aim for 7–9 hours each night.' },
    icon: '🌙', color: '#8b5cf6',
  },
  {
    ar: { title: 'وجبة الإفطار لا تُفوَّت', body: 'الإفطار يُنشّط الأيض ويمنع الإفراط في تناول الطعام لاحقًا. ابدأ يومك بشكل صحيح!' },
    en: { title: "Don't skip breakfast", body: 'Breakfast kick-starts your metabolism and prevents overeating later. Start your day right!' },
    icon: '🌅', color: '#f59e0b',
  },
]

interface AICoachCardProps {
  consumedCalories?: number
  targetCalories?: number
  proteinProgress?: number
}

export default function AICoachCard({
  consumedCalories = 0,
  targetCalories = 2000,
  proteinProgress = 0,
}: AICoachCardProps) {
  const t = useT()
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % tips.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const tip = tips[tipIndex]

  // Dynamic advice based on data
  let dynamicAdvice = ''
  const pct = (consumedCalories / targetCalories) * 100
  if (pct > 95)
    dynamicAdvice = t('⚠️ لقد اقتربت من هدفك اليومي، تجنب الوجبات الثقيلة الآن.', '⚠️ You are close to your daily goal, avoid heavy meals now.')
  else if (pct < 30 && new Date().getHours() > 14)
    dynamicAdvice = t('🍽️ استهلاكك منخفض اليوم، تأكد من تناول وجبة متوازنة.', '🍽️ Your intake is low today, make sure to have a balanced meal.')
  else if (proteinProgress < 40)
    dynamicAdvice = t('🥩 مستوى البروتين منخفض! أضف مصدرًا بروتينيًا لوجبتك القادمة.', '🥩 Low protein! Add a protein source to your next meal.')

  return (
    <GlassCard glow="purple" className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}
        >
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">{t('نصائح الذكاء الاصطناعي', 'AI Coach Tips')}</h3>
          <p className="text-white/40 text-xs">{t('نصائح مخصصة لك يومياً', 'Personalized tips daily')}</p>
        </div>
      </div>

      {/* Dynamic alert if any */}
      {dynamicAdvice && (
        <div
          className="mb-3 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <p className="text-yellow-300 font-medium">{dynamicAdvice}</p>
        </div>
      )}

      {/* Rotating tip */}
      <div
        className="p-4 rounded-xl"
        style={{ background: `${tip.color}10`, border: `1px solid ${tip.color}25` }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{tip.icon}</span>
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: tip.color }}>
              {t(tip.ar.title, tip.en.title)}
            </p>
            <p className="text-white/60 text-xs leading-relaxed">{t(tip.ar.body, tip.en.body)}</p>
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {tips.map((_, i) => (
          <button
            key={i}
            onClick={() => setTipIndex(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === tipIndex ? 16 : 6,
              height: 6,
              background: i === tipIndex
                ? 'linear-gradient(90deg, #6b21a8, #ec4899)'
                : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </GlassCard>
  )
}
