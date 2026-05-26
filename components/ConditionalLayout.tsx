'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const NO_NAV = ['/login', '/register', '/onboarding', '/auth', '/reset-password']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = NO_NAV.some(p => pathname.startsWith(p))

  return (
    <>
      <main
        className="relative z-10 max-w-lg mx-auto min-h-screen"
        style={{ paddingBottom: hideNav ? 0 : '124px' }}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </>
  )
}
