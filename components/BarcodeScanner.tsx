'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'
import { useT } from '@/lib/store'

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
}

/**
 * ماسح باركود يعمل داخل المتصفح وغلاف الآيفون:
 *  - يحاول المسح المباشر من الكاميرا (ZXing + getUserMedia)
 *  - إن رُفض الإذن أو تعذّر، يظهر بديل «صوّر الباركود» (يفكّ من صورة ثابتة)
 */
export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const t = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // نحتفظ بأدوات ZXing للتنظيف عند الإغلاق
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const readerRef = useRef<{ decodeFromImageUrl?: (u: string) => Promise<{ getText(): string }> } | null>(null)

  const [status, setStatus] = useState<'starting' | 'scanning' | 'fallback' | 'decoding'>('starting')
  const [error, setError] = useState('')
  const doneRef = useRef(false)

  const finish = (code: string) => {
    if (doneRef.current) return
    doneRef.current = true
    controlsRef.current?.stop()
    onDetected(code)
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader as unknown as typeof readerRef.current

        // المسح المباشر من الكاميرا الخلفية
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result) finish(result.getText())
          }
        )
        if (cancelled) { controls.stop(); return }
        controlsRef.current = controls
        setStatus('scanning')
      } catch (e) {
        // الكاميرا الحيّة غير متاحة (إذن مرفوض/غير مدعوم) → البديل بالتصوير
        console.error('[barcode] live camera failed:', e)
        if (!cancelled) setStatus('fallback')
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [])

  // فكّ الباركود من صورة ملتقطة (البديل)
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setStatus('decoding')
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const url = URL.createObjectURL(file)
      try {
        const result = await reader.decodeFromImageUrl(url)
        finish(result.getText())
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch {
      setStatus('fallback')
      setError(t('لم أتمكّن من قراءة الباركود — قرّب الكاميرا وثبّتها وحاول مرة أخرى',
                 'Could not read the barcode — get closer, hold steady and try again'))
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col" style={{ background: 'rgba(0,0,0,0.92)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
          <X size={22} color="#fff" />
        </button>
        <h2 className="text-base font-bold text-white">{t('مسح الباركود', 'Scan Barcode')}</h2>
        <div className="w-9" />
      </div>

      {/* Live camera view */}
      {status !== 'fallback' && (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {/* Scan frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-2xl"
              style={{
                width: '78%',
                height: 150,
                border: '3px solid #97E325',
                boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
              }}
            />
          </div>
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} color="#97E325" className="animate-spin" />
              <p className="text-white/80 text-sm">{t('جارٍ تشغيل الكاميرا...', 'Starting camera...')}</p>
            </div>
          )}
          {status === 'scanning' && (
            <p className="absolute bottom-8 left-0 right-0 text-center text-white/85 text-sm px-6">
              {t('وجّه الكاميرا نحو باركود المنتج', 'Point the camera at the product barcode')}
            </p>
          )}
        </div>
      )}

      {/* Photo fallback */}
      {status === 'fallback' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <Camera size={46} color="#97E325" />
          <p className="text-white/85 text-sm leading-relaxed">
            {t('صوّر باركود المنتج بوضوح وسنقرأه لك',
               'Take a clear photo of the product barcode and we\'ll read it')}
          </p>
          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-galaxy px-6 py-3 text-sm flex items-center gap-2"
          >
            <Camera size={18} /> {t('صوّر الباركود', 'Photograph barcode')}
          </button>
        </div>
      )}

      {status === 'decoding' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <Loader2 size={28} color="#97E325" className="animate-spin" />
          <p className="text-white/80 text-sm">{t('جارٍ قراءة الباركود...', 'Reading barcode...')}</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhoto}
        className="hidden"
      />
    </div>
  )
}
