import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  // الشروط والخصوصية عامتان — مطلب Apple 3.1.2: روابط فعّالة بلا تسجيل دخول
  /* '/owner' carries its own gate (a derived secret key, constant-time
     compared, wrong → 404). Session auth must not intercept it: the owner
     opens this link from any browser, logged in as nobody — and /terms
     missing from this exact list is what got the app rejected once. */
  /* '/api/keepalive' must be here or the heartbeat never reaches the
     database: the proxy 307s it to /login, the cron "succeeds" against the
     login page, and the freeze it exists to prevent happens anyway — with a
     green cron log saying everything is fine. Verified live before this line
     existed: the route answered "Redirecting..." twenty times in a row. */
  const publicPaths = ['/login', '/register', '/auth/callback', '/onboarding', '/privacy', '/terms', '/owner', '/api/keepalive', '/api/rs-check']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
