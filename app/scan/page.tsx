'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, CheckCircle, X, Plus, ChevronRight } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import FoodEntryModal from '@/components/FoodEntryModal'
import { DetectedFood, FoodItem } from '@/lib/types'
import { addFoodLog } from '@/lib/db'
import { getTodayDate } from '@/lib/utils'
import { useT } from '@/lib/store'

type ScanState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error'

export default function ScanPage() {
  const t = useT()
  const [state, setState] = useState<ScanState>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[]>([])
  const [mealDescription, setMealDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedFood, setSelectedFood] = useState<DetectedFood | null>(null)
  const [addedFoods, setAddedFoods] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const processImage = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      setImageBase64(base64)
      setState('preview')
    }
    reader.readAsDataURL(file)
  }, [])

  const analyzeImage = async () => {
    if (!imageBase64) return
    setState('analyzing')

    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل التحليل')
      }

      setDetectedFoods(data.detectedFoods || [])
      setMealDescription(data.mealDescription || '')
      setState('results')
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع')
      setState('error')
    }
  }

  const handleAddFood = async (item: Omit<FoodItem, 'id' | 'loggedAt'>, index: number) => {
    await addFoodLog(getTodayDate(), item)
    setAddedFoods(prev => new Set([...prev, index]))
    setSelectedFood(null)
  }

  const reset = () => {
    setState('idle')
    setImageUrl(null)
    setImageBase64(null)
    setDetectedFoods([])
    setAddedFoods(new Set())
    setErrorMsg('')
  }

  return (
    <div className="flex flex-col px-4 pt-6 gap-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-white">
          <span className="text-gradient-galaxy">{t('تحليل', 'Analyze')}</span> {t('الوجبة', 'Meal')}
        </h1>
        <p className="text-white/40 text-sm mt-1">{t('صوّر وجبتك ودع الذكاء الاصطناعي يحللها', 'Snap your meal and let AI analyze it')}</p>
      </div>

      {/* Idle State */}
      {state === 'idle' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          {/* Camera Capture */}
          <GlassCard
            glow="purple"
            className="p-8 flex flex-col items-center gap-5"
            onClick={() => cameraRef.current?.click()}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}
            >
              <Camera size={44} color="white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-white mb-1">{t('صوّر الوجبة', 'Photograph Meal')}</h2>
              <p className="text-white/50 text-sm">{t('افتح الكاميرا والتقط صورة لوجبتك', 'Open the camera and take a photo of your meal')}</p>
            </div>
            <div
              className="px-8 py-3 rounded-2xl font-bold text-white text-base"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}
            >
              📸 {t('فتح الكاميرا', 'Open Camera')}
            </div>
          </GlassCard>

          {/* Or divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs text-white/30">{t('أو', 'or')}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Upload from gallery */}
          <GlassCard
            glow="none"
            className="p-5 flex items-center gap-4"
            onClick={() => fileRef.current?.click()}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.3)' }}
            >
              <Upload size={24} color="#c084fc" />
            </div>
            <div>
              <h3 className="font-bold text-white">{t('رفع من المعرض', 'Upload from Gallery')}</h3>
              <p className="text-white/40 text-sm">{t('اختر صورة من جهازك', 'Choose an image from your device')}</p>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,0.2)" className="mr-auto" />
          </GlassCard>

          {/* AI Features info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🔍', ar: 'تعرف تلقائي',  en: 'Auto Detect'    },
              { icon: '⚡', ar: 'نتائج فورية',  en: 'Instant Results' },
              { icon: '🎯', ar: 'دقة عالية',    en: 'High Accuracy'  },
            ].map(f => (
              <div
                key={f.en}
                className="flex flex-col items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-2xl">{f.icon}</span>
                <span className="text-xs text-white/50 text-center">{t(f.ar, f.en)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview State */}
      {state === 'preview' && imageUrl && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(107,33,168,0.4)' }}>
            <img src={imageUrl} alt="preview" className="w-full object-cover" style={{ maxHeight: 320 }} />
            <button
              onClick={reset}
              className="absolute top-3 left-3 p-2 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X size={18} color="white" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white/60"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              {t('إعادة التصوير', 'Retake')}
            </button>
            <button
              onClick={analyzeImage}
              className="flex-[2] py-3.5 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}
            >
              ✨ {t('تحليل بالذكاء الاصطناعي', 'Analyze with AI')}
            </button>
          </div>
        </div>
      )}

      {/* Analyzing State */}
      {state === 'analyzing' && (
        <div className="flex flex-col items-center gap-6 py-16 animate-fade-in">
          {imageUrl && (
            <div className="relative">
              <img
                src={imageUrl}
                alt="analyzing"
                className="w-48 h-48 object-cover rounded-2xl"
                style={{ filter: 'brightness(0.5)', border: '2px solid rgba(107,33,168,0.6)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center animate-spin-slow"
                  style={{ border: '3px solid transparent', borderTopColor: '#ec4899', borderRightColor: '#6b21a8' }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(10,0,20,0.8)' }}
                  >
                    <Loader2 size={24} color="#c084fc" className="animate-spin" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="text-center">
            <h2 className="text-xl font-black text-white mb-2">{t('جاري التحليل...', 'Analyzing...')}</h2>
            <p className="text-white/50 text-sm">{t('الذكاء الاصطناعي يفحص الأطعمة ويحسب القيم الغذائية', 'AI is identifying food items and calculating nutrition')}</p>
          </div>
          <div className="flex gap-2">
            {(t('تعرف على الأطعمة,حساب السعرات,تحليل المغذيات', 'Detecting food,Counting calories,Analyzing macros')).split(',').map((step, i) => (
              <div
                key={step}
                className="text-xs px-3 py-1.5 rounded-full animate-pulse"
                style={{
                  background: 'rgba(107,33,168,0.2)',
                  color: 'rgba(192,132,252,0.7)',
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results State */}
      {state === 'results' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          {imageUrl && (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imageUrl} alt="meal" className="w-full object-cover" style={{ maxHeight: 200 }} />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(10,0,20,0.9) 0%, transparent 50%)' }}
              />
              <div className="absolute bottom-3 right-4 left-4">
                <p className="text-white font-bold text-lg">{mealDescription}</p>
                <p className="text-white/60 text-sm">{detectedFoods.length} {t('صنف مكتشف', 'items detected')}</p>
              </div>
            </div>
          )}

          {/* Detected foods list */}
          <div className="flex items-center justify-between">
            <h2 className="font-black text-white text-base">{t('الأطعمة المكتشفة', 'Detected Foods')}</h2>
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
            >
              <CheckCircle size={12} className="inline ml-1" />
              {t('تحليل مكتمل', 'Analysis complete')}
            </span>
          </div>

          {detectedFoods.map((food, i) => (
            <GlassCard key={i} glow="none" className="p-4" animate={false}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-sm">{food.nameAr || food.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(107,33,168,0.2)', color: '#c084fc' }}
                    >
                      ~{food.estimatedWeight}جم
                    </span>
                  </div>

                  {/* Mini nutrition grid */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      { label: t('سعرة', 'kcal'),    value: Math.round(food.nutrition.calories),                             color: '#f59e0b' },
                      { label: t('بروتين', 'Protein'),value: `${Math.round(food.nutrition.protein)}${t('جم', 'g')}`,        color: '#06b6d4' },
                      { label: t('كارب', 'Carbs'),   value: `${Math.round(food.nutrition.carbs)}${t('جم', 'g')}`,          color: '#f59e0b' },
                      { label: t('دهن', 'Fat'),      value: `${Math.round(food.nutrition.fat)}${t('جم', 'g')}`,            color: '#ec4899' },
                    ].map(n => (
                      <div key={n.label} className="text-center">
                        <p className="text-sm font-bold" style={{ color: n.color }}>{n.value}</p>
                        <p className="text-xs text-white/40">{n.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${food.confidence * 100}%`,
                          background: food.confidence > 0.8 ? '#10b981' : '#f59e0b',
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/30">
                      {Math.round(food.confidence * 100)}% {t('دقة', 'accuracy')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => addedFoods.has(i) ? null : setSelectedFood(food)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{
                    background: addedFoods.has(i) ? 'rgba(16,185,129,0.2)' : 'rgba(107,33,168,0.4)',
                    color: addedFoods.has(i) ? '#10b981' : '#c084fc',
                    border: `1px solid ${addedFoods.has(i) ? 'rgba(16,185,129,0.3)' : 'rgba(192,132,252,0.3)'}`,
                  }}
                >
                  {addedFoods.has(i) ? <CheckCircle size={14} /> : <Plus size={14} />}
                  {addedFoods.has(i) ? t('مضاف', 'Added') : t('إضافة', 'Add')}
                </button>
              </div>
            </GlassCard>
          ))}

          <button
            onClick={reset}
            className="w-full py-3.5 rounded-2xl font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
          >
            {t('تصوير وجبة أخرى', 'Scan Another Meal')}
          </button>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="flex flex-col items-center gap-5 py-12 animate-fade-in">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <span className="text-4xl">⚠️</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">{t('فشل التحليل', 'Analysis Failed')}</h2>
            <p className="text-white/50 text-sm">{errorMsg}</p>
          </div>
          <button
            onClick={reset}
            className="btn-galaxy px-8 py-3"
          >
            {t('حاول مجدداً', 'Try Again')}
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && processImage(e.target.files[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && processImage(e.target.files[0])}
      />

      {/* Food entry modal for selected food */}
      {selectedFood && (
        <FoodEntryModal
          initialName={selectedFood.nameAr || selectedFood.name}
          initialNutrition={{
            ...selectedFood.nutrition,
          }}
          onSave={(item) => handleAddFood(item, detectedFoods.indexOf(selectedFood))}
          onClose={() => setSelectedFood(null)}
        />
      )}
    </div>
  )
}
