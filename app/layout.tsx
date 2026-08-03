import type { Metadata, Viewport } from 'next'
import './globals.css'
import GalaxyBackground from '@/components/GalaxyBackground'
import ConditionalLayout from '@/components/ConditionalLayout'
import ThemeProvider from '@/components/ThemeProvider'
import RecoveryCatcher from '@/components/RecoveryCatcher'

export const metadata: Metadata = {
  title: 'Dietak | دايتك',
  description: 'دايتك — تطبيق ذكي لتتبع التغذية وإدارة الوزن بتقنية الذكاء الاصطناعي',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dietak',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0014',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="page-wrapper">
        <GalaxyBackground />
        <RecoveryCatcher />
        <ThemeProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
