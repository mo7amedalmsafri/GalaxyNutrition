'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UtensilsCrossed, Dumbbell, Camera, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE } from '@/lib/store'

const NAV_ITEMS = [
  { href: '/',        icon: Home,            ar: 'الرئيسية', en: 'Home'    },
  { href: '/log',     icon: UtensilsCrossed, ar: 'وجباتي',   en: 'Meals'   },
  { href: '/scan',    icon: Camera,          ar: 'تصوير',    en: 'Scan',  isCenter: true },
  { href: '/workout', icon: Dumbbell,        ar: 'رياضة',    en: 'Workout' },
  { href: '/plans',   icon: Sparkles,        ar: 'خطتي',     en: 'My Plan' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const isLight = (profile.theme ?? 'dark') === 'light'
  const isEn    = (profile.language ?? 'ar') === 'en'

  const inactiveColor = isLight ? 'rgba(30,30,50,0.38)'  : 'rgba(255,255,255,0.40)'
  const inactiveLabel = isLight ? 'rgba(30,30,50,0.42)'  : 'rgba(255,255,255,0.35)'
  const centerLabel   = isLight ? 'rgba(30,30,50,0.42)'  : 'rgba(255,255,255,0.45)'

  return (
    <nav className="nav-bar fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="flex items-center justify-around px-1 h-20">
        {NAV_ITEMS.map(({ href, icon: Icon, ar, en, isCenter }) => {
          const isActive = pathname === href
          const label    = isEn ? en : ar

          if (isCenter) {
            return (
              <Link key={href} href={href} className="flex flex-col items-center -mt-7 flex-1">
                <div
                  className="fab-button flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #97E325, #FF5F1F)',
                    width: 52, height: 52, borderRadius: '50%',
                    boxShadow: '0 4px 24px rgba(151,227,37,0.5), 0 0 0 3px rgba(151,227,37,0.12)',
                  }}
                >
                  <Icon size={22} color="#09090D" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] mt-1.5 font-semibold"
                  style={{ color: isActive ? '#97E325' : centerLabel }}>
                  {label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 relative group"
            >
              {isActive && (
                <div className="absolute top-0 w-6 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #97E325, #00D4FF)' }} />
              )}
              <div className={clsx(
                'p-1.5 rounded-xl transition-all duration-300',
                isActive ? 'bg-[rgba(151,227,37,0.1)]' : 'group-hover:bg-white/5'
              )}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{
                    color:  isActive ? '#97E325' : inactiveColor,
                    filter: isActive ? 'drop-shadow(0 0 5px rgba(151,227,37,0.8))' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>
              <span className="text-[10px] font-medium transition-all duration-300"
                style={{ color: isActive ? '#97E325' : inactiveLabel }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
