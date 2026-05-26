'use client'

import { useEffect, useRef } from 'react'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE } from '@/lib/store'

export default function GalaxyBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const isLight = (profile.theme ?? 'dark') === 'light'

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''

    if (isLight) {
      // Light mode: warm floating dust
      for (let i = 0; i < 25; i++) {
        const dot = document.createElement('div')
        const size = Math.random() * 5 + 3
        const opacity = Math.random() * 0.25 + 0.08
        const duration = Math.random() * 8 + 6
        const delay = Math.random() * 8
        dot.className = 'star'
        dot.style.cssText = `
          width:${size}px;height:${size}px;
          left:${Math.random()*100}%;top:${Math.random()*100}%;
          background:rgba(255,200,60,${opacity});
          --duration:${duration}s;--delay:${delay}s;
          box-shadow:0 0 ${size*2}px rgba(255,200,60,${opacity*0.6});
          border-radius:50%;
        `
        container.appendChild(dot)
      }
    } else {
      // Dark mode: energy particles
      const colors = [
        'rgba(151,227,37,0.7)',
        'rgba(0,212,255,0.6)',
        'rgba(255,95,31,0.55)',
        'rgba(255,255,255,0.5)',
      ]
      for (let i = 0; i < 60; i++) {
        const dot = document.createElement('div')
        const size = Math.random() * 2 + 0.5
        const color = colors[Math.floor(Math.random() * colors.length)]
        const duration = Math.random() * 5 + 3
        const delay = Math.random() * 6
        dot.className = 'star'
        dot.style.cssText = `
          width:${size}px;height:${size}px;
          left:${Math.random()*100}%;top:${Math.random()*100}%;
          background:${color};
          --duration:${duration}s;--delay:${delay}s;
          box-shadow:0 0 ${size*3}px ${color};
          border-radius:50%;
        `
        container.appendChild(dot)
      }
    }
  }, [isLight])

  if (isLight) {
    return (
      <>
        <div ref={containerRef} className="stars-container" />
        {/* Sun glow — top right, أهدأ */}
        <div className="fixed pointer-events-none" style={{
          top: '-12%', right: '-10%',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(210,160,30,0.14) 0%, rgba(180,130,20,0.06) 40%, transparent 65%)',
          borderRadius: '50%', zIndex: 0,
        }} />
        {/* سماء هادئة — أعلى */}
        <div className="fixed pointer-events-none" style={{
          top: 0, left: 0, right: 0, height: '45vh',
          background: 'linear-gradient(180deg, rgba(100,150,195,0.12) 0%, transparent 100%)',
          zIndex: 0,
        }} />
        {/* غيمة 1 — رمادية هادئة */}
        <div className="fixed pointer-events-none" style={{
          top: '8%', left: '-5%',
          width: '55vw', height: '22vw',
          background: 'radial-gradient(ellipse, rgba(195,205,215,0.50) 0%, transparent 70%)',
          borderRadius: '50%', zIndex: 0, filter: 'blur(28px)',
        }} />
        {/* غيمة 2 */}
        <div className="fixed pointer-events-none" style={{
          top: '5%', right: '6%',
          width: '38vw', height: '16vw',
          background: 'radial-gradient(ellipse, rgba(190,200,210,0.40) 0%, transparent 70%)',
          borderRadius: '50%', zIndex: 0, filter: 'blur(20px)',
        }} />
      </>
    )
  }

  return (
    <>
      <div ref={containerRef} className="stars-container" />
      <div className="fixed pointer-events-none" style={{
        top: '-8%', left: '-8%',
        width: '45vw', height: '45vw',
        background: 'radial-gradient(circle, rgba(151,227,37,0.07) 0%, transparent 65%)',
        borderRadius: '50%', zIndex: 0,
      }} />
      <div className="fixed pointer-events-none" style={{
        bottom: '5%', right: '-10%',
        width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(255,95,31,0.06) 0%, transparent 65%)',
        borderRadius: '50%', zIndex: 0,
      }} />
      <div className="fixed pointer-events-none" style={{
        top: '40%', left: '30%',
        width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 65%)',
        borderRadius: '50%', zIndex: 0,
      }} />
    </>
  )
}
