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
  /* '/reset-password' must be public, and its absence is the whole bug users
     reported: the recovery link arrives, but the session it carries lives in
     the URL — the SERVER sees no cookie yet, so this guard bounced the page
     before it could render. The client then consumed the link anyway and the
     user landed inside the app already signed in, never once shown the "new
     password" form. The email was never the problem. */
  const publicPaths = ['/login', '/register', '/auth/callback', '/onboarding', '/privacy', '/terms', '/owner', '/api/keepalive', '/reset-password']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  /* SAFETY NET — rescue an auth code that landed on the wrong page.
   *
   * Supabase only honours a redirectTo that is on its allow-list; anything
   * else is silently replaced with the project's Site URL. So a recovery link
   * can arrive at "/" carrying ?code=, where the guard below sees no session,
   * bounces to /login, and DROPS THE CODE — the user is asked for the password
   * they just told us they forgot. This forwards the code to the callback that
   * knows how to spend it, wherever it happens to land, so the flow no longer
   * depends on a dashboard setting being right. */
  const code = request.nextUrl.searchParams.get('code')
  if (code && !pathname.startsWith('/auth/callback')) {
    const cb = new URL('/auth/callback', request.url)
    cb.searchParams.set('code', code)
    /* Hand the callback the page the link was AIMED at, not a guess.
       If Supabase honoured our redirectTo, that page is already /reset-password
       and the user lands on the form with a live session. If Supabase replaced
       it with the Site URL, this is "/" — and the recovery flag saved in the
       browser takes it from there. Both routes end in the same place, so the
       flow no longer depends on a dashboard allow-list being correct. */
    cb.searchParams.set('next', pathname)
    return NextResponse.redirect(cb)
  }

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
