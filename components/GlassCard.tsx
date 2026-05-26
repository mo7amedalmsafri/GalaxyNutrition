import { ReactNode } from 'react'
import clsx from 'clsx'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glow?: 'purple' | 'pink' | 'gold' | 'cyan' | 'none'
  onClick?: () => void
  animate?: boolean
}

export default function GlassCard({
  children,
  className,
  glow = 'none',
  onClick,
  animate = true,
}: GlassCardProps) {
  const glowStyles = {
    purple: 'shadow-[0_0_30px_rgba(151,227,37,0.28)]  border-[rgba(151,227,37,0.18)]',
    pink:   'shadow-[0_0_30px_rgba(255,95,31,0.28)]   border-[rgba(255,95,31,0.18)]',
    gold:   'shadow-[0_0_25px_rgba(245,158,11,0.32)]  border-[rgba(245,158,11,0.18)]',
    cyan:   'shadow-[0_0_25px_rgba(0,212,255,0.28)]   border-[rgba(0,212,255,0.18)]',
    none:   'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass-card',
        glowStyles[glow],
        animate && 'animate-slide-up',
        onClick && 'cursor-pointer hover:scale-[1.02] transition-transform duration-300',
        className
      )}
    >
      {children}
    </div>
  )
}
